// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Medoo is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable {
   bool private initialized;
   constructor() {
       _disableInitializers();
   }

   function initialize() initializer public {
       require(!initialized, "Contract instance has already been initialized");
       initialized = true;
       __ERC20_init("Medoo", "MEDOO");
       __ERC20Burnable_init();
        __Ownable_init();
       _mint(msg.sender, 1000000000 * 10 ** decimals());
   }
}

