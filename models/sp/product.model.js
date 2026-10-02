const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "customer_companies",
        },
        profileId: {
            type: Number,
            trim: true,
        },

        asin: {
            type: String,
            trim: true,
        },
        availability: {
            type: String,
            trim: true,
        },
        brand: {
            type: String,
            trim: true,
        },
        eligibilityStatus: {
            type: String,
            trim: true,
        },
        imageUrl: {
            type: String,
            trim: true,
        },
        amount: {
            type: Number,
            trim: true,
        },
        sku: {
            type: String,
            trim: true,
        },
        title: {
            type: String,
            trim: true,
        },
        type: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            trim: true,
        },
        bestSellerRank: {
            type: String,
            trim: true,
        },
        createdDate:{
            type: Date
        }
    },
    { timestamps: true }
);
module.exports = new mongoose.model("spProduct", productSchema);
