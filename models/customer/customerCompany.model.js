const mongoose = require("mongoose");

const customerCompanySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: "customers",
        },
        isPlanActive: {
            type: Boolean,
            default: false,
        },
        // When user said payment comfirmed by customer
        isPaymentConfirmed: {
            type: Boolean,
            default: false,
        },
        subscriptionStartDate: {
            type: Date,
            default: null,
        },
        subscriptionEndDate: {
            type: Date,
            default: null,
        },
        nextPaymentDate: {
            type: Date,
            default: null,
        },
        subscriptionMetaData: {
            type: Object,
            default: null,
        },
        isFirstTimePayer: {
            type: Boolean,
            default: true,
        },
        // Use for free trial
        isFreeTrailPurchased: {
            type: Boolean,
            default: false,
        },
        isFreeTrailExpired: {
            type: Boolean,
            default: false,
        },
        // company Information
        profileImage: {
            type: String,
            default: null
        },
        legalForm: {
            type: String,
            trim: true,
            default: null
        },
        email: {
            type: String,
            trim: true,
            default: null
        },
        inhaber: {
            type: String,
            trim: true,
            default: null
        },
        website: {
            type: String,
            trim: true,
            default: null
        },
        faxNumber: {
            type: String,
            trim: true,
            default: null
        },
        amtgericht: {
            type: String,
            trim: true,
            default: null
        },

        taxNumber: {
            type: String,
            trim: true,
            unique: true,
            default: null
        },
        geschaftsfuhrer1: {
            type: String,
            trim: true,
            default: null
        },
        vatIdentificationNumber: {
            type: String,
            trim: true,
            unique: true,
            default: null
        },
        geschaftsfuhrer: {
            type: Array,
            default: []
        },
        hrbNumber: {
            type: String,
            trim: true,
            unique: true,
            default: null
        },
        mobileNumber: {
            type: String,
            trim: true,
            default: null
        },
        country: {
            type: String,
            trim: true,
            default: null
        },
        address: {
            streetNo: { type: String, trim: true, default: null },
            city: { type: String, trim: true, default: null },
            pincode: { type: Number, trim: true, default: null },
        },
        bankInformation: {
            bank: { type: String, trim: true, default: null },
            iban: { type: String, trim: true, unique: true, default: null },
            bic: { type: String, trim: true, default: null }
        },
    },
    {
        timestamps: true,
    }
);

module.exports = new mongoose.model("customer_companies", customerCompanySchema);
