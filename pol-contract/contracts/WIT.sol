// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 
contract WIT is ERC20 {
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */     
    constructor() ERC20("WitnessChain Token", "WIT") {
        _mint(msg.sender, 10000000000 * (10 ** uint256(decimals())));
    }

    function decimals() public view virtual override returns (uint8) {
        return 8;
    }
}
