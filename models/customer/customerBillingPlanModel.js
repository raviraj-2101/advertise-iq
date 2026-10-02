const mongoose = require('mongoose');

const customerPlanSchema = new mongoose.Schema(
    {
        planName: {
            type: String,
            required: true,
            enum: [
                "Trial",
                "Starter",
                "Business",
                "Professional",
                "Premium"
            ],
        },
        planType: {
            type: String,
            required: true,
            enum: ['Monthly', 'Yearly', 'Trial'],
        },
        features: {
            type: [String],
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        defaultPrice: {
            type: Number,
            required: true,
        },
        days: {
            type: Number,
            required: true,
        },
        order: {
            type: Number,
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = new mongoose.model("billing_plan", customerPlanSchema);