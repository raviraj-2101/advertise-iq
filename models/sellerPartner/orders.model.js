const mongoose = require("mongoose");
const ordersSchema = new mongoose.Schema(
    {
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "customer_companies",
        },
        profileId: {
            type: Number,
            trim: true,
        },
        buyerInfo: {
            type: mongoose.Schema.Types.Mixed,
            trim: true,
        },
        amazonOrderId: {
            type: String,
            trim: true,
        },
        earliestDeliveryDate: {
            type: Date,
            trim: true,
        },
        earliestShipDate: {
            type: Date,
            trim: true,
        },
        salesChannel: {
            type: String,
            trim: true,
        },
        automatedShippingSettings: {
            type: mongoose.Schema.Types.Mixed,
            trim: true,
        },
        orderStatus: {
            type: String,
            trim: true,
        },
        numberOfItemsShipped: {
            type: Number,
            trim: true,
        },
        orderType: {
            type: String,
            trim: true,
        },
        isPremiumOrder: {
            type: Boolean,
            trim: true,
        },
        isPrime: {
            type: Boolean,
            trim: true,
        },
        fulfillmentChannel: {
            type: String,
            trim: true,
        },
        numberOfItemsUnshipped: {
            type: Number,
            trim: true,
        },
        hasRegulatedItems: {
            type: Boolean,
            trim: true,
        },
        isReplacementOrder: {
            type: Boolean,
            trim: true,
        },
        isSoldByAB: {
            type: Boolean,
            trim: true,
        },
        latestShipDate: {
            type: Date,
            trim: true,
        },
        shipServiceLevel: {
            type: String,
            trim: true,
        },
        defaultShipFromLocationAddress: {
            type: mongoose.Schema.Types.Mixed,
            trim: true,
        },
        isISPU: {
            type: Boolean,
            trim: true,
        },
        marketplaceId: {
            type: String,
            trim: true,
        },
        latestDeliveryDate: {
            type: Date,
            trim: true,
        },
        purchaseDate: {
            type: Date,
            trim: true,
        },
        shippingAddress: {
            type: mongoose.Schema.Types.Mixed,
            trim: true,
        },
        isAccessPointOrder: {
            type: Boolean,
            trim: true,
        },
        paymentMethod: {
            type: String,
            trim: true,
        },
        isBusinessOrder: {
            type: Boolean,
            trim: true,
        },
        orderTotal: {
            type: mongoose.Schema.Types.Mixed,
            trim: true,
        },
        paymentMethodDetails: {
            type: Array,
            trim: true,
        },
        isGlobalExpressEnabled: {
            type: Boolean,
            trim: true,
        },
        lastUpdateDate: {
            type: Date,
            trim: true,
        },
        shipmentServiceLevelCategory: {
            type: String,
            trim: true,
        },
        orderItems: {
            type: mongoose.Schema.Types.Mixed,
            trim: true,
        },
    },
    { timestamps: true }
);
module.exports = new mongoose.model("order", ordersSchema);
