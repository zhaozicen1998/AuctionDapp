const AuctionPlatform = artifacts.require("./AuctionPlatform.sol");

module.exports = function(deployer) {
  deployer.deploy(AuctionPlatform);
};
