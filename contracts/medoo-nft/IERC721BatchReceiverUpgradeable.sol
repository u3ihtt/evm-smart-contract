// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721BatchReceiverUpgradeable {
    /**
     * @dev Whenever an array {IERC721} `tokenIds` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
     *
     * The selector can be obtained in Solidity with `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721BatchReceived(
        address operator,
        address from,
        uint256[] memory tokenIds,
        bytes calldata data
    ) external returns (bytes4);
}
