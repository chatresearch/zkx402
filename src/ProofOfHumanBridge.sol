// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { SelfVerificationRoot } from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import { ISelfVerificationRoot } from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import { SelfStructs } from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import { IIdentityVerificationHubV2 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";
import { IMailbox } from "@hyperlane/contracts/interfaces/IMailbox.sol";

/**
 * @title ProofOfHumanBridge
 * @notice Self verification contract that bridges results to Base via Hyperlane
 * @dev Extends ProofOfHuman to send verification status cross-chain
 */
contract ProofOfHumanBridge is SelfVerificationRoot {
    // Verification result storage
    ISelfVerificationRoot.GenericDiscloseOutputV2 public lastOutput;
    bool public verificationSuccessful;
    bytes public lastUserData;
    address public lastUserAddress;

    // Verification config storage
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    // Hyperlane components
    IMailbox public immutable hyperlaneMailbox;
    uint32 public immutable destinationDomain; // Base Sepolia domain
    address public immutable destinationRegistry; // VerificationRegistry on Base

    // Events
    event VerificationCompleted(
        address indexed user,
        uint256 timestamp,
        bytes32 hyperlaneMessageId,
        string nationality
    );
    event MessageDispatched(bytes32 indexed messageId, address indexed user);

    /**
     * @notice Constructor
     * @param identityVerificationHubV2Address Self Protocol hub address
     * @param scopeSeed Scope seed for this contract
     * @param _verificationConfig Verification requirements (age, countries, etc)
     * @param _hyperlaneMailbox Hyperlane mailbox address on Celo
     * @param _destinationDomain Hyperlane domain ID for Base Sepolia
     * @param _destinationRegistry VerificationRegistry address on Base
     */
    constructor(
        address identityVerificationHubV2Address,
        string memory scopeSeed,
        SelfUtils.UnformattedVerificationConfigV2 memory _verificationConfig,
        address _hyperlaneMailbox,
        uint32 _destinationDomain,
        address _destinationRegistry
    ) SelfVerificationRoot(identityVerificationHubV2Address, scopeSeed) {
        verificationConfig = SelfUtils.formatVerificationConfigV2(_verificationConfig);
        verificationConfigId = IIdentityVerificationHubV2(identityVerificationHubV2Address)
            .setVerificationConfigV2(verificationConfig);

        hyperlaneMailbox = IMailbox(_hyperlaneMailbox);
        destinationDomain = _destinationDomain;
        destinationRegistry = _destinationRegistry;
    }

    /**
     * @notice Custom verification hook - called when Self verification succeeds
     * @param output Verification output from Self Protocol
     * @param userData User-defined data from frontend
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        // Extract user address from userIdentifier
        address user = address(uint160(output.userIdentifier));

        // Store verification locally
        verificationSuccessful = true;
        lastOutput = output;
        lastUserData = userData;
        lastUserAddress = user;

        // Bridge to Base via Hyperlane
        bytes32 messageId = bridgeToBase(user, output.nationality);

        emit VerificationCompleted(user, block.timestamp, messageId, output.nationality);
    }

    /**
     * @notice Bridge verification to Base via Hyperlane
     * @param user Address of verified user
     * @param nationality User's nationality from passport
     * @return messageId Hyperlane message ID
     */
    function bridgeToBase(address user, string memory nationality)
        internal
        returns (bytes32 messageId)
    {
        // Encode the message: (address user, uint256 timestamp, string nationality)
        bytes memory message = abi.encode(user, block.timestamp, nationality);

        // Dispatch via Hyperlane (no payment hook, uses default ISM)
        messageId = hyperlaneMailbox.dispatch(
            destinationDomain,
            addressToBytes32(destinationRegistry),
            message
        );

        emit MessageDispatched(messageId, user);
    }

    /**
     * @notice Implementation of getConfigId from SelfVerificationRoot
     * @return The verification configuration ID
     */
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Helper to convert address to bytes32 for Hyperlane
     */
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /**
     * @notice Helper to convert bytes32 to address
     */
    function bytes32ToAddress(bytes32 _buf) internal pure returns (address) {
        return address(uint160(uint256(_buf)));
    }

    /**
     * @notice Get nationality for a verified user
     */
    function getNationality(address user) external view returns (string memory) {
        require(user == lastUserAddress, "User not verified");
        return lastOutput.nationality;
    }
}
