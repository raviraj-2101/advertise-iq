const mongoose = require("mongoose");
const keywordSchema = new mongoose.Schema(
  {
    adGroupId: {
      type: String,
      required: true,
    },
    campaignId: {
      type: String,
      required: true,
    },
    profileId: {
      type: String,
      required: true,
    },
    keywordId: {
      type: String,
      required: true,
    },
    date: {
      type: String,
    },
    keywordText: {
      type: String,
      required: true,
    },
    bid: {
      type: Number,
      required: true,
    },
    status: {
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

module.exports = new mongoose.model("keyword", keywordSchema);
