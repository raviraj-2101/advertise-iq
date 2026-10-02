const mongoose = require("mongoose");
const spTragetingSchema = new mongoose.Schema(
  {
    profileId: {
      type: Number,
      trim: true,
      required: true,
    },
    date: {
      type: String,
      trim: true,
      required: true,
    },
    keywordId: {
      type: Number,
      required: true,
    },
    cost: {
      type: Number,
      required: true,
    },
    matchType: {
      type: String,
      trim: true,
      required: true,
    },
    campaignId: {
      type: Number,
      required: true,
    },
    impressions: {
      type: Number,
      required: true,
    },
    keywordBid: {
      type: String,
      required: true,
    },
    targeting: {
      type: String,
      required: true,
    },
    adKeywordStatus: {
      type: String,
      required: true,
    },
    keywordType: {
      type: String,
      required: true,
    },
    clicks: {
      type: Number,
      required: true,
    },
    keyword: {
      type: String,
      required: true,
    },
    adGroupId: {
      type: String,
      required: true,
    },
    spend: {
      type: Number,
      trim: true,
      default: 0,
    },
    ctr: {
      type: Number,
      trim: true,
      default: 0,
    },
    cpc: {
      type: Number,
      trim: true,
      default: 0,
    },
    orders: {
      type: Number,
      trim: true,
      default: 0,
    },
    sales: {
      type: Number,
      trim: true,
      default: 0,
    },
    acos: {
      type: Number,
      trim: true,
      default: 0,
    },
    roas: {
      type: Number,
      trim: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = new mongoose.model("spTarget", spTragetingSchema);
