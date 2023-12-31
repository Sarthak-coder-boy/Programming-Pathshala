const { MongoClient } = require("mongodb");

const crypto = require("crypto"); 


const url = "mongodb://localhost:27017"; 
const collectionName = "shortened_urls";

let db;

async function connectToDatabase() {
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    db = client.db().collection(collectionName);
    console.log("Connected to MongoDB Atlas!");
  } catch (error) {
    console.error("Error while connecting to MongoDB:", error);
    throw error;
  }
}


function generateShortURL(longURL) {
  const prefix = "www.ppa.in/";
  const hash = crypto.createHash("sha256").update(longURL).digest("hex");
  const shortURL = prefix + hash.substr(0, 6); // Adjust the length as needed
  return shortURL;
}


async function shortenUrl(destinationUrl) {
  try {
    
    const shortUrl = generateShortURL(destinationUrl);

   
    await db.insertOne({
      shortUrl: shortUrl,
      destinationUrl: destinationUrl,
      createdAt: new Date(),
      expiresAt: null, 
    });

    return shortUrl;
  } catch (error) {
    console.error("Error while shortening URL:", error);
    throw error;
  }
}


async function updateShortUrl(shortUrl, newDestinationUrl) {
  try {
    
    const result = await db.updateOne(
      { shortUrl: shortUrl },
      { $set: { destinationUrl: newDestinationUrl } }
    );

    return result.modifiedCount === 1;
  } catch (error) {
    console.error("Error while updating short URL:", error);
    throw error;
  }
}

// Get Destination URL
async function getDestinationUrl(shortUrl) {
  try {
    
    const document = await db.findOne({ shortUrl: shortUrl });

    if (document) {
      
      const currentTime = new Date();
      if (document.expiresAt && currentTime > document.expiresAt) {
        return null; 
      }

      return document.destinationUrl;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error while retrieving destination URL:", error);
    throw error;
  }
}


async function updateExpiry(shortUrl, daysToAdd) {
  try {
    
    const document = await db.findOne({ shortUrl: shortUrl });
    if (!document) {
      return false; 
    }

    const currentExpiry = document.expiresAt ? document.expiresAt : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    await db.updateOne(
      { shortUrl: shortUrl },
      { $set: { expiresAt: newExpiry } }
    );

    return true;
  } catch (error) {
    console.error("Error while updating URL expiry:", error);
    throw error;
  }
}


async function main() {
  await connectToDatabase();

  const destinationUrl = "https://www.example.com";
  const shortUrl = await shortenUrl(destinationUrl);
  console.log("Short URL:", shortUrl);

  const newDestinationUrl = "https://www.example.com/new";
  const updateSuccess = await updateShortUrl(shortUrl, newDestinationUrl);
  console.log("Update Success:", updateSuccess);

  const retrievedDestinationUrl = await getDestinationUrl(shortUrl);
  console.log("Retrieved Destination URL:", retrievedDestinationUrl);

  const daysToAdd = 30;
  const expiryUpdateSuccess = await updateExpiry(shortUrl, daysToAdd);
  console.log("Expiry Update Success:", expiryUpdateSuccess);
}

main().catch(console.error);