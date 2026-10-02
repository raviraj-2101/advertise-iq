const mongoose = require("mongoose");

const superAdminSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
        },
        mobileNumber: {
            type: String,
            trim: true,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: 'super_admin_companies'
        },
        isAdmin: {
            type: Boolean,
            default: false
        },
        password: {
            type: String,
            trim: true,
        },
        language: {
            type: String,
            trim: true,
            default: 'en'
        },
        status: {
            type: Boolean,
            default: false
        },
        profileImage: {
            type: String,
            default: null
        },
        isDelete: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: 'super_admin'
        },
        isVerifyEmail: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = new mongoose.model("super_admin", superAdminSchema);
