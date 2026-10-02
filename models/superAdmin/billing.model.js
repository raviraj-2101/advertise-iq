const mongoose = require("mongoose");

const billingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "customer",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "customer_companies",
    },
    referenceCode: {
      type: String,
      trim: true,
    },
    planPrice: {
      type: String,
      trim: true,
    },
    planFrequency: {
      type: String,
      trim: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "billing_plans",
    },
    isConfirmed: {
      type: Boolean,
      default: false,
    },
    previousReference: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    nextReference: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    subscriptionNumber: {
      type: String,
      default: null,
      trim: true,
    },
    orderNumber: {
      type: String,
      default: null,
      trim: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
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
  },
  {
    timestamps: true,
  }
);

module.exports = new mongoose.model("billings", billingSchema);
