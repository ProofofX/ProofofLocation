// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Faucet {

    mapping(address => uint) private rateLimits;
    address witAddress;

    constructor(address tokenAddress) {
      witAddress = tokenAddress;
    }

    function requestTokens() public {
        require(block.timestamp - rateLimits[msg.sender] > 86400, "Request Too Frequent");
        ERC20(witAddress).transfer(msg.sender, 10**8);
        rateLimits[msg.sender] = block.timestamp;
    } 
}