const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb://localhost:27017/codelabs-kpi";
const EMAIL = "ramdani"; // ganti jika email berbeda (bisa partial)
const MAC_ADDRESS = "94:08:53:39:E4:21";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email: { $regex: EMAIL, $options: "i" } });
    if (!user) {
      console.log("❌ User tidak ditemukan. Cek EMAIL di atas.");
      return;
    }

    console.log(`✅ User ditemukan: ${user.name} (${user.email})`);
    console.log(`   MAC lama: ${user.mac_address || "(kosong)"}`);

    await users.updateOne(
      { _id: user._id },
      { $set: { mac_address: MAC_ADDRESS, change_mac_address: false } }
    );

    console.log(`✅ MAC address berhasil diset: ${MAC_ADDRESS}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.close();
  }
}

run();
