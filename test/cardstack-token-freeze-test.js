const {
  GAS_PRICE,
  MAX_FAILED_TXN_GAS,
  NULL_ADDRESS,
  asInt,
  checkBalance
} = require("../lib/utils");

const CardStackToken = artifacts.require("./CardStackToken.sol");
const CstLedger = artifacts.require("./CstLedger.sol");
const Storage = artifacts.require("./ExternalStorage.sol");
const Registry = artifacts.require("./Registry.sol");

contract('CardStackToken', function(accounts) {
  let ledger;
  let storage;
  let cst;
  let registry;

  describe("frozen account", function() {
    let frozenAccount = accounts[5];
    let freezeEvent;

    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");
      await registry.register("CST", cst.address, false);

      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(1, "ether"), 100, NULL_ADDRESS);

      await checkBalance(frozenAccount, 1);

      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      freezeEvent = await cst.freezeAccount(frozenAccount, true);
    });

    it("cannot sell CST when frozen", async function() {
      let sellerAccount = frozenAccount;
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 1;
      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await cst.balanceOf(sellerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was only charged for gas"); // actually it will be charged gas, but that's hard to test with truffle
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");

      assert.equal(freezeEvent.logs[0].event, 'FrozenFunds', 'the account freeze event is correct');
      assert.equal(freezeEvent.logs[0].args.target, frozenAccount, 'the target value is correct');
      assert.equal(freezeEvent.logs[0].args.frozen, true, 'the frozen value is correct');
    });

    it("cannot buy CST when frozen", async function() {
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await cst.balanceOf(buyerAccount);
      let totalInCirculation = await cst.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot send a transfer when frozen", async function() {
      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 1;

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("cannot receive a transfer when frozen", async function() {
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;

      await checkBalance(senderAccount, 1);

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");
    });

    it("can unfreeze an account", async function() {
      let unfreezeEvent = await cst.freezeAccount(frozenAccount, false);

      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 10;

      let txn = await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      });

      // console.log("TXN", JSON.stringify(txn, null, 2));
      assert.ok(txn.receipt);
      assert.ok(txn.logs);

      let senderBalance = await cst.balanceOf(senderAccount);
      let recipientBalance = await cst.balanceOf(recipientAccount);
      let totalInCirculation = await cst.totalInCirculation();

      assert.equal(asInt(senderBalance), 0, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");

      assert.equal(unfreezeEvent.logs[0].event, 'FrozenFunds', 'the account freeze event is correct');
      assert.equal(unfreezeEvent.logs[0].args.target, frozenAccount, 'the target value is correct');
      assert.equal(unfreezeEvent.logs[0].args.frozen, false, 'the frozen value is correct');
    });

    xit("does not allow approving allowance when spender account has been frozen", async function() {
    });

    xit("does not allow approving allowance when grantor account has been frozen", async function() {
    });

    xit("does not allow transferFrom when sender account has been frozen", async function() {
    });

    xit("does not allow transferFrom when 'from' account has been frozen", async function() {
    });

    xit("does not allow transferFrom when 'to' account has been frozen", async function() {
    });

    xit("cannot send CST to the reward pool when frozen", async function() {
    });
    xit("cannot receive CST reward when frozen", async function() {
    });
  });

  describe("frozen token", function() {
    let frozenAccount = accounts[5];
    let freezeEvent;

    beforeEach(async function() {
      ledger = await CstLedger.new();
      storage = await Storage.new();
      registry = await Registry.new();
      await registry.addStorage("cstStorage", storage.address);
      await registry.addStorage("cstLedger", ledger.address);
      await storage.addSuperAdmin(registry.address);
      await ledger.addSuperAdmin(registry.address);
      cst = await CardStackToken.new(registry.address, "cstStorage", "cstLedger");

      await registry.register("CST", cst.address, false);
      await ledger.mintTokens(100);
      await cst.initialize(web3.toHex("CardStack Token"), web3.toHex("CST"), web3.toWei(0.1, "ether"), web3.toWei(0.1, "ether"), 100, NULL_ADDRESS);

      await checkBalance(frozenAccount, 1);

      await cst.buy({
        from: frozenAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });
    });

    it("should not be able to mint tokens when token is frozen", async function() {
      freezeEvent = await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.mintTokens(100);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 10, "The totalInCirculation is correct");
    });

    it("should not be able to grant tokens when token is frozen", async function() {
      freezeEvent = await cst.freezeToken(true);
      let exceptionThrown;
      try {
        await cst.grantTokens(frozenAccount, 10);
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let totalTokens = await ledger.totalTokens();
      let totalInCirculation = await ledger.totalInCirculation();
      let recipientBalance = await ledger.balanceOf(frozenAccount);

      assert.equal(asInt(totalTokens), 100, "The totalTokens is correct");
      assert.equal(asInt(totalInCirculation), 10, "The totalInCirculation is correct");
      assert.equal(asInt(recipientBalance), 10, "The balance is correct");
    });

    it("cannot sell CST when frozen", async function() {
      freezeEvent = await cst.freezeToken(true);

      let sellerAccount = frozenAccount;
      let startBalance = await web3.eth.getBalance(sellerAccount);
      let sellAmount = 1;
      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.sell(sellAmount, {
          from: sellerAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(sellerAccount);
      let cstBalance = await ledger.balanceOf(sellerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was only charged for gas"); // actually it will be charged gas, but that's hard to test with truffle
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");

      assert.equal(freezeEvent.logs[0].event, 'FrozenToken', 'the account freeze event is correct');
      assert.equal(freezeEvent.logs[0].args.frozen, true, 'the frozen value is correct');
    });

    it("cannot buy CST when frozen", async function() {
      freezeEvent = await cst.freezeToken(true);
      let buyerAccount = frozenAccount;
      let txnValue = web3.toWei(1, "ether");
      let startBalance = await web3.eth.getBalance(buyerAccount);

      startBalance = asInt(startBalance);

      let exceptionThrown;
      try {
        await cst.buy({
          from: buyerAccount,
          value: txnValue,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let endBalance = await web3.eth.getBalance(buyerAccount);
      let cstBalance = await ledger.balanceOf(buyerAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      endBalance = asInt(endBalance);

      assert.ok(startBalance - endBalance < MAX_FAILED_TXN_GAS * GAS_PRICE, "The buyer's account was just charged for gas");
      assert.equal(asInt(cstBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation was not updated");
    });

    it("cannot send a transfer when frozen", async function() {
      freezeEvent = await cst.freezeToken(true);
      let senderAccount = frozenAccount;
      let recipientAccount = accounts[6];
      let transferAmount = 1;

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 0, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 10, "The CST total in circulation has not changed");
    });

    it("cannot receive a transfer when frozen", async function() {
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;

      await checkBalance(senderAccount, 1);

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      freezeEvent = await cst.freezeToken(true);

      let exceptionThrown;
      try {
        await cst.transfer(recipientAccount, transferAmount, {
          from: senderAccount,
          gasPrice: GAS_PRICE
        });
      } catch(err) {
        exceptionThrown = true;
      }
      assert.ok(exceptionThrown, "Transaction should fire exception");

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(senderBalance), 10, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 10, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");
    });

    it("should be able to unfreeze entire token", async function() {
      freezeEvent = await cst.freezeToken(true);
      let unfreezeEvent = await cst.freezeToken(false);
      let recipientAccount = accounts[5];
      let senderAccount = accounts[6];
      let transferAmount = 1;

      await checkBalance(senderAccount, 1);

      await cst.buy({
        from: senderAccount,
        value: web3.toWei(1, "ether"),
        gasPrice: GAS_PRICE
      });

      await cst.transfer(recipientAccount, transferAmount, {
        from: senderAccount,
        gasPrice: GAS_PRICE
      });

      let senderBalance = await ledger.balanceOf(senderAccount);
      let recipientBalance = await ledger.balanceOf(recipientAccount);
      let totalInCirculation = await ledger.totalInCirculation();

      assert.equal(asInt(senderBalance), 9, "The CST balance is correct");
      assert.equal(asInt(recipientBalance), 11, "The CST balance is correct");
      assert.equal(asInt(totalInCirculation), 20, "The CST total in circulation has not changed");

      assert.equal(unfreezeEvent.logs[0].event, 'FrozenToken', 'the account freeze event is correct');
      assert.equal(unfreezeEvent.logs[0].args.frozen, false, 'the frozen value is correct');
    });

    xit("does not allow setting allowance when token frozen", async function() {
    });

    xit("does not allow transferFrom when token frozen", async function() {
    });

    xit("cannot invoke balanceOf when token frozen", async function() {
    });

    xit("cannot invoke totalInCirculation when token frozen", async function() {
    });

    xit("cannot invoke totalTokens when token frozen", async function() {
    });

    xit("cannot send CST to the reward pool when token frozen", async function() {
    });
    xit("cannot receive CST reward when token frozen", async function() {
    });
  });

});
