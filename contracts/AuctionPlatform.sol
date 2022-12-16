// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./Escrow.sol";

contract AuctionPlatform {
    enum ProductStatus {Open, Sold, Unsold}
    enum ProductCondition {New, Used}
    uint public productIndex;
    mapping (address => mapping(uint => Product)) stores;
    mapping (uint => address) productIdInStore;
    mapping (address => mapping (bytes32 => Bid)) bids;
    mapping (uint => address) productEscrow;


    struct Product {
        uint id;
        string name;
        string category;
        string imageLink;
        string descLink;
        uint auctionStartTime;
        uint auctionEndTime;
        uint startPrice;
        address payable highestBidder;
        uint highestBid;
        uint secondHighestBid;
        uint totalBids;
        ProductStatus status;
        ProductCondition condition;
        // mapping (address => mapping (bytes32 => Bid)) bids;  //必须放外面，否则报错
    }

    struct Bid {
        address bidder;
        uint productId;
        uint value;
        bool revealed;
    }

    event NewProduct(uint _productId, string _name, string _category, string _imageLink, string _descLink, uint _auctionStartTime, uint _auctionEndTime, uint _startPrice, uint _productCondition);

    constructor() {
        productIndex = 0;
    }

    function addProductToStore(string memory _name, string memory _category, string memory _imageLink, string memory _descLink, uint _auctionStartTime, uint _auctionEndTime, uint _startPrice, uint _productCondition) public {
        require (_auctionStartTime < _auctionEndTime);
        productIndex += 1;
        Product memory product = Product(productIndex, _name, _category, _imageLink, _descLink, _auctionStartTime, _auctionEndTime, _startPrice, payable(address(0x0)), 0, 0, 0, ProductStatus.Open, ProductCondition(_productCondition));
        stores[msg.sender][productIndex] = product;
        productIdInStore[productIndex] = msg.sender;
        emit NewProduct(productIndex, _name, _category, _imageLink, _descLink, _auctionStartTime, _auctionEndTime, _startPrice, _productCondition);
    }

    function getProduct(uint _productId) view public returns (uint, string memory, string memory, string memory, string memory, uint, uint, uint, ProductStatus, ProductCondition) {
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return (product.id, product.name, product.category, product.imageLink, product.descLink, product.auctionStartTime, product.auctionEndTime, product.startPrice, product.status, product.condition);
    }

    function bid(uint _productId, bytes32 _bid) payable public returns (bool) {
        Product storage product = stores[productIdInStore[_productId]][_productId];
        require (block.timestamp >= product.auctionStartTime);
        require (block.timestamp <= product.auctionEndTime);
        require (msg.value > product.startPrice); // 我们给的eth数量不能比起拍价格少
        require (bids[msg.sender][_bid].bidder == address(0x0)); //防止同一个人重复的报价被写入多次
        bids[msg.sender][_bid] = Bid(msg.sender, _productId, msg.value, false);
        product.totalBids += 1;
        return true;
    }

    function revealBid(uint _productId, string memory _amount, string memory _secret) public {
        Product storage product = stores[productIdInStore[_productId]][_productId];
        require (block.timestamp > product.auctionEndTime);
        bytes32 sealedBid = keccak256(abi.encodePacked(_amount, _secret));

        Bid memory bidInfo = bids[msg.sender][sealedBid];
        require (bidInfo.bidder > address(0x0));
        require (bidInfo.revealed == false);

        uint refund;

        uint amount = stringToUint(_amount);

        if(bidInfo.value < amount) {
            // They didn't send enough amount, they lost
            refund = bidInfo.value;
        } else {
        // If first to reveal set as highest bidder
            if (address(product.highestBidder) == address(0x0)) {
                product.highestBidder = payable(msg.sender);
                product.highestBid = amount;
                product.secondHighestBid = product.startPrice;
                refund = bidInfo.value - amount;
            } else {
                if (amount > product.highestBid) {
                    product.secondHighestBid = product.highestBid;
                    product.highestBidder.transfer(product.highestBid);
                    product.highestBidder = payable(msg.sender);
                    product.highestBid = amount;
                    refund = bidInfo.value - amount;
                } else if (amount > product.secondHighestBid) {
                    product.secondHighestBid = amount;
                    refund = bidInfo.value;
                } else {
                    refund = bidInfo.value;
                }
            }
        }
        bids[msg.sender][sealedBid].revealed = true;

        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }

    function highestBidderInfo(uint _productId) view public returns (address, uint, uint) {
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return (product.highestBidder, product.highestBid, product.secondHighestBid);
    }

    function totalBids(uint _productId) view public returns (uint) {
        Product memory product = stores[productIdInStore[_productId]][_productId];
        return product.totalBids;
    }

    function finalizeAuction(uint _productId) public {
        Product storage product = stores[productIdInStore[_productId]][_productId];
        require(block.timestamp > product.auctionEndTime);
        require(product.status == ProductStatus.Open);
        require(product.highestBidder != msg.sender);
        require(productIdInStore[_productId] != msg.sender);

        if (product.highestBidder == address(0x0)) {
            product.status = ProductStatus.Unsold;
        } else {
            // Whoever finalizes the auction is the arbiter
            Escrow escrow = (new Escrow){value: product.secondHighestBid}(_productId, product.highestBidder, payable(productIdInStore[_productId]), msg.sender);
            productEscrow[_productId] = address(escrow);
            product.status = ProductStatus.Sold;
            // The bidder only pays the amount equivalent to second highest bidder
            // Refund the difference
            uint refund = product.highestBid - product.secondHighestBid;
            product.highestBidder.transfer(refund);
        }
    }

    function escrowAddressForProduct(uint _productId) public view returns (address) {
        return productEscrow[_productId];
    }

    function escrowInfo(uint _productId) public view returns (address, address, address, bool, uint, uint) {
        return Escrow(productEscrow[_productId]).escrowInfo();
    }

    function releaseAmountToSeller(uint _productId) public {
        Escrow(productEscrow[_productId]).releaseAmountToSeller(msg.sender);
    }

    function refundAmountToBuyer(uint _productId) public {
        Escrow(productEscrow[_productId]).refundAmountToBuyer(msg.sender);
    }

    function stringToUint(string memory s) pure private returns (uint) {
        bytes memory b = bytes(s);
        uint result = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint256 c = uint256(uint8(b[i]));
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }
}
