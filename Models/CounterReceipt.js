const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 1800 },
});

module.exports = mongoose.model("CounterReceipt", schema);
