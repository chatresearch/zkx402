// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

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
