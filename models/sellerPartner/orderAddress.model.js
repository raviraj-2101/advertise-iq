const mongoose = require("mongoose");
const orderAddressSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "customer_companies",
        },
        profileId: {
            type: Number,
            trim: true,
        },
        amazonOrderId: {
            type: String,
            trim: true,
        },
        ShippingAddress: {
            StateOrRegion: {
                type: String,
                trim: true,
            },
            PostalCode: {
                type: String,
                trim: true,
            },
            City: {
                type: String,
                trim: true,
            },
            CountryCode: {
                type: String,
                trim: true,
            },
            Name: {
                type: String,
                trim: true,
            },
        },
    },
    { timestamps: true }
);
module.exports = new mongoose.model("orderAddress", orderAddressSchema);
