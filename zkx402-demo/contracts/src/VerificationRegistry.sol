// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IMailbox } from "@hyperlane/contracts/interfaces/IMailbox.sol";

/**
 * @title VerificationRegistry
 * @notice Stores verification status on Base - receives messages from Celo via Hyperlane
 * @dev This is the "destination" contract that handles incoming verification messages
 * 
 * HOW IT WORKS:
 * 1. ProofOfHumanBridge (Celo) calls mailbox.dispatch() with verification data
 * 2. Hyperlane validators sign the message
 * 3. Hyperlane relayer delivers message to Base mailbox
 * 4. Base mailbox calls this contract's handle() function
 * 5. We verify the message came from our trusted Celo contract
 * 6. We store the verification status
 */
contract VerificationRegistry {
    // Hyperlane mailbox on Base Sepolia
    IMailbox public immutable hyperlaneMailbox;
    
    // Celo Sepolia domain ID (where messages come from)
    uint32 public immutable sourceDomain;
    
    // ProofOfHumanBridge contract address on Celo (only this can send us messages)
    address public sourceContract;
    
    // Owner (for updating sourceContract if needed)
    address public owner;
    
    // Verification storage
    struct Verification {
        bool verified;
        uint256 timestamp;
        string nationality;
    }
    
    mapping(address => Verification) public verifications;
    
    // Events
    event VerificationReceived(
        address indexed user,
        uint256 timestamp,
        string nationality
    );
    event SourceContractUpdated(address indexed oldSource, address indexed newSource);
    
    // Modifiers
    modifier onlyMailbox() {
        require(msg.sender == address(hyperlaneMailbox), "Only Hyperlane mailbox");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @notice Constructor
     * @param _hyperlaneMailbox Base Sepolia Hyperlane mailbox address
     * @param _sourceDomain Celo Sepolia domain ID (44787)
     * @param _sourceContract ProofOfHumanBridge address on Celo (can be updated later)
     */
    constructor(
        address _hyperlaneMailbox,
        uint32 _sourceDomain,
        address _sourceContract
    ) {
        hyperlaneMailbox = IMailbox(_hyperlaneMailbox);
        sourceDomain = _sourceDomain;
        sourceContract = _sourceContract;
        owner = msg.sender;
    }
    
    /**
     * @notice Hyperlane message handler - called when message arrives from Celo
     * @dev This is the KEY FUNCTION that Hyperlane calls
     * 
     * FLOW:
     * 1. Hyperlane relayer calls this via Base mailbox
     * 2. We verify message origin (must be from our Celo contract)
     * 3. We decode the message data
     * 4. We store the verification
     * 
     * @param _origin Source chain domain (must be Celo Sepolia = 44787)
     * @param _sender Source contract address (must be our ProofOfHumanBridge)
     * @param _message Encoded data: (address user, uint256 timestamp, string nationality)
     */
    function handle(
        uint32 _origin,
        bytes32 _sender,
        bytes calldata _message
    ) external onlyMailbox {
        // SECURITY: Only accept messages from our Celo contract
        require(_origin == sourceDomain, "Wrong source chain");
        require(bytes32ToAddress(_sender) == sourceContract, "Wrong source contract");
        
        // Decode the message
        (address user, uint256 timestamp, string memory nationality) = 
            abi.decode(_message, (address, uint256, string));
        
        // Store verification
        verifications[user] = Verification({
            verified: true,
            timestamp: timestamp,
            nationality: nationality
        });
        
        emit VerificationReceived(user, timestamp, nationality);
    }
    
    /**
     * @notice Check if a wallet is verified
     * @param user Wallet address to check
     * @return True if verified as human via Self Protocol
     */
    function isVerified(address user) external view returns (bool) {
        return verifications[user].verified;
    }
    
    /**
     * @notice Get full verification details
     * @param user Wallet address to check
     * @return verified Whether verified
     * @return timestamp When verified
     * @return nationality User's nationality from passport
     */
    function getVerification(address user) 
        external 
        view 
        returns (bool verified, uint256 timestamp, string memory nationality) 
    {
        Verification memory v = verifications[user];
        return (v.verified, v.timestamp, v.nationality);
    }
    
    /**
     * @notice Update source contract address (in case Celo contract is redeployed)
     * @param newSource New ProofOfHumanBridge address on Celo
     */
    function updateSourceContract(address newSource) external onlyOwner {
        require(newSource != address(0), "Invalid address");
        address oldSource = sourceContract;
        sourceContract = newSource;
        emit SourceContractUpdated(oldSource, newSource);
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @notice Helper to convert bytes32 to address (Hyperlane format)
     */
    function bytes32ToAddress(bytes32 _buf) internal pure returns (address) {
        return address(uint160(uint256(_buf)));
    }
}
