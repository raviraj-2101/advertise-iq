const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
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
      ref: "customer_companies",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
      default: "en",
    },
    // Active , InAcvtive & waiting for approval
    status: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: null,
    },
    // Soft Delete
    isDelete: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "customers",
    },
    referenceCode: {
      type: String,
      required: true,
    },
    // Email verification
    isVerifyEmail: {
      type: Boolean,
      default: false,
    },
    isAutoPayment: {
      type: Boolean,
      default: true,
    },
    customerId: {
      type: String,
      default: null
    },
  },
  {
    timestamps: true,
  }
);

module.exports = new mongoose.model("customers", customerSchema);
