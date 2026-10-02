const mongoose = require("mongoose");
const spCampaignSchema = new mongoose.Schema(
    {
        profileId: {
            type: Number,
            trim: true,
        },
        portfolioId: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            trim: true,
        },
        campaignId: {
            type: String,
            trim: true,
        },
        campaignName: {
            type: String,
            trim: true,
            default: null,
        },
        campaignStatus: {
            type: String,
            trim: true,
            default: null,
        },
        placement: {
            type: String,
            tring: true
        },
        placementModifier: {
            type: Number,
            default: 0,
        },
        campaignBudget: {
            type: Number,
            trim: true,
            default: 0,
        },
        campaignBudgetType: {
            type: String,
            trim: true,
            default: null,
        },
        isUpdatedOnAmazon: {
            type: Boolean,
            default: true
        },
        isManage: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);
module.exports = new mongoose.model("spCampaign", spCampaignSchema);
