var auction_platform_artifacts = require('../build/contracts/AuctionPlatform.json')
var Web3 = require('web3')
var Contract = require('web3-eth-contract');
var abi = auction_platform_artifacts.abi;
Contract.setProvider('ws://localhost:7545');
var address = auction_platform_artifacts.networks[5777].address;

var contract = new Contract(abi, address);


var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var ProductModel = require('./product');
mongoose.connect("mongodb://localhost:27017/auction_dapp");
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var express = require('express');
const { events } = require('mongoose');
var app = express();

newProductEventListener();

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.listen(3000, function () {
    console.log('Auction Ethereum server listening on port 3000!');
});

app.get('/products', function (req, res) {
    let current_time = Math.round(new Date() / 1000);
    let query = { productStatus: { $eq: 0 } };

    // current_time < auctionEndTime: bidding
    // auctionEndTime < current_time < auctionEndTime + 600: revealing
    // current_time > auctionEndTime + 600: finalize
    if (Object.keys(req.query).length === 0) {
        query['auctionEndTime'] = { $gt: current_time };
    } else if (req.query.category !== undefined) {
        query['auctionEndTime'] = { $gt: current_time };
        query['category'] = { $eq: req.query.category };
    } else if (req.query.productStatus !== undefined) {
        if (req.query.productStatus == "reveal") {
            query['auctionEndTime'] = { $lt: current_time, $gt: current_time - 600 };
        } else if (req.query.productStatus == "finalize") {
            query['auctionEndTime'] = { $lt: current_time - 600 };
            query['productStatus'] = { $eq: 0 };
        }
    }

    ProductModel.find(query, null, { sort: 'auctionEndTime' }, function (err, items) {
        if(err) {
            console.log(err);
        } else {
            console.log(items.length);
            res.send(items);
        }
    })
})

function newProductEventListener() {
    contract.events.NewProduct(() => {
    }).on("connected", function (subscriptionId) {
        console.log('SubID: ', subscriptionId);
    })
        .on('data', function (event) {
            // console.log('Event:', event.returnValues);
            saveProduct(event.returnValues);
        })
        // .on('changed', function(event){
        //     saveProduct(event.returnValues);
        // })
        .on('error', function (error, receipt) {
            console.log('Error:', error, receipt);
        });
}

function saveProduct(product) {
    ProductModel.findOne({ 'blockchainId': product._productId.toLocaleString() }, function (err, dbProduct) {
        if (err) {
            console.log(err);
            return;
        }
        if (dbProduct != null) {
            return;
        }

        var p = new ProductModel({ name: product._name, blockchainId: product._productId, category: product._category, ipfsImageHash: product._imageLink, ipfsDescHash: product._descLink, auctionStartTime: product._auctionStartTime, auctionEndTime: product._auctionEndTime, price: product._startPrice, condition: product._productCondition, productStatus: 0 });
        p.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                ProductModel.count({}, function (err, count) {
                    console.log("count is " + count);
                })
            }
        });
    })
}