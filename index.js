const express = require("express");
const ethers = require("ethers");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const { google } = require("googleapis");

const app = express();
app.use(cors());
const port = 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL);

// Define a schema for your data
const dataSchema = new mongoose.Schema({
  counter: {
    type: Number,
    default: 0,
  },
  name: String,
  address: String,
  dateTime: String,
  transactionHash: String,
  price: String,
});

// Create a model based on the schema, specifying the collection name
const Data = mongoose.model("Data", dataSchema, "Transections");

// Middleware to parse JSON
app.use(bodyParser.json());

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

async function updateGoogleSheet(data) {
  try {
    // Load credentials from your JSON file
    const credentials = require("./credentials.json");

    // Authenticate using the service account key
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Get the sheets API instance
    const sheetsApi = google.sheets({ version: "v4", auth });

    // Specify the spreadsheetId and range
    const spreadsheetId = "1eQme7gvcrLpKyulXjECp8c0xNK6af13QeFdn9rEpftk";
    const range = "Sheet1"; // Update with your actual sheet name or range

    // Convert data to a 2D array
    const values = [
      [data.name, data.address, data.dateTime, data.transactionHash],
    ];

    // Prepare request body
    const request = {
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      resource: { values },
    };

    // Update Google Sheet
    const response = await sheetsApi.spreadsheets.values.append(request);
    console.log("Google Sheet updated:", response.data);
  } catch (error) {
    console.error("Error updating Google Sheet:", error.message);
    // Handle authentication errors or other issues here
    throw error;
  }
}

// API endpoint to store data
app.post("/api/store-transection", async (req, res) => {
  try {
    const { name, address, dateTime, transactionHash, price } = req.body;

    // Validate required fields
    if (!name || !address || !dateTime || !transactionHash || !price) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Create a new data object
    const newData = new Data({
      name,
      address,
      dateTime,
      transactionHash,
      price,
    });

    // Save the data to MongoDB
    await newData.save();

    await Data.updateOne({}, { $inc: { counter: 1 } });
    await updateGoogleSheet(req.body);

    res.status(201).json({ message: "Data stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
