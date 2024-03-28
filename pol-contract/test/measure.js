const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const assert = require("assert");
const { config } = require("./config");

function delay(ms) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

describe("PoL Measurement", function () {
  let pol, wit;
  let payer, payerAccount, prover, cc ;
  let polDefault, witDefault;
  let amount = config.amount;
  let num_accounts = config.num_challengers;
  let bandwidth = config.bandwidth;
  let timeout = config.timeout;
  let rounds = config.rounds;

  beforeEach( async function () {
    [payer, payerAccount] = await ethers.getSigners();
    const Pol = await ethers.getContractFactory("Pol");
    const WIT = await ethers.getContractFactory("WIT");
    prover = ethers.Wallet.createRandom();
    cc = ethers.Wallet.createRandom();
    witDefault = await WIT.deploy()
    polDefault = await Pol.deploy(witDefault.address);

    await witDefault.transfer(payerAccount.address, amount * rounds);
  });

  it("Estimate Cost", async function() {

    // Before challenge starts
    const witPayer = witDefault.connect(payerAccount);
    const polPayer = polDefault.connect(payerAccount);
    
    var approvalGasCost = 0;
    for (let i = 0; i < rounds; i++) {
      
      let receipt = await witPayer.approve(polDefault.address, amount*(i+1));
      let gasUsed = (await ethers.provider.getTransactionReceipt(receipt.hash))["gasUsed"];
      approvalGasCost = gasUsed.add(approvalGasCost);

    }
    console.log("WIT approval takes average gas:", approvalGasCost/rounds);
    
    var startGasCost = 0;
    for (let i = 0; i < rounds; i++) {
      let diffcc = ethers.Wallet.createRandom();
      let receipt = (await polPayer.startChallenge(
        prover.address,
        cc.address,
        amount,
        num_accounts,
        bandwidth,
        timeout,
      ));
      let gasUsed = (await ethers.provider.getTransactionReceipt(receipt.hash))["gasUsed"];
      startGasCost = gasUsed.add(startGasCost);
    }
    console.log("Start challenge takes average gas:", startGasCost/rounds);

    // var endGasCost = 0;
    // for (let i = 0; i < rounds; i++) {
    //   let challengers = [];
    //   for (let j = 0; j < num_accounts; j++) {
    //     challengers.push(ethers.Wallet.createRandom().address);
    //   }
    //   let receipt = (await polPayer.endChallenge(
    //     challengers,
    //     i
    //   ));
    //   let gasUsed = (await ethers.provider.getTransactionReceipt(receipt.hash))["gasUsed"];
    //   endGasCost = gasUsed.add(endGasCost);
    // }
    // console.log("End challenge takes average gas:", endGasCost/rounds);
  });


});