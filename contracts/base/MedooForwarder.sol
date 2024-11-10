// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MedooForwarder is Ownable, MinimalForwarder {
    address public admin;

    // constructor(address admin_) {
    //     setAdmin(admin_);
    // }

    /**
     * Change admin address, only owner has permission.
     *
     * @param newAdmin address of new admin.
     */
    function setAdmin(address newAdmin) public onlyOwner {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }

    function executeWithRevert(
        ForwardRequest calldata req,
        bytes calldata signature
    ) public payable returns (bool, bytes memory) {
        (bool success, bytes memory returndata) = execute(req, signature);

        if (success == false) {
            assembly {
                revert(add(returndata, 32), mload(returndata))
            }
        }

        return (success, returndata);
    }
}
