const { types } = require("joi");
const mongoose = require("mongoose");

const superAdminCompanySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },
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

module.exports = new mongoose.model("super_admin_companies", superAdminCompanySchema);
