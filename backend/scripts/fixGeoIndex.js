// backend/scripts/fixGeoIndex.js
// One-time migration. Run from the backend folder:  node scripts/fixGeoIndex.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/productModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, family: 4 });
  console.log("Connected to:", mongoose.connection.db.databaseName);

  // 1. Drop the old, wrong 2dsphere index on `coordinates` ({latitude, longitude} is not GeoJSON
  //    and could reject listings from some longitudes).
  try {
    await Product.collection.dropIndex("coordinates_2dsphere");
    console.log("Dropped old index: coordinates_2dsphere");
  } catch (e) {
    console.log("Old index not present (fine):", e.codeName || e.message);
  }

  // 2. Backfill the GeoJSON `geo` field for listings that already have latitude/longitude
  const res = await Product.collection.updateMany(
    {
      "coordinates.latitude": { $type: "number" },
      "coordinates.longitude": { $type: "number" },
      geo: { $exists: false }
    },
    [{ $set: { geo: { type: "Point", coordinates: ["$coordinates.longitude", "$coordinates.latitude"] } } }]
  );
  console.log(`Backfilled geo on ${res.modifiedCount} listing(s)`);

  // 3. Create the indexes defined in productModel.js (2dsphere on geo, text search, etc.)
  await Product.createIndexes();
  console.log("Indexes:", (await Product.collection.indexes()).map(i => i.name).join(", "));

  const withGeo = await Product.countDocuments({ geo: { $exists: true } });
  const total = await Product.countDocuments({});
  console.log(`${withGeo}/${total} listings have coordinates and can be found by radius search.`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });