require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/userModel");

const email = process.argv[2];

const run = async () => {
  if (!email) {
    console.log("Please type an email. Example: node seed/makeAdmin.js test@example.com");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: "admin" },
    { new: true }
  );

  console.log(user ? `${user.email} is now an admin` : "No user found with that email");
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});