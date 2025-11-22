// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IMailbox} from "@hyperlane/contracts/interfaces/IMailbox.sol";

/**
 * @title VerificationRegistry
 * @notice Stores verification status for CDP wallets on Base Sepolia
 * @dev This contract runs on Base Sepolia and receives messages from Celo via Hyperlane
 * 
 * WHAT THIS DOES:
 * 1. Receives Hyperlane messages from ProofOfHumanBridge (on Celo)
 * 2. Stores which CDP wallet addresses are verified humans
 * 3. Provides public view functions for anyone to check verification status
 * 4. Your x402-demo app queries this to see if a wallet is verified
 */
contract VerificationRegistry {
    // Hyperlane mailbox on Base
    IMailbox public hyperlaneMailbox;
    
    // Source chain (Celo Sepolia)
    uint32 public sourceDomain;
    
    // Address of ProofOfHumanBridge on Celo
    address public sourceContract;
    
    // Owner can update configurations
    address public owner;
    
    // Verification data
    mapping(address => Verification) public verifications;
    
    struct Verification {
        bool verified;
        uint256 timestamp;
        bytes32 hyperlaneMessageId;
        bool isFromRussia;     // Are they from Russia?
        string nationality;    // Their nationality (e.g., "RUS", "USA")
    }
    
    // Events
    event VerificationReceived(
        address indexed user,
        uint256 timestamp,
        bytes32 messageId,
        bool isFromRussia,
        string nationality
    );
    
    event SourceContractUpdated(address indexed newSource);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Modifiers
    modifier onlyMailbox() {
        require(msg.sender == address(hyperlaneMailbox), "Only mailbox can call");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    /**
     * @notice Constructor
     * @param _hyperlaneMailbox Hyperlane mailbox address on Base
     * @param _sourceDomain Celo Sepolia domain ID
     * @param _sourceContract ProofOfHumanBridge address on Celo
     */
    constructor(
        address _hyperlaneMailbox,
        uint32 _sourceDomain,
        address _sourceContract
    ) {
        require(_hyperlaneMailbox != address(0), "Invalid mailbox");
        require(_sourceContract != address(0), "Invalid source");
        
        hyperlaneMailbox = IMailbox(_hyperlaneMailbox);
        sourceDomain = _sourceDomain;
        sourceContract = _sourceContract;
        owner = msg.sender;
    }

    /**
     * @notice Hyperlane message handler - receives verifications from Celo
     * @dev Called by Hyperlane mailbox when a message arrives from Celo
     * @param _origin Source chain domain (must be Celo Sepolia)
     * @param _sender Source contract (must be ProofOfHumanBridge)
     * @param _message Encoded message containing user address and timestamp
     */
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external onlyMailbox {
        // Verify message is from our trusted Celo contract
        require(_origin == sourceDomain, "Wrong source chain");
        require(bytes32ToAddress(_sender) == sourceContract, "Wrong source contract");
        
        // Decode message with all verification details
        (
            address user, 
            uint256 timestamp, 
            bool isFromRussia,
            string memory nationality
        ) = abi.decode(_message, (address, uint256, bool, string));
        
        // Store verification
        verifications[user] = Verification({
            verified: true,
            timestamp: timestamp,
            hyperlaneMessageId: bytes32(0),  // Could be filled by Hyperlane hook
            isFromRussia: isFromRussia,
            nationality: nationality
        });
        
        emit VerificationReceived(user, timestamp, bytes32(0), isFromRussia, nationality);
    }

    /**
     * @notice Check if a CDP wallet is verified
     * @param user CDP wallet address to check
     * @return Whether the wallet has been verified via Self Protocol
     * 
     * EXAMPLE USAGE IN YOUR APP:
     * ```javascript
     * const registry = new ethers.Contract(registryAddress, registryABI, provider);
     * const isVerified = await registry.isVerified(userWalletAddress);
     * if (isVerified) {
     *   // User is verified human!
     * }
     * ```
     */
    function isVerified(address user) external view returns (bool) {
        return verifications[user].verified;
    }

    /**
     * @notice Get full verification details
     * @param user CDP wallet address
     * @return verified Whether verified
     * @return timestamp When verified on Celo
     * @return messageId Hyperlane message ID (if available)
     * @return isFromRussia Whether they're from Russia
     * @return nationality Their nationality code
     */
    function getVerificationDetails(address user) 
        external 
        view 
        returns (
            bool verified, 
            uint256 timestamp, 
            bytes32 messageId,
            bool isFromRussia,
            string memory nationality
        ) 
    {
        Verification memory v = verifications[user];
        return (
            v.verified, 
            v.timestamp, 
            v.hyperlaneMessageId,
            v.isFromRussia,
            v.nationality
        );
    }

    /**
     * @notice Get verification timestamp
     * @param user CDP wallet address
     * @return Unix timestamp of when verification occurred (0 if not verified)
     */
    function getVerificationTimestamp(address user) external view returns (uint256) {
        return verifications[user].timestamp;
    }

    /**
     * @notice Check if user is from Russia
     * @param user CDP wallet address
     * @return Whether their nationality is Russian
     */
    function isFromRussia(address user) external view returns (bool) {
        return verifications[user].isFromRussia;
    }

    /**
     * @notice Get user's nationality
     * @param user CDP wallet address
     * @return Nationality code (e.g., "RUS", "USA", "GBR")
     */
    function getNationality(address user) external view returns (string memory) {
        return verifications[user].nationality;
    }

    /**
     * @notice Batch check multiple addresses
     * @param users Array of CDP wallet addresses to check
     * @return Array of booleans indicating verification status
     * 
     * USEFUL FOR:
     * - Checking multiple users at once
     * - Leaderboards showing verified users
     * - Bulk verification queries
     */
    function batchIsVerified(address[] calldata users) external view returns (bool[] memory) {
        bool[] memory results = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            results[i] = verifications[users[i]].verified;
        }
        return results;
    }

    /**
     * @notice Update the source contract address on Celo
     * @param newSource New ProofOfHumanBridge address
     * @dev Only owner can call - useful if you redeploy Celo contract
     */
    function updateSourceContract(address newSource) external onlyOwner {
        require(newSource != address(0), "Invalid address");
        sourceContract = newSource;
        emit SourceContractUpdated(newSource);
    }

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @notice Convert bytes32 to address
     * @param _buf Bytes32 to convert
     * @return Address representation
     */
    function bytes32ToAddress(bytes32 _buf) internal pure returns (address) {
        return address(uint160(uint256(_buf)));
    }
}

