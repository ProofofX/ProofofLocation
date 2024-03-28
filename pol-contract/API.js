const ethers = require("ethers");

class PoL {

  /*
  ** url: URL link to the chain json rpc api
  ** abi: ABI interface of PoL contract(sample after compilation: artifacts/contracts/Pol.sol/Pol.json)
  ** privKey: wallet private key
  ** PoLAddress: PoL contract address deployed on the chain
  */
  constructor(url, abi, privKey, PoLAddress) {
    this.pol = new ethers.Contract(
      PoLAddress,
      abi,
      new ethers.Wallet(
        privKey,
        new ethers.providers.JsonRpcProvider(url)
      )
    );
  }

  /*
  ** INPUT:
  ** prover: prover address
  ** cc: challenger coordinator address
  ** amount: uint
  ** num_accounts: uint
  ** bandwith: uint
  ** timeout: uint
  *****************************************
  ** EXPECTED OUTPUT:
  ** id: BigNumber
  */
  async startChallenge(prover, cc, amount, num_accounts, bandwidth, timeout) {
    const result = await this.pol.startChallenge(prover, cc, amount, num_accounts, bandwidth, timeout);
    let receipt = await this.pol.provider.getTransactionReceipt(result["hash"]);
    let id;
    for (const log of receipt.logs) {
      try {
        const logDescription = this.pol.interface.parseLog({
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
    return id;
  }

  /*
  ** INPUT:
  ** challengers: list challenger addresses
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT: 
  ** receipt: https://docs.ethers.org/v5/api/utils/abi/interface/#Result
  */
  async endChallenge(challengers, id) {
    const receipt = await this.pol.endChallenge(challengers, id);
    return receipt;
  }

  /*
  ** INPUT:
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT:
  ** detail: PoL struct
  */
  async getPoL(id) {
    const receipt = await this.pol.getPol(id);
    return receipt["value"]
  }

  /*
  ** INPUT:
  ** addr: address
  *****************************************
  ** EXPECTED OUTPUT:
  ** balance: BigNumber
  */
  async getBalance(addr) {
    const receipt = await this.pol.getBalance(addr);
    return receipt["value"];
  }

  /*
  ** INPUT:
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT: 
  ** receipt: https://docs.ethers.org/v5/api/utils/abi/interface/#Result
  */
  async timeout(id) {
    const receipt = await this.pol.timeout(id);
    return receipt;
  }

  /*
  ** INPUT:
  ** id: uint
  *****************************************
  ** EXPECTED OUTPUT: 
  ** receipt: https://docs.ethers.org/v5/api/utils/abi/interface/#Result
  */
  async withdraw(id) {
    const receipt = await this.pol.withdraw(id);
    return receipt;
  }

}