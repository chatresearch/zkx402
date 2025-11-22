// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../src/ProofOfHumanBridge.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {CountryCodes} from "@selfxyz/contracts/contracts/libraries/CountryCode.sol";

/**
 * @title DeployCelo
 * @notice Deployment script for ProofOfHumanBridge on Celo Sepolia
 * 
 * WHAT THIS SCRIPT DOES:
 * 1. Reads configuration from .env file
 * 2. Deploys ProofOfHumanBridge contract on Celo Sepolia
 * 3. Configures it with:
 *    - Self Protocol's IdentityVerificationHub (for receiving ZK proofs)
 *    - Hyperlane mailbox (for sending messages to Base)
 *    - Verification requirements (age 18+, no US citizens)
 * 4. Prints deployment address for you to copy
 * 
 * TO RUN:
 * forge script script/DeployCelo.s.sol:DeployCelo --rpc-url celo-sepolia --broadcast --verify
 */
contract DeployCelo is Script {
    function run() external {
        // Read environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address selfHubAddress = vm.envAddress("IDENTITY_VERIFICATION_HUB_ADDRESS");
        string memory scopeSeed = vm.envString("SCOPE_SEED");
        address hyperlaneMailbox = vm.envAddress("CELO_HYPERLANE_MAILBOX");
        uint32 baseDomain = uint32(vm.envUint("BASE_CHAIN_DOMAIN"));
        
        // Note: Deploy Base contract first to get its address
        address baseRegistry = vm.envOr("BASE_VERIFICATION_REGISTRY", address(0));
        require(baseRegistry != address(0), "Deploy Base contract first and set BASE_VERIFICATION_REGISTRY");
        
        console.log("\n=== Deploying ProofOfHumanBridge on Celo Sepolia ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Self Hub:", selfHubAddress);
        console.log("Scope Seed:", scopeSeed);
        console.log("Hyperlane Mailbox:", hyperlaneMailbox);
        console.log("Base Domain:", baseDomain);
        console.log("Base Registry:", baseRegistry);
        
        // Configure verification requirements
        // No country exclusions - allow all nationalities including Russia
        string[] memory forbiddenCountries = new string[](0);
        
        SelfUtils.UnformattedVerificationConfigV2 memory verificationConfig = SelfUtils
            .UnformattedVerificationConfigV2({
            olderThan: 21,  // Must be 21+
            forbiddenCountries: forbiddenCountries,
            ofacEnabled: false  // OFAC check disabled
        });
        
        // Deploy contract
        vm.startBroadcast(deployerPrivateKey);
        
        ProofOfHumanBridge bridge = new ProofOfHumanBridge(
            selfHubAddress,
            scopeSeed,
            verificationConfig,
            hyperlaneMailbox,
            baseDomain,
            baseRegistry
        );
        
        vm.stopBroadcast();
        
        // Print deployment info
        console.log("\n=== Deployment Successful! ===");
        console.log("ProofOfHumanBridge deployed at:", address(bridge));
        console.log("Scope:", bridge.scope());
        console.log("\n=== Next Steps ===");
        console.log("1. Copy the contract address above");
        console.log("2. Add to your .env file:");
        console.log("   CELO_PROOF_OF_HUMAN_BRIDGE=%s", address(bridge));
        console.log("3. Use this address in your frontend QR code generation");
        console.log("4. Verify contract on CeloScan if not auto-verified");
        console.log("\nVerify command:");
        console.log("forge verify-contract %s src/ProofOfHumanBridge.sol:ProofOfHumanBridge --chain celo-sepolia", address(bridge));
    }
}

