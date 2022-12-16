import { default as Web3 } from 'web3';
import { default as contract } from '@truffle/contract';
// const contract = require("@truffle/contract");
import auction_platform_artifacts from '../../build/contracts/AuctionPlatform.json';

var AuctionPlatform = contract(auction_platform_artifacts);

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI({ host: 'localhost', port: '5001', protocol: 'http' });
const offchainServer = "http://localhost:3000";
const categories = ["Art", "Books", "Cameras", "Cell Phones & Accessories", "Clothing", "Computers & Tablets", "Gift Cards & Coupons", "Musical Instruments & Gear", "Pet Supplies", "Pottery & Glass", "Sporting Goods", "Tickets", "Toys & Hobbies", "Video Games"];


window.App = {
  start: function () {
    var self = this;
    AuctionPlatform.setProvider(web3.currentProvider);
    // web3.eth.getAccounts().then(console.log);
    renderStore();

    var reader;

    $("#product-image").change(function (event) {
      const file = event.target.files[0];
      reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
    });

    $("#add-item-to-store").submit(function (event) {
      const req = $("#add-item-to-store").serialize();
      // console.log("req: ", req);
      let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
      console.log("params: ", params);
      let decodedParams = {}
      Object.keys(params).forEach(function (v) {
        decodedParams[v] = decodeURIComponent(decodeURI(params[v]));
      });
      // console.log("decodeParams: ", decodedParams);
      saveProduct(reader, decodedParams);
      event.preventDefault();
    });

    if ($("#product-details").length > 0) {
      //This is product details page
      let productId = new URLSearchParams(window.location.search).get('id');
      $("#revealing, #bidding, #finalize-auction, #escrow-info").hide();
      renderProductDetails(productId);
    }

    $("#bidding").submit(function (event) {
      $("#msg").hide();
      let amount = $("#bid-amount").val();
      let sendAmount = $("#bid-send-amount").val();
      let secretText = $("#secret-text").val();
      let sealedBid = web3.utils.soliditySha3(web3.utils.toWei(amount.toString(), 'ether').toString() + secretText);
      let productId = $("#product-id").val();
      // console.log(sealedBid + " for " + productId);
      AuctionPlatform.deployed().then(async function (i) {
        let account1 = "";
        await web3.eth.getAccounts().then(e => account1 = e[0]);
        i.bid(parseInt(productId), sealedBid, { value: web3.utils.toWei(sendAmount.toString(), 'ether'), from: account1, gas: 3000000 }).then(
          function (f) {
            $("#msg").html("Your bid has been successfully submitted!");
            $("#msg").show();
          })
      });
      event.preventDefault();
    });

    $("#revealing").submit(function (event) {
      $("#msg").hide();
      let amount = $("#actual-amount").val();
      let secretText = $("#reveal-secret-text").val();
      let productId = $("#product-id").val();
      AuctionPlatform.deployed().then(async function (i) {
        let account1 = "";
        await web3.eth.getAccounts().then(e => account1 = e[0]);
        i.revealBid(parseInt(productId), web3.utils.toWei(amount.toString(), 'ether').toString(), secretText, { from: account1, gas: 3000000 }).then(
          function (f) {
            $("#msg").show();
            $("#msg").html("Your bid has been successfully revealed!");
          })
      });
      event.preventDefault();
    });

    $("#finalize-auction").submit(function (event) {
      $("#msg").hide();
      let productId = $("#product-id").val();
      AuctionPlatform.deployed().then(async function (i) {
        let account1 = "";
        await web3.eth.getAccounts().then(e => account1 = e[0]);
        i.finalizeAuction(parseInt(productId), { from: account1, gas: 3000000 }).then(
          function (f) {
            $("#msg").show();
            $("#msg").html("The auction has been finalized and winner declared.");
            location.reload();
          }
        ).catch(function (e) {
          console.log(e);
          $("#msg").show();
          $("#msg").html("The auction can not be finalized by the buyer or seller, only a third party aribiter can finalize it");
        })
      });
      event.preventDefault();
    });

    $("#release-funds").click(function () {
      let productId = new URLSearchParams(window.location.search).get('id');
      AuctionPlatform.deployed().then(async function (f) {
        let account1 = "";
        await web3.eth.getAccounts().then(e => account1 = e[0]);
        $("#msg").html("Your transaction has been submitted. Please wait for few seconds for the confirmation").show();
        f.releaseAmountToSeller(productId, { from: account1, gas: 3000000 }).then(function (f) {
          location.reload();
        }).catch(function (err) {
          console.log(err);
        });
      });
    });

    $("#refund-funds").click(function () {
      let productId = new URLSearchParams(window.location.search).get('id');
      AuctionPlatform.deployed().then(async function (f) {
        let account1 = "";
        await web3.eth.getAccounts().then(e => account1 = e[0]);
        $("#msg").html("Your transaction has been submitted. Please wait for few seconds for the confirmation").show();
        f.refundAmountToBuyer(productId, { from: account1, gas: 3000000 }).then(function (f) {
          location.reload();
        }).catch(function (err) {
          console.log(err);
        });
      });

      alert("refund the funds!");
    });
  },
};

function renderStore() {
  renderProducts("product-list", {});
  renderProducts("product-reveal-list", { productStatus: "reveal" });
  renderProducts("product-finalize-list", { productStatus: "finalize" });
  categories.forEach(function (value) {
    $("#categories").append("<div>" + value + "");
  })
}

function renderProducts(div, filters) {
  $.ajax({
    url: offchainServer + "/products",
    type: 'get',
    contentType: "application/json; charset=utf-8",
    data: filters
  }).done(function (data) {
    if (data.length == 0) {
      $("#" + div).attr('align', 'center');
      $("#" + div).html('No products found');
    } else {
      $("#" + div).html('');
    }
    while (data.length > 0) {
      let chunks = data.splice(0, 4);
      let row = $("<div/>");
      row.addClass("row");
      chunks.forEach(function (value) {
        let node = buildProduct(value);
        row.append(node);
      })
      $("#" + div).append(row);
    }
  })
}

function buildProduct(product) {
  var startTime = new Date((product.auctionStartTime)*1000); 
  var endTime = new Date((product.auctionEndTime)*1000); 
  var auctionStartTime = startTime.toLocaleDateString().replace(/\//g,"-")+" "+startTime.toTimeString().substr(0,8);   
  var auctionEndTime = endTime.toLocaleDateString().replace(/\//g,"-")+" "+endTime.toTimeString().substr(0,8);  
  // console.log(auctionStartTime, auctionEndTime);
  let node = $("<div/>");
  node.addClass("col-sm-3 text-center col-margin-bottom-1");
  node.append("<a href='product.html?id=" + product.blockchainId + "'><img src='http://localhost:8080/ipfs/" + product.ipfsImageHash + "' width='150px' />");
  node.append("<div>" + product.name + "</div>");
  node.append("<div>" + product.category + "</div>");
  node.append("<div>" + "start: " + auctionStartTime + "</div>");
  node.append("<div>" + "end: " + auctionEndTime + "</div>");
  node.append("<div>Ether " + web3.utils.fromWei(product.price.toString(), 'ether').toString() + "</div>");
  return node;
}

function saveProduct(reader, decodedParams) {
  let imageId, descId;
  saveImageOnIpfs(reader).then(function (id) {
    imageId = id;
    saveTextBlobOnIpfs(decodedParams["product-description"]).then(function (id) {
      descId = id;
      saveProductToBlockchain(decodedParams, imageId, descId);
    });
  });
}

function saveImageOnIpfs(reader) {
  return new Promise(function (resolve, reject) {
    const buffer = Buffer.from(reader.result);
    ipfs.add(buffer).then((response) => {
      console.log(response);
      resolve(response[0].hash);
    }).catch((err) => {
      console.error(err);
      reject(err);
    })
  })
}

function saveTextBlobOnIpfs(blob) {
  return new Promise(function (resolve, reject) {
    const descBuffer = Buffer.from(blob, 'utf-8');
    ipfs.add(descBuffer).then((response) => {
      console.log(response);
      resolve(response[0].hash);
    }).catch((err) => {
      console.error(err);
      reject(err);
    })
  })
}

function saveProductToBlockchain(params, imageId, descId) {
  let auctionStartTime = Date.parse(params["product-auction-start"]) / 1000;
  let auctionEndTime = auctionStartTime + parseInt(params["product-auction-end"]) * 24 * 60 * 60;

  AuctionPlatform.deployed().then(async function (i) {
    let account1 = "";
    await web3.eth.getAccounts().then(e => account1 = e[0]);
    i.addProductToStore(params["product-name"], params["product-category"], imageId, descId, auctionStartTime, auctionEndTime, web3.utils.toWei(params["product-price"].toString(), 'ether'), parseInt(params["product-condition"]), { from: account1, gas: 3000000 }).then(function (f) {
      // console.log(f);
      $("#msg").show();
      $("#msg").html("Your product was successfully added to your store!");
    })
  });
}

function renderProductDetails(productId) {
  AuctionPlatform.deployed().then(function (i) {
    i.getProduct.call(productId).then(function (p) {
      // console.log(p);
      let content = "";
      ipfs.cat(p[4]).then(function (file) {
        content = file.toString();
        $("#product-desc").append("<div>" + content + "</div>");
      });

      $("#product-image").append("<img src='http://localhost:8080/ipfs/" + p[3] + "' width='250px' />");
      $("#product-price").html(displayPrice(p[7]));
      $("#product-name").html(p[1]);
      $("#product-auction-end").html(displayEndTime(p[6]));
      $("#product-id").val(p[0]);
      let currentTime = getCurrentTime();

      if (parseInt(p[8]) == 1) {
        AuctionPlatform.deployed().then(function (i) {
          $("#escrow-info").show();
          i.highestBidderInfo(productId).then(function (info) {
            $("#product-status").html("Auction has ended. Product sold to " + info[0] + " for " + displayPrice(info[2]) + ". " +
              "The money is in the escrow. Two of the three participants (Buyer, Seller and Arbiter) have to " +
              "either release the funds to seller or refund the money to the buyer.");
          });
          i.escrowInfo(productId).then(function (info) {
            $("#buyer").html('Buyer: ' + info[0]);
            $("#seller").html('Seller: ' + info[1]);
            $("#arbiter").html('Arbiter: ' + info[2]);
            if (info[3] == true) {
              $("#release-count").html("Amount from the escrow has been released");
              $("#release-funds, #refund-funds").hide();
            } else {
              $("#release-count").html(info[4] + " of 3 participants have agreed to release funds");
              $("#refund-count").html(info[5] + " of 3 participants have agreed to refund the buyer");
            }
          });
        });
      } else if (parseInt(p[8]) == 2) {
        $("#product-status").html("Product was not sold");
      } else if (currentTime < p[6]) {
        $("#bidding").show();
      } else if (currentTime - (600) < p[6]) {
        $("#revealing").show();
      } else {
        $("#finalize-auction").show();
      }
    });
  });
}

function getCurrentTime() {
  return Math.round(new Date() / 1000);
}

function displayEndTime(timestamp) {
  let current_time = getCurrentTime();
  let remaining_time = timestamp - current_time;

  if (remaining_time <= 0) {
    return "Auction has ended";
  }

  let days = Math.trunc(remaining_time / (24 * 60 * 60));
  remaining_time -= days * 24 * 60 * 60;

  let hours = Math.trunc(remaining_time / (60 * 60));
  remaining_time -= hours * 60 * 60;

  let minutes = Math.trunc(remaining_time / 60);
  remaining_time -= minutes * 60;

  if (days > 0) {
    return "Auction ends in " + days + " days, " + hours + ", hours, " + minutes + " minutes";
  } else if (hours > 0) {
    return "Auction ends in " + hours + " hours, " + minutes + " minutes ";
  } else if (minutes > 0) {
    return "Auction ends in " + minutes + " minutes ";
  } else {
    return "Auction ends in " + remaining_time + " seconds";
  }
}

function displayPrice(amount) {
  return web3.utils.fromWei(amount.toString(), 'ether') + 'ETH';
}

window.addEventListener('load', function () {
  // // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  // if (typeof web3 !== 'undefined') {
  //   console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
  //   // Use Mist/MetaMask's providerf
  //   window.web3 = new Web3(web3.currentProvider);
  // } else {
  //   console.warn("No web3 detected. Falling back to http://localhost:7545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
  //   // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
  //   window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));
  // }
  if (window.ethereum) {
    // use MetaMask's provider
    window.web3 = new Web3(window.ethereum);
    window.ethereum.request({ method: 'eth_requestAccounts' }); // get permission to access accounts
  } else {
    console.warn(
      "No web3 detected. Falling back to http://127.0.0.1:7545. You should remove this fallback when you deploy live",
    );
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:7545"),
    );
  }

  App.start();
});