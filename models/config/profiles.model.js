const mongoose = require("mongoose");

const CustomMap = new mongoose.Schema({ _id: false }, { strict: false });
const profileSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "customer_companies",
        },
        profileId: {
            type: Number,
            trim: true,
        },
        countryCode: {
            type: String,
            trim: true,
        },
        currencyCode: {
            type: String,
            trim: true,
        },
        timezone: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: false
        },
        marketplaceStringId: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            trim: true,
        },
        limit: {
            type: CustomMap
        }
    },
    { timestamps: true }
);
module.exports = new mongoose.model("profile", profileSchema);
