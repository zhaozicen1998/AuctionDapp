AuctionPlatform = artifacts.require("./AuctionPlatform.sol");
module.exports = function() {
    current_time = Math.round(new Date() / 1000);
    amt_1 = web3.utils.toWei("1", 'ether');
    AuctionPlatform.deployed().then(function(i) {i.addProductToStore('iphone 5', 'Cell Phones & Accessories', 'QmNmBuPzLoTDeSyRm7H2iUf6gGjDfBb1QF6QjNqfnqr2bd', 'QmXhzjToSCmUPagTBspfyJBC4QLFZppjokiSBRcHtDmJef', current_time, current_time + 200, BigInt(2*amt_1), 0).then(function(f) {console.log(f)})});
    AuctionPlatform.deployed().then(function(i) {i.addProductToStore('Orange', 'Art', 'QmbwxgwqPGQm3LPtcD1ubxefq13toP54xxyXJEdPoTbx18', 'QmaRfokEXiaUyotPNyAx29jBMZv4GDzZwaJAnVurGE3dMa', current_time, current_time + 400, BigInt(3*amt_1), 1).then(function(f) {console.log(f)})});
    AuctionPlatform.deployed().then(function(i) {i.addProductToStore('Shit', 'Art', 'QmUhkee2yEXPMy13KpuqX4PZz9djiLw7WDev6WQvBBJHFH', 'QmbmueHC1rdd75E2FuFh6TASxNJ3u6PFi4oUYzkB7U6trY', current_time, current_time + 14, BigInt(amt_1), 0).then(function(f) {console.log(f)})}); 
    AuctionPlatform.deployed().then(function(i) {i.addProductToStore('Laptop', 'Computers/Tablets & Networking', 'QmP3sjT293bW873dESW9bXLxv46KJYifp4LqayxcUp5WdX', 'QmRVZ3PvjX3BQ855khMTaFFUXzWAh5CoiU1aXDeZWpfXYz', current_time, current_time + 86400, BigInt(4*amt_1), 1).then(function(f) {console.log(f)})});
    AuctionPlatform.deployed().then(function(i) {i.addProductToStore('Jeans', 'Clothing, Shoes & Accessories', 'QmSpz5v9Xxu9bAmKgpjCZ9gqycuyHzQdbjyEWGcEDEsaPY', 'QmTjE7sVqo4yjMyFdewaY5jFyanckEqDLy2uWAc2rbQuwo', current_time, current_time + 86400 + 86400 + 86400, BigInt(5*amt_1), 1).then(function(f) {console.log(f)})});
    // AuctionPlatform.deployed().then(function(i) {i.productIndex.call().then(function(f){console.log(f)})});
};