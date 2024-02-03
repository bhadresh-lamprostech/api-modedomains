// const express = require("express");
// const { ethers } = require("ethers");
// const cors = require("cors"); // Import the cors middleware

// const reverseRegistrarABI = require("./artifacts/contracts/registrar/ReverseRegistrar.sol/ReverseRegistrar.json");
// const resolverABI = require("./artifacts/contracts/resolvers/Resolver.sol/Resolver.json");
// const contractABI = require("./artifacts/contracts/base/Base.sol/Base.json");

// const app = express();
// app.use(cors());
// const port = 3000;

// app.get("/", (req, res) => {
//   res.send("Welcome to the ModeDomains Token Metadata API!");
// });

// app.get("/getTokenURI/:address", async (req, res) => {
//   const { address } = req.params;

//   try {
//     const ensName = await resolveAddressToENSName(address);
//     const tokenUri = await getTokenURIFromENSName(ensName);

//     res.json({ ensName, tokenUri });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });

// async function resolveAddressToENSName(address) {
//   try {
//     const providerUrl = "https://sepolia.mode.network/";

//     const provider = new ethers.providers.JsonRpcProvider(providerUrl);

//     const reverseRegistrar = new ethers.Contract(
//       "0xF3087f9ad8718C28f4fe81C22b01cDfeca1FFbd5",
//       reverseRegistrarABI.abi,
//       provider
//     );

//     const reverseNode = await reverseRegistrar.node(address);

//     if (reverseNode === ethers.constants.HashZero) {
//       throw new Error(`No reverse resolution found for ${address}`);
//     }

//     const resolverContract = new ethers.Contract(
//       "0xf675259f989f95e15d7923AccC6883D2e1fdd735",
//       resolverABI.abi,
//       provider
//     );

//     let ensName = await resolverContract.name(reverseNode);
//     ensName = ensName.replace(".mode", "");

//     return ensName;
//   } catch (error) {
//     throw new Error(`Error resolving address to ENS name: ${error.message}`);
//   }
// }

// async function getTokenURIFromENSName(ensName) {
//   try {
//     const tokenId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ensName));
//     const providerUrl = "https://sepolia.mode.network/";

//     const provider = new ethers.providers.JsonRpcProvider(providerUrl);

//     const contract = new ethers.Contract(
//       "0xca3a57e014937c29526de98e4a8a334a7d04792b",
//       contractABI.abi,
//       provider
//     );

//     const tokenUri = await contract.tokenURI(tokenId);

//     // Fetch the metadata
//     const metadataResponse = await fetch(tokenUri);
//     const metadata = await metadataResponse.json();

//     // console.log(`Token URI for Token ID ${tokenId}: ${tokenUri}`);
//     // console.log(`Metadata for Token ID ${tokenId}:`, metadata);

//     return { tokenUri, metadata };
//   } catch (error) {
//     throw new Error(
//       `Error getting token URI for ENS name ${ensName}: ${error.message}`
//     );
//   }
// }
const express = require("express");
const ethers = require("ethers");
const axios = require("axios");
const cors = require("cors");
const app = express();
app.use(cors());
const port = 3000;

// Replace these values with your actual contract details
const baseContractAddress = "0xca3a57e014937c29526de98e4a8a334a7d04792b";
const baseContractMainnetAddress = "0x2aD86eeEC513AC16804bb05310214C3Fd496835B";
const baseContractABI = require("./artifacts/contracts/base/Base.sol/Base.json");

const providerUrl = "https://sepolia.mode.network/";
const providerUrlMainnet = "https://mainnet.mode.network/";

app.get("/", (req, res) => {
  res.send("Welcome to the ModeDomains Token Metadata API!");
});

app.get("/api/getAllDomains/:address", async (req, res) => {
  try {
    const responseData = [];
    const seenTokenIds = new Set();

    // Get the requester's address from the HTTP request
    const { address } = req.params; // assuming it's passed as a query parameter

    const provider = new ethers.providers.JsonRpcProvider(providerUrl);

    const baseContract = new ethers.Contract(
      baseContractAddress,
      baseContractABI.abi,
      provider
    );

    const filter = baseContract.filters.Transfer(null, address, null);

    // Fetch events
    const events = await baseContract.queryFilter(filter);

    // Extract token IDs from events
    for (const event of events) {
      const tokenId = event.args.tokenId.toString(); // Convert BigNumber to string

      // Check if tokenId is a duplicate before further processing
      if (!seenTokenIds.has(tokenId)) {
        seenTokenIds.add(tokenId);

        const owner = await baseContract.ownerOf(tokenId);

        if (owner === address) {
          const tokenURI = await baseContract.tokenURI(tokenId);

          const response = await axios.get(tokenURI);

          responseData.push(response.data);
        }
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/mainnet/getAllDomains/:address", async (req, res) => {
  try {
    const responseData = [];
    const seenTokenIds = new Set();

    // Get the requester's address from the HTTP request
    const { address } = req.params; // assuming it's passed as a query parameter

    const provider = new ethers.providers.JsonRpcProvider(providerUrlMainnet);

    const baseContract = new ethers.Contract(
      baseContractMainnetAddress,
      baseContractABI.abi,
      provider
    );

    const filter = baseContract.filters.Transfer(null, address, null);

    // Fetch events
    const events = await baseContract.queryFilter(filter);

    // Extract token IDs from events
    for (const event of events) {
      const tokenId = event.args.tokenId.toString(); // Convert BigNumber to string
      console.log("tokenID", tokenId);

      // Check if tokenId is a duplicate before further processing
      if (!seenTokenIds.has(tokenId)) {
        seenTokenIds.add(tokenId);

        const owner = await baseContract.ownerOf(tokenId);
        console.log("owner", owner);
        console.log("address", address);

        if (owner == address) {
          const tokenURI = await baseContract.tokenURI(tokenId);
          console.log(tokenURI);

          const response = await axios.get(tokenURI);

          responseData.push(response.data);
        }
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
