const mongoose = require("mongoose");
const adGroupSchema = new mongoose.Schema(
  {
    adGroupId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    campaignId: {
      type: String,
      required: true,
    },
    bid: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
    },
    status: {
      type: String,
      required: true,
    },
    profileId: {
      type: String,
      required: true,
    },
    isUpdatedOnAmazon: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
  }
);

module.exports = new mongoose.model("adGroup", adGroupSchema);
