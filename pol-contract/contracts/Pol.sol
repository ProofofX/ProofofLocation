// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./WIT.sol";

contract Pol {
    using Counters for Counters.Counter;
    Counters.Counter private _polIds;
    Counters.Counter private _lookupIdx;
    Counters.Counter private _tokenLookupIdx;
    mapping(uint => uint256) private pollites; // uint40 payer | uint40 cc | uint40 expiration | uint80 amount | uint40 bandwidth | uint16 tokenAddr
    mapping(uint40 => address) private lookup;
    mapping(address => uint40) private index;
    mapping(address => uint16) private tokenLookup;
    mapping(uint16 => address) private tokenIndex;
    address witAddress;

    struct PoLLite {
        address payer;
        address cc;
        address tokenAddress;
        uint256 expiration;
        uint256 amount;
        uint256 bandwidth;
    }



    event PolCreated (
        uint256 id,
        address cc,
        address payer,
        address prover
    );

    constructor(address addr) {
        // By default, Ethers is index 0 and WIT is index 1
        witAddress = addr;
        _tokenLookupIdx.increment();
        tokenLookup[addr] = uint16(_tokenLookupIdx.current());
        tokenIndex[uint16(_tokenLookupIdx.current())] = addr;
    }

    function getPol(uint256 _id) public view returns (PoLLite memory) {
        require(pollites[_id] != 0, "PoL Not Exist");
        uint256 mixed = pollites[_id];
        return PoLLite({
            payer: lookup[uint40(mixed>>216)],
            cc: lookup[uint40(mixed>>176)],
            tokenAddress: tokenIndex[uint16(mixed)],
            expiration: uint40(mixed>>136),
            amount: uint80(mixed>>56),
            bandwidth: uint40(mixed>>16)
        });
    }

    function getBalance(address addr) public view returns(uint){
        // return ContractAddress.balance;
        return WIT(witAddress).balanceOf(addr);
    }
    
    function startChallenge(
        address _prover,
        address _cc,
        address _tokenAddress,
        uint80 _amount, 
        uint40 _bandwidth, 
        uint40 _timeout
    ) public payable {
        // console.log("Start Challenge in contract");
        // require (msg.value == _amount * 1 ether, "Transfer amount incorrect");
        require((_amount != 0 && _tokenAddress != address(0)) || (_tokenAddress == address(0) && msg.value != 0), "0 Transfer Amount");
        require(uint256(_timeout) + block.timestamp > block.timestamp, "Timeout Overflow");
        _polIds.increment();

        uint40 _expiration = _timeout + uint40(block.timestamp);
        uint40 payerIdx = index[msg.sender];
        uint40 ccIdx = index[_cc];
        uint16 tokenIdx = tokenLookup[_tokenAddress];

        if (payerIdx == 0) {
            _lookupIdx.increment();
            payerIdx = uint40(_lookupIdx.current());
            lookup[payerIdx] = msg.sender;
            index[msg.sender] = payerIdx;
        }

        if (ccIdx == 0) {
            _lookupIdx.increment();
            ccIdx = uint40(_lookupIdx.current());
            lookup[ccIdx] = _cc;
            index[_cc] = ccIdx;
        }

        if (tokenIdx == 0 && _tokenAddress != address(0)) {
            _tokenLookupIdx.increment();
            tokenIdx = uint16(_tokenLookupIdx.current());
            tokenLookup[_tokenAddress] = tokenIdx;
            tokenIndex[tokenIdx] = _tokenAddress;
        }
        
        uint80 amount = _amount;
        if (tokenIdx != 0) {
            ERC20(_tokenAddress).transferFrom(msg.sender, address(this), amount);
        } else {
            amount = uint80(msg.value);
        }
        
        uint256 mixed = 0;
        mixed |= uint256(payerIdx) << 216;
        mixed |= uint256(ccIdx) << 176;
        mixed |= uint256(_expiration) << 136;
        mixed |= uint256(amount) << 56;
        mixed |= uint256(_bandwidth) << 16;
        mixed |= uint256(tokenIdx);

        pollites[_polIds.current()] = mixed;
        
        emit PolCreated(
            _polIds.current(),
            _cc,
            msg.sender,
            _prover
        );
    }

    function endChallenge(address payable[] memory _addrs, uint256 _id) public {
        PoLLite memory p = getPol(_id);
        require(p.cc == msg.sender, "CC Only");
        require(block.timestamp <= p.expiration, "Challenge Timeout");

        uint amount = p.amount/_addrs.length;
        
        if (p.tokenAddress == address(0)) {
            for (uint i=0; i< _addrs.length; i++){
                _addrs[i].transfer(amount);
            }
        } else {
            for (uint i=0; i< _addrs.length; i++){
                ERC20(p.tokenAddress).transfer(_addrs[i], amount);
            }
        }
    }

    function timeout(uint256 _id) public {
        PoLLite memory p = getPol(_id);
        require(block.timestamp > p.expiration, "Cannot Timeout Yet");
        uint amount = p.amount;
        if (p.tokenAddress == address(0)) {
            payable(p.payer).transfer(amount);
        } else {
            ERC20(p.tokenAddress).transfer(p.payer, amount);
        }
    } 

    function withdraw(uint256 _id) public {
        PoLLite memory p = getPol(_id);
        require(p.payer == msg.sender, "Initiator Only");
        require(block.timestamp <= p.expiration, "Cannot Withdraw Now");
        if (p.tokenAddress == address(0)) {
            payable(p.payer).transfer(p.amount);
        } else {
            ERC20(p.tokenAddress).transfer(p.payer, p.amount);
        }
    }

}
