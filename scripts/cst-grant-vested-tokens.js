const { CST_NAME } = require("../lib/constants");
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const moment = require('moment');

const dateFormat = "YYYY-MM-DD";
let RegistryContract = artifacts.require("./Registry.sol");
let CardStackToken = artifacts.require("./CardStackToken.sol");

const optionsDefs = [
  { name: "help", alias: "h", type: Boolean },
  { name: "network", type: String },
  { name: "address", type: String },
  { name: "fullyVestedTokenAmount", type: Number },
  { name: "startDay", type: String },
  { name: "vestingDurationDays", type: Number },
  { name: "daysUntilCliff", type: Number },
  { name: "nonRevocable", type: Boolean },
  { name: "registry", alias: "r", type: String },
  { name: "data", alias: "d", type: Boolean }
];

const usage = [
  {
    header: "cst-grant-vested-tokens",
    content: "This script grants vested tokens to the specified address based on the vesting schedule defined in the command line arguments."
  },{
    header: "Options",
    optionList: [{
      name: "help",
      alias: "h",
      description: "Print this usage guide."
    },{
      name: "network",
      description: "The blockchain that you wish to use. Valid options are `testrpc`, `rinkeby`, `mainnet`."
    },{
      name: "address",
      description: "The address of the beneficiary of the vested token grant."
    },{
      name: "fullyVestedTokenAmount",
      description: "The amount of CST tokens that will be made available when 100% vested."
    },{
      name: "startDay",
      description: "[Optional] The day, in YYYY-MM-DD format of the local timezone in which to begin the vesting. Note that the date must be in the future. If no date is supplied, then vesting will begin at the time that this transaction is mined."
    },{
      name: "vestingDurationDays",
      description: "The amount of days over which the vesting will occur, after which the tokens will be 100% vested."
    },{
      name: "daysUntilCliff",
      description: "The amount of days after the vesting start date that the vesting cliff occurs. Before the cliff date, no tokens will be available. After the cliff date, vested tokens can be released."
    },{
      name: "nonRevocable",
      description: "[Optional] A flag indicating whether the vested token grant is non-revocable. Note that if you create a non-revocable vested token grant, there is no way to recall it. when this flag is not included, vested tokens grants are revocable. When a vested grant is revoked after the cliff date, all the vested tokens are released to the beneficiary, and the unvested tokens are returned to the token contract. If the vesting is revoked before the cliff date, then no tokens are released to the beneficiary, and all the tokens are released back to the token contract. Note that you cannot revoke a fully vested token grant."
    },{
      name: "registry",
      alias: "r",
      description: "The address of the registry."
    },{
      name: "data",
      alias: "d",
      description: "Display the data necessary to invoke the transaction instead of actually invoking the transaction"
    }]
  }
];

module.exports = async function(callback) {
  let { network,
        address,
        fullyVestedTokenAmount,
        startDay,
        vestingDurationDays,
        daysUntilCliff,
        nonRevocable,
        registry,
        data,
        help } = commandLineArgs(optionsDefs);

  if (!address ||
     !fullyVestedTokenAmount ||
     !vestingDurationDays ||
     !network ||
     help ||
     !registry) {
    console.log(getUsage(usage));
    callback();
    return;
  }

  if (startDay && (!moment(startDay, dateFormat).isValid() ||
                   moment(startDay).isBefore())) {
    console.error(`The start date "${startDay}" is not a valid ${dateFormat} date or in the past`);
    console.log(getUsage(usage));
    callback();
    return;
  }

  if (vestingDurationDays < daysUntilCliff) {
    console.error(`The vestingDurationDays "${vestingDurationDays}" cannot be less than the daysUntilCliff "${daysUntilCliff}"`);
    console.log(getUsage(usage));
    callback();
    return;
  }

  let registryContract = await RegistryContract.at(registry);

  console.log(`Using registry at ${registryContract.address}`);
  let cstAddress = await registryContract.contractForHash(web3.sha3(CST_NAME));

  let cst = await CardStackToken.at(cstAddress);

  let revocable = !nonRevocable;

  let startSec;
  if (!startDay) {
    startSec = 0;
  } else {
    startSec = moment(startDay, dateFormat).unix();
  }
  let vestingDurationSec = Math.floor(moment.duration(vestingDurationDays, "days").as("seconds"));
  let vestingCliffSec = Math.floor(moment.duration(daysUntilCliff, "days").as("seconds"));

  if (data) {
    let data = cst.contract.grantVestedTokens.getData(address,
                                                      fullyVestedTokenAmount,
                                                      startSec,
                                                      vestingCliffSec,
                                                      vestingDurationSec,
                                                      revocable);
    let estimatedGas = web3.eth.estimateGas({
      to: cst.address,
      data
    });
    console.log(`Data for vested token grant with a fully vested amount of ${fullyVestedTokenAmount} CST to ${address}, that starts ${startDay ? startDay : "now" } with a vesting duration of ${vestingDurationDays} days and a cliff that occurs ${daysUntilCliff} days after the start day that is ${revocable ? "revocable" : "NOT revocable"} for CST (${cst.address}):`);
    console.log(`\nAddress: ${cst.address}`);
    console.log(`Data: ${data}`);
    console.log(`Estimated gas: ${estimatedGas}`);
    callback();
    return;
  }

  try {
    console.log(`Granting vested tokens with a fully vested amount of ${fullyVestedTokenAmount} CST to ${address}, that starts ${startDay ? startDay : "now" } with a vesting duration of ${vestingDurationDays} days and a cliff that occurs ${daysUntilCliff} days after the start day that is ${revocable ? "revocable" : "NOT revocable"} for CST (${cst.address}):`);
    await cst.grantVestedTokens(address,
                                fullyVestedTokenAmount,
                                startSec,
                                vestingCliffSec,
                                vestingDurationSec,
                                revocable);
    console.log('done');
  } catch (err) {
    console.error(`Error granting vested tokens for CST (${cst.address}, ${err.message}`);
  }

  callback();
};
