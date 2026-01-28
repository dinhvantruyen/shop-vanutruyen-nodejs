const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  const dbName = process.env.MONGODB_DB;
  await mongoose.connect(uri, dbName ? { dbName } : undefined);
  return mongoose.connection;
};

module.exports = { connectDB };
