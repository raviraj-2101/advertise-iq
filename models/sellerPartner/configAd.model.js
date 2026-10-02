const mongoose = require("mongoose");
const sellerConfigAdsSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "customer_companies",
        },
        profileId: {
            type: Number,
            trim: true,
        },
        sellerAccessToken: {
            type: String,
            trim: true,
        },
        sellerRefreshToken: {
            type: String,
            trim: true,
        },
        sellerTokenExpire: {
            type: Number,
            trim: true,
        },
        baseUrl: {
            type: String,
            trim: true,
        },
        sellerClientId: {
            type: String,
            trim: true,
        },
        sellerClientSecret: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);
module.exports = new mongoose.model("sellerConfigAds", sellerConfigAdsSchema);
