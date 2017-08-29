pragma solidity ^0.4.2;
import "./ExternalStorage.sol";

library CstLibrary {
  function getTokenName(address _storage) constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstTokenName");
  }

  function setTokenName(address _storage, bytes32 tokenName) {
    ExternalStorage(_storage).setBytes32Value("cstTokenName", tokenName);
  }

  function getTokenSymbol(address _storage) constant returns(bytes32) {
    return ExternalStorage(_storage).getBytes32Value("cstTokenSymbol");
  }

  function setTokenSymbol(address _storage, bytes32 tokenName) {
    ExternalStorage(_storage).setBytes32Value("cstTokenSymbol", tokenName);
  }

  function getBuyPrice(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue("cstBuyPrice");
  }

  function setBuyPrice(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue("cstBuyPrice", value);
  }

  function getSellPrice(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue("cstSellPrice");
  }

  function setSellPrice(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue("cstSellPrice", value);
  }

  function getSellCap(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue("cstSellCap");
  }

  function setSellCap(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue("cstSellCap", value);
  }

  function getMinimumEthBalance(address _storage) constant returns(uint) {
    return ExternalStorage(_storage).getUIntValue("cstMinimumEthBalance");
  }

  function setMinimumEthBalance(address _storage, uint value) {
    ExternalStorage(_storage).setUIntValue("cstMinimumEthBalance", value);
  }

  function getFoundation(address _storage) constant returns(address) {
    return ExternalStorage(_storage).getAddressValue("cstFoundation");
  }

  function setFoundation(address _storage, address value) {
    ExternalStorage(_storage).setAddressValue("cstFoundation", value);
  }

  function getAllowance(address _storage, address account, address spender) constant returns (uint) {
    return ExternalStorage(_storage).getMultiLedgerValue("cstAllowance", account, spender);
  }

  function setAllowance(address _storage, address account, address spender, uint allowance) {
    ExternalStorage(_storage).setMultiLedgerValue("cstAllowance", account, spender, allowance);
  }

}
