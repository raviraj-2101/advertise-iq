const mongoose = require("mongoose");

const CustomMap = new mongoose.Schema({ _id: false }, { strict: false });
const portfolioSchema = new mongoose.Schema(
    {
        profileId: {
            type: String,
            required: true,
        },
        portfolioId: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
        },
        inBudget: {
            type: Boolean,
            required: true
        },
        currencyCode: {
            type: String
        },
        policy: {
            type: String
        }
    },
    { timestamps: true }
);
module.exports = new mongoose.model("portfolio", portfolioSchema);
