const mongoose = require("mongoose");

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    chain: { type: String, trim: true, default: "PVR Cinemas" },
    address: { type: String, trim: true },
    facilities: [{ type: String }],
    formats: [{ type: String }],
    languages: [{ type: String }],
    googleMapsUrl: { type: String, trim: true },
    screens: [{ type: String }],
    image: { type: String },
    seats: {
      lower: { type: Number, default: 40 },
      middle: { type: Number, default: 40 },
      balcony: { type: Number, default: 20 },
    },
    prices: {
      lower: { type: Number, default: 150 },
      middle: { type: Number, default: 250 },
      balcony: { type: Number, default: 350 },
    },
  },
  { timestamps: true }
);

theatreSchema.index({ city: 1, name: 1 });
theatreSchema.index({ chain: 1 });

module.exports = mongoose.model("Theatre", theatreSchema);
