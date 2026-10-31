const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn("MongoDB connection warning:", error.message);
    console.warn(
      "Server is running in resilient mode. Ensure your current IP is whitelisted on MongoDB Atlas: https://www.mongodb.com/docs/atlas/security-whitelist/"
    );
    return false;
  }
};

module.exports = connectDB;
