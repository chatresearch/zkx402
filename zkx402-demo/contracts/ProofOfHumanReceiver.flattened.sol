// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// src/IMailboxV3.sol

/**
 * @title IMailboxV3
 * @notice Hyperlane V3 Mailbox interface with payable dispatch for hook fees
 * @dev The actual mailbox dispatch is payable to forward value to hooks
 */
interface IMailboxV3 {
    function dispatch(
        uint32 destinationDomain,
        bytes32 recipientAddress,
        bytes calldata messageBody
    ) external payable returns (bytes32 messageId);

    function delivered(bytes32 messageId) external view returns (bool);

    function localDomain() external view returns (uint32);
}

// src/ProofOfHumanReceiver.sol

/**
 * @title ProofOfHumanReceiver  
 * @notice Official Self + Hyperlane receiver - stores verification on Base
 * @dev Receives messages from ProofOfHumanSender via Hyperlane
 */
contract ProofOfHumanReceiver {
    // Hyperlane
    uint32 public immutable SOURCE_DOMAIN;
    IMailboxV3 public immutable MAILBOX;

    // Verification storage
    struct VerificationData {
        bytes32 userIdentifier;
        address userAddress;
        bytes userData;
        uint256 verifiedAt;
        uint256 receivedAt;
        bool isVerified;
    }

    mapping(address => VerificationData) public verifications;
    mapping(bytes32 => address) public userIdentifierToAddress;
    uint256 public verificationCount;

    // Trusted senders
    mapping(bytes32 => bool) public trustedSenders;
    bool public enforceTrustedSenders;
    address public owner;

    // Events
    event VerificationReceived(address indexed userAddress, bytes32 indexed userIdentifier, uint256 receivedAt);
    event TrustedSenderAdded(bytes32 indexed sender);

    error NotMailbox();
    error InvalidOrigin(uint32 received, uint32 expected);
    error UntrustedSender(bytes32 sender);
    error ZeroAddressMailbox();

    constructor(address _mailbox, uint32 _sourceDomain) {
        if (_mailbox == address(0)) revert ZeroAddressMailbox();
        MAILBOX = IMailboxV3(_mailbox);
        SOURCE_DOMAIN = _sourceDomain;
        owner = msg.sender;
        enforceTrustedSenders = false; // Start permissionless
    }

    /**
     * @notice Handle incoming messages from Hyperlane
     * @dev Called by Hyperlane mailbox when message arrives
     */
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external {
        // Only mailbox can call
        if (msg.sender != address(MAILBOX)) revert NotMailbox();

        // Verify origin chain
        if (_origin != SOURCE_DOMAIN) {
            revert InvalidOrigin(_origin, SOURCE_DOMAIN);
        }

        // Optional: Check trusted sender
        if (enforceTrustedSenders && !trustedSenders[_sender]) {
            revert UntrustedSender(_sender);
        }

        // Decode verification data
        (
            bytes32 userIdentifier,
            address userAddress,
            bytes memory userData,
            uint256 verifiedAt
        ) = abi.decode(_message, (bytes32, address, bytes, uint256));

        // Store verification
        verifications[userAddress] = VerificationData({
            userIdentifier: userIdentifier,
            userAddress: userAddress,
            userData: userData,
            verifiedAt: verifiedAt,
            receivedAt: block.timestamp,
            isVerified: true
        });

        userIdentifierToAddress[userIdentifier] = userAddress;
        verificationCount++;

        emit VerificationReceived(userAddress, userIdentifier, block.timestamp);
    }

    // View functions
    function isVerified(address userAddress) external view returns (bool) {
        return verifications[userAddress].isVerified;
    }

    function getVerification(address userAddress) external view returns (VerificationData memory) {
        return verifications[userAddress];
    }

    // Owner functions
    function addTrustedSender(address sender) external {
        require(msg.sender == owner, "Only owner");
        bytes32 senderBytes32 = addressToBytes32(sender);
        trustedSenders[senderBytes32] = true;
        emit TrustedSenderAdded(senderBytes32);
    }

    function setTrustedSenderEnforcement(bool enabled) external {
        require(msg.sender == owner, "Only owner");
        enforceTrustedSenders = enabled;
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}

