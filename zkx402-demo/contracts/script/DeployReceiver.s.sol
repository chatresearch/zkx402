// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ProofOfHumanReceiver } from "../src/ProofOfHumanReceiver.sol";
import { BaseScript } from "./Base.s.sol";
import { console } from "forge-std/console.sol";

contract DeployReceiver is BaseScript {
    function run() public broadcast returns (ProofOfHumanReceiver receiver) {
        address hyperlaneMailbox = vm.envAddress("BASE_HYPERLANE_MAILBOX");
        uint32 celoDomain = uint32(vm.envUint("CELO_CHAIN_DOMAIN"));

        console.log("=== Deploying ProofOfHumanReceiver (Base) ===");
        console.log("Mailbox:", hyperlaneMailbox);
        console.log("Source Domain (Celo):", celoDomain);

        // Deploy
        receiver = new ProofOfHumanReceiver(hyperlaneMailbox, celoDomain);

        console.log("");
        console.log("Deployed at:", address(receiver));
        console.log("");
        console.log("=== NEXT STEPS ===");
        console.log("1. Copy this address to .env as BASE_PROOF_OF_HUMAN_RECEIVER");
        console.log("2. Deploy Celo sender with this receiver address");
        console.log("3. Add sender as trusted: receiver.addTrustedSender(senderAddress)");
    }
}

