const { CST_BUY_GAS_LIMIT, CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", type: String },
  { name: "amount", type: String },
  { name: "registry", alias: "r", type: String }
];

const usage = [
  {
    header: "cst-transfer-info",
    content: "This script display transfer information that instructs how to transfer CST."
  },{
    header: "Options",
    optionList: [{
      name: "help",
      alias: "h",
      description: "Print this usage guide."
    },{
      name: "address",
      description: "The token recipient's address"
    },{
      name: "amount",
      description: "The amount of tokens to transfer"
    },{
      name: "network",
      description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    }]
  }
];

module.exports = async function(callback) {
  const options = commandLineArgs(optionsDefs);

  if (!options.network || options.help || !options.amount || !options.address || !options.registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  let { address, amount } = options;
  let registryAddress = options.registry;

  let registry = registryAddress ? await RegistryContract.at(registryAddress) : await RegistryContract.deployed();

  console.log(`Using registry at ${registry.address}`);
  let cstAddress = await registry.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);
  let symbol = await cst.symbol();

  let data = cst.contract.transfer.getData(address, amount);
  console.log(`\nTo transfer ${amount} ${symbol} to the recipient ${address}, send 0 ETH (not including gas) to the following address with the following data:`);
  console.log(`Address: ${cst.address}`);
  console.log(`Data: ${data}`);
  console.log(`Estimated gas: ${CST_BUY_GAS_LIMIT}`);

  callback();
};
