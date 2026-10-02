const mongoose = require("mongoose");
const sdAdGroupSchema = new mongoose.Schema(
    {
        profileId: {
            type: Number,
            trim: true,
        },
        currencyCode: {
            type: String,
            trim: true,
        },
        campaignId: {
            type: Number,
            trim: true,
        },
        // type: {
        //     type: String,
        //     trim: true,
        // },
        adGroupId: {
            type: Number,
            trim: true,
        },
        bidOptimization: {
            type: String,
            trim: true,
            default: null,
        },
        creativeType: {
            type: String,
            trim: true,
            default: null,
        },
        name: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            trim: true,
        },
        reportDate: {
            type: String,
            trim: true,
        },
        costType: {
            type: String,
            trim: true,
            default: null,
        },
        clicks: {
            type: Number,
            trim: true,
            default: 0,
        },
        spend: {
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
        impressions: {
            type: Number,
            trim: true,
            default: 0,
        },
        timezone: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);
module.exports = new mongoose.model("sdAdGroup", sdAdGroupSchema);
