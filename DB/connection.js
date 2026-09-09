const mongoose = require("mongoose");
const User = require("../Models/User");
const { config } = require("../config/env");

let connectionPromise;

async function connectDb() {
  if (connectionPromise) return connectionPromise;
  if (!config.CONNECTION_STRING) {
    throw new Error("CONNECTION_STRING must be set.");
  }

  mongoose.set("strictQuery", true);
  connectionPromise = mongoose.connect(config.CONNECTION_STRING, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await connectionPromise;
    console.log("Mongodb Atlas connected");
    await User.updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: true } }
    );
    await User.updateMany(
      { role: { $exists: false } },
      { $set: { role: "user" } }
    );
  } catch (error) {
    connectionPromise = null;
    console.error("MongoDB connection failed");
    throw error;
  }
  return connectionPromise;
}

async function disconnectDb() {
  await mongoose.disconnect();
  connectionPromise = null;
}

module.exports = { connectDb, disconnectDb };
