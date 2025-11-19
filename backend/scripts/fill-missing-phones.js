const mongoose = require("mongoose");
const Product = require("../models/Product");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Product.updateMany({ sellerPhone: { $exists: false } }, { $set: { sellerPhone: "254000000000" } });
  console.log("updated", res.modifiedCount || res.nModified);
  process.exit();
}
run();
