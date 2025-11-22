// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../src/VerificationRegistry.sol";

/**
 * @title DeployBase
 * @notice Deployment script for VerificationRegistry on Base Sepolia
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Reads configuration from .env file
 * 2. Deploys VerificationRegistry contract on Base Sepolia
 * 3. Configures it to receive messages from Celo via Hyperlane
 * 4. Prints deployment address
 * 
 * IMPORTANT: Deploy this FIRST, before deploying to Celo!
 * The Celo contract needs to know this contract's address.
 * 
 * TO RUN:
 * forge script script/DeployBase.s.sol:DeployBase --rpc-url base-sepolia --broadcast --verify
 */
contract DeployBase is Script {
    function run() external {
        // Read environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address hyperlaneMailbox = vm.envAddress("BASE_HYPERLANE_MAILBOX");
        uint32 celoDomain = uint32(vm.envUint("CELO_CHAIN_DOMAIN"));
        
        // Note: sourceContract will be set to 0x0 initially, then updated after Celo deployment
        // Or you can deploy Celo first (chicken-egg problem), get its address, 
        // and set CELO_PROOF_OF_HUMAN_BRIDGE before running this
        address sourceContract = vm.envOr("CELO_PROOF_OF_HUMAN_BRIDGE", address(0));
        
        // For initial deployment, we'll use a placeholder and update it later
        if (sourceContract == address(0)) {
            console.log("WARNING: CELO_PROOF_OF_HUMAN_BRIDGE not set!");
            console.log("Using placeholder address. You MUST call updateSourceContract() after deploying Celo contract.");
            sourceContract = address(0xdead);  // Placeholder
        }
        
        console.log("\n=== Deploying VerificationRegistry on Base Sepolia ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Hyperlane Mailbox:", hyperlaneMailbox);
        console.log("Celo Domain:", celoDomain);
        console.log("Source Contract (Celo):", sourceContract);
        
        // Deploy contract
        vm.startBroadcast(deployerPrivateKey);
        
        VerificationRegistry registry = new VerificationRegistry(
            hyperlaneMailbox,
            celoDomain,
            sourceContract
        );
        
        vm.stopBroadcast();
        
        // Print deployment info
        console.log("\n=== Deployment Successful! ===");
        console.log("VerificationRegistry deployed at:", address(registry));
        console.log("\n=== Next Steps ===");
        console.log("1. Copy the contract address above");
        console.log("2. Add to your .env file:");
        console.log("   BASE_VERIFICATION_REGISTRY=%s", address(registry));
        console.log("3. NOW deploy the Celo contract with this address");
        console.log("4. If you used placeholder (0xdead), update source contract:");
        console.log("   cast send %s 'updateSourceContract(address)' <CELO_CONTRACT_ADDRESS> --rpc-url base-sepolia --private-key $PRIVATE_KEY", address(registry));
        console.log("\nVerify command:");
        console.log("forge verify-contract %s src/VerificationRegistry.sol:VerificationRegistry --chain base-sepolia", address(registry));
    }
}

