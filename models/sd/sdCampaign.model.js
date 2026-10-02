const mongoose = require("mongoose");
const sdCampaignSchema = new mongoose.Schema(
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
        costType: {
            type: String,
            trim: true,
            default: "CPC",
        },
        // placement: {
        //     type: String,
        //     tring: true
        // },
        // placementModifier: {
        //     type: Number,
        //     default: 0,
        // },
        tactic: {
            type: String,
            trim: true,
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
module.exports = new mongoose.model("sdCampaign", sdCampaignSchema);
