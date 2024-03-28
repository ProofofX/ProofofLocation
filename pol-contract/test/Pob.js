const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const assert = require("assert");

function delay(ms) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

describe("PoL Functionality", function () {
  let pol, wit, faucet;
  let payer, payerAccount, prover, cc ;
  let polDefault, witDefault;

  describe("Transfer WIT Tokens", function() {
    beforeEach( async function () {
      const Pol = await ethers.getContractFactory("Pol");
      const WIT = await ethers.getContractFactory("WIT");
      const Faucet = await ethers.getContractFactory("Faucet");
      [payer, payerAccount] = await ethers.getSigners();
      prover = ethers.Wallet.createRandom().connect(ethers.provider);
      cc = ethers.Wallet.createRandom().connect(ethers.provider);
      wit = await WIT.deploy()
      pol = await Pol.deploy(wit.address);
      faucet = await Faucet.deploy(wit.address);
      await wit.transfer(faucet.address, 100000000000);
    });

    it("Send WIT to Payer", async function() {
      let amount = 100000000;
      var balance = await pol.getBalance(prover.address);
      assert.equal(balance, 0);
      await wit.transfer(prover.address, amount);
      balance = await pol.getBalance(prover.address);
      assert.equal(balance, amount);
    });

    it("Request Token from Faucet", async function() {
      var balance = await pol.getBalance(payerAccount.address);
      assert.equal(balance, 0);
      const faucetPayer = faucet.connect(payerAccount);
      await faucetPayer.requestTokens();
      balance = await pol.getBalance(payerAccount.address);
      assert.equal(balance.toNumber(), 100000000)

      try {
        await faucetPayer.requestTokens();
      } catch(err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'Request Too Frequent'")
      }
    });
  });

  describe("PoL Challenge Correctness", function() {
    beforeEach( async function () {
      [payer, payerAccount] = await ethers.getSigners();
      const Pol = await ethers.getContractFactory("Pol");
      const WIT = await ethers.getContractFactory("WIT");
      prover = ethers.Wallet.createRandom();
      cc = ethers.Wallet.createRandom().connect(ethers.provider);
      witDefault = await WIT.deploy()
      polDefault = await Pol.deploy(witDefault.address);
      await witDefault.transfer(payerAccount.address, 10000);
    });

    it("Start and End Challenge", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;
      // Before challenge starts
      const witPayer = witDefault.connect(payerAccount);
      const polPayer = polDefault.connect(payerAccount);
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(pol.address);
      assert.equal(balancePayer, 10000);
      assert.equal(balancePoL, 0);

      await witPayer.approve(polDefault.address, amount);

      let info = await polPayer.startChallenge(
        prover.address,
        payer.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      );
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = polPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PolCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      // After challenge starts
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(polDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoL.toNumber(), 5000, "Contract Deposit Mismatch");

      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      
      const [payer1, payerAccount1] = await ethers.getSigners();
      console.log(payerAccount1.address)
      console.log(payer.address)
      //const polCC = polDefault.connect(payerAccount1);
      await polDefault.endChallenge(challengers, id);

      // After challenge normally ends
      let balance1 = await polDefault.getBalance(challenger1.address);
      let balance2 = await polDefault.getBalance(challenger2.address);
      assert.equal(balance1.toNumber(), 2500, "Challenger1 Balance Mismatch");
      assert.equal(balance2.toNumber(), 2500, "Challenger2 Balance Mismatch");

      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(polDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoL.toNumber(), 0, "Contract Deposit Mismatch");
    });


    it("Start and End Challenge With Ethers", async function() {
      let amount = 0;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;
      // Before challenge starts
      const polPayer = polDefault.connect(payerAccount);

      let info = await polPayer.startChallenge(
        prover.address,
        payer.address,
        ethers.constants.AddressZero,
        amount,
        bandwidth,
        timeout,
        { value: 2000 }
      );

      
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = polPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PolCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      
      const polCC = polDefault.connect(payer);
      await polCC.endChallenge(challengers, id);

      // After challenge normally ends
      let balance1 = await polDefault.provider.getBalance(challenger1.address);
      let balance2 = await polDefault.provider.getBalance(challenger2.address);
      assert.equal(balance1.toNumber(), 1000, "Challenger1 Balance Mismatch");
      assert.equal(balance2.toNumber(), 1000, "Challenger2 Balance Mismatch");
    });


    it("Start and Withdraw Challenge", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      // Before challenge start
      const witPayer = witDefault.connect(payerAccount);
      const polPayer = polDefault.connect(payerAccount);
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(pol.address);
      assert.equal(balancePayer, 10000);
      assert.equal(balancePoL, 0);

      await witPayer.approve(polDefault.address, amount);
      let info = await polPayer.startChallenge(
        prover.address,
        payer.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      );
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = polPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PolCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      // After challenge start
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(polDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoL.toNumber(), 5000, "Contract Deposit Mismatch");
      
      await polPayer.withdraw(id)

      // After withdraw
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(polDefault.address);
      assert.equal(balancePayer.toNumber(), 10000, "Payer Balance Mismatch");
      assert.equal(balancePoL.toNumber(), 0, "Contract Deposit Mismatch");
    });

    it("Start and Timeout", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      // Before challenge starts
      const witPayer = witDefault.connect(payerAccount);
      const polPayer = polDefault.connect(payerAccount);
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(pol.address);
      assert.equal(balancePayer, 10000);
      assert.equal(balancePoL, 0);

      await witPayer.approve(polDefault.address, 5000);
      let info = await polPayer.startChallenge(
        prover.address,
        payer.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      );
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = polPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PolCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      // After challenge starts
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(polDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoL.toNumber(), 5000, "Contract Deposit Mismatch");

      await delay(2000)
      await polDefault.timeout(id)

      // After timeout
      var balancePayer = await polDefault.getBalance(payerAccount.address);
      var balancePoL = await polDefault.getBalance(polDefault.address);
      assert.equal(balancePayer.toNumber(), 10000, "Payer Balance Mismatch");
      assert.equal(balancePoL.toNumber(), 0, "Contract Deposit Mismatch");
    });

  });


  describe("Erroneous PoL Challenge", function() {
    beforeEach( async function () {
      [payer, payerAccount] = await ethers.getSigners();
      const Pol = await ethers.getContractFactory("Pol");
      const WIT = await ethers.getContractFactory("WIT");
      prover = ethers.Wallet.createRandom();
      cc = ethers.Wallet.createRandom().connect(ethers.provider);
      witDefault = await WIT.deploy()
      polDefault = await Pol.deploy(witDefault.address);
      await witDefault.transfer(payerAccount.address, 10000);
    });

    it("Insufficient Funds", async function() {
      let amount = 11000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      const witPayer = witDefault.connect(payerAccount);
      const polPayer = polDefault.connect(payerAccount);
      await witPayer.approve(polDefault.address, 11000);
      try{
        await polPayer.startChallenge(
          prover.address,
          cc.address,
          witPayer.address,
          amount,
          bandwidth,
          timeout,
        ); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
      };
    });

    it("Not Enough Allowence", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      const witPayer = witDefault.connect(payerAccount);
      const polPayer = polDefault.connect(payerAccount);
      await witPayer.approve(polDefault.address, 4000);
      try{
        await polPayer.startChallenge(
          prover.address,
          cc.address,
          witPayer.address,
          amount,
          bandwidth,
          timeout,
        ); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'");
      };
    });

    it("Not Initiator End", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      const witPayer = witDefault.connect(payerAccount);
      const polPayer = polDefault.connect(payerAccount);
      await witPayer.approve(polDefault.address, amount);
      let id = (await polPayer.startChallenge(
        prover.address,
        cc.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      ))["value"]; 
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await polDefault.endChallenge(challengers, id);
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoL Not Exist'");
      };
    });

    it("End Challenge Ahead", async function() {
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await polDefault.endChallenge(challengers, 0); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoL Not Exist'");
      };
    });

    it("Timeout Ahead", async function() {
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await polDefault.timeout(0); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoL Not Exist'");
      };
    });

    it("Withdraw Ahead", async function() {
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await polDefault.withdraw(0); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoL Not Exist'");
      };
    });

  })


});
