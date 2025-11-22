// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ProofOfHumanSender } from "../src/ProofOfHumanSender.sol";
import { BaseScript } from "./Base.s.sol";
import { console } from "forge-std/console.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";

contract DeploySender is BaseScript {
    function run() public broadcast returns (ProofOfHumanSender sender) {
        address hubAddress = vm.envAddress("IDENTITY_VERIFICATION_HUB_ADDRESS");
        string memory scopeSeed = vm.envString("SCOPE_SEED");
        address hyperlaneMailbox = vm.envAddress("CELO_HYPERLANE_MAILBOX");
        uint32 baseDomain = uint32(vm.envUint("BASE_CHAIN_DOMAIN"));
        address baseReceiver = vm.envAddress("BASE_PROOF_OF_HUMAN_RECEIVER");

        console.log("=== Deploying ProofOfHumanSender (Celo) ===");
        console.log("Hub:", hubAddress);
        console.log("Mailbox:", hyperlaneMailbox);
        console.log("Destination:", baseReceiver);

        // Config
        string[] memory forbiddenCountries = new string[](0);
        SelfUtils.UnformattedVerificationConfigV2 memory config = SelfUtils
            .UnformattedVerificationConfigV2({
            olderThan: 21,
            forbiddenCountries: forbiddenCountries,
            ofacEnabled: false
        });

        // Deploy
        sender = new ProofOfHumanSender(
            hubAddress,
            scopeSeed,
            config,
            hyperlaneMailbox,
            baseDomain,
            baseReceiver
        );

        console.log("");
        console.log("Deployed at:", address(sender));
        console.log("Scope:", sender.scope());
        console.log("");
        console.log("=== HOW TO USE ===");
        console.log("1. User scans QR -> verification happens");
        console.log("2. Verification stored locally (no Hyperlane yet)");
        console.log("3. Call sendVerificationCrossChain() with ETH to bridge");
        console.log("");
        console.log("This is the official Self pattern!");
    }
}

