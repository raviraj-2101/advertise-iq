const mongoose = require("mongoose");
const configAdsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer_companies",
    },
    adsAccessToken: {
      type: String,
      trim: true,
    },
    adsRefreshToken: {
      type: String,
      trim: true,
    },
    clientId: {
      type: String,
      trim: true,
    },
    clientSecret: {
      type: String,
      trim: true,
    },
    adsTokenExpire: {
      type: Number,
      trim: true,
    },
  },
  { timestamps: true }
);
module.exports = new mongoose.model("configAds", configAdsSchema);
