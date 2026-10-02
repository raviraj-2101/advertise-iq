const mongoose = require("mongoose");
const orderBuyerInfoSchema = new mongoose.Schema(
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
        BuyerEmail: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);
module.exports = new mongoose.model("orderBuyerInfo", orderBuyerInfoSchema);
