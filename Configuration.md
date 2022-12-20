### Install Necessary software: 

1. MongoDB (https://www.mongodb.com/try/download/community)
   - set environment variables
   
   - Set the database location  
   
     `mongod --dbpath=C:\\\\data\\\db`
   
2. Ganache (https://trufflesuite.com/ganache/)
   
3. IPFS (https://dist.ipfs.tech/#go-ipfs)
   - set environment variables
   
   - Execute the following command

     `ipfs init`
   
     `ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["""*"""]'`
   
4. Metamask

5. NodeJS (v16)



### Install  plugins (after you already clone the repository)

1.  cd app
2.  npm install
3.  npm install -g truffle



### Configuration

1. Start the ipfs process 

   ​	`ipfs daemon`

2. Start ganache
   - make sure port number is **7545**
   - add truffle projects (Settings --  workspace -- Add project)
   - Add the first 4 addresses to Metamask

3. Start MongoDB
   - if it said "connect ECONNREFUSED 127.0.0.1:27017", run these codes in terminal 

     ​	`mongod --dbpath=C:\\\\data\\\db` (The path is your database path)

     , don't close the terminal

4. (Make sure you are in the project home directory)
   - Compile the contract and write it to the blockchain 

     ​	`truffle migrate --reset`

5. Start the Front-end Server
   - `cd app`
   - `npm run dev -- --port=8088`

6. Setting up test data (items)  and start Back-end server
   - ~~Get the ipfs hash of the product image and introduction respectively~~  

     (We have already done it, If you want to replace the image with a different one you can do this step)

   - Start back-end server
     - make sure you are in app folder
     - `node .\server.js`
     
   - `truffle exec seed.js`  

     ~~(modify the ipfs hash value in seed.js)~~

   - Successful if the database is successfully queried for data



### Cautions

1. If you want to redeploy the contract, don't forget to delete the data that already exists in the database. (Delete auction_dapp database)
1. Make sure the front-end and back-end servers are shut down before redeploying. The redeployment steps will start from **step 4**.