// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { SelfVerificationRoot } from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import { ISelfVerificationRoot } from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import { SelfStructs } from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import { IIdentityVerificationHubV2 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import { IMailboxV3 } from "./IMailboxV3.sol";

/**
 * @title ProofOfHumanSender
 * @notice Official Self + Hyperlane integration - sends verification cross-chain
 * @dev KEY: Hyperlane dispatch happens AFTER verification, not during the hook
 */
contract ProofOfHumanSender is SelfVerificationRoot {
    // Hyperlane
    IMailboxV3 public immutable MAILBOX;
    uint32 public immutable DESTINATION_DOMAIN;
    address public defaultRecipient;

    // Verification storage
    ISelfVerificationRoot.GenericDiscloseOutputV2 public lastOutput;
    bool public verificationSuccessful;
    bytes public lastUserData;
    address public lastUserAddress;

    // Config storage
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    // Events
    event VerificationCompleted(ISelfVerificationRoot.GenericDiscloseOutputV2 output, bytes userData);
    event VerificationSentCrossChain(bytes32 indexed messageId, address indexed recipient, address indexed userAddress);

    error ZeroAddressMailbox();
    error ZeroAddressRecipient();
    error InsufficientGasPayment();

    constructor(
        address identityVerificationHubV2Address,
        string memory scopeSeed,
        SelfUtils.UnformattedVerificationConfigV2 memory _verificationConfig,
        address _mailbox,
        uint32 _destinationDomain,
        address _defaultRecipient
    ) SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed) {
        if (_mailbox == address(0)) revert ZeroAddressMailbox();
        if (_defaultRecipient == address(0)) revert ZeroAddressRecipient();

        verificationConfig = SelfUtils.formatVerificationConfigV2(_verificationConfig);
        verificationConfigId = IIdentityVerificationHubV2(identityVerificationHubV2Address)
            .setVerificationConfigV2(verificationConfig);

        MAILBOX = IMailboxV3(_mailbox);
        DESTINATION_DOMAIN = _destinationDomain;
        defaultRecipient = _defaultRecipient;
    }

    /**
     * @notice Hook called when Self verification succeeds
     * @dev Automatically bridges if contract has ETH (sent via payable verification)
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        verificationSuccessful = true;
        lastOutput = output;
        lastUserData = userData;
        lastUserAddress = address(uint160(output.userIdentifier));

        emit VerificationCompleted(output, userData);
        
        // Automatically bridge if contract has ETH balance
        if (address(this).balance > 0) {
            bytes memory message = abi.encode(
                bytes32(output.userIdentifier),
                lastUserAddress,
                userData,
                block.timestamp
            );
            
            bytes32 recipientBytes32 = addressToBytes32(defaultRecipient);
            
            bytes32 messageId = MAILBOX.dispatch{value: address(this).balance}(
                DESTINATION_DOMAIN,
                recipientBytes32,
                message
            );
            
            emit VerificationSentCrossChain(messageId, defaultRecipient, lastUserAddress);
        }
    }

    /**
     * @notice Send verification to destination chain via Hyperlane
     * @dev Call this AFTER verification completes - requires ETH payment for gas
     */
    function sendVerificationCrossChain(address recipient)
        external
        payable
        returns (bytes32 messageId)
    {
        if (recipient == address(0)) revert ZeroAddressRecipient();
        if (!verificationSuccessful) revert("No verification to send");
        if (msg.value == 0) revert InsufficientGasPayment();

        // Encode verification data
        bytes memory message = abi.encode(
            bytes32(lastOutput.userIdentifier),
            lastUserAddress,
            lastUserData,
            block.timestamp
        );

        // Dispatch with payment
        messageId = MAILBOX.dispatch{value: msg.value}(
            DESTINATION_DOMAIN,
            addressToBytes32(recipient),
            message
        );

        emit VerificationSentCrossChain(messageId, recipient, lastUserAddress);
    }

    /**
     * @notice Helper: address to bytes32
     */
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }
    
    /**
     * @notice Allow contract to receive ETH for Hyperlane bridging
     */
    receive() external payable {}
}

