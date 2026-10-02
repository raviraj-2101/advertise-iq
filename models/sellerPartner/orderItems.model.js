const mongoose = require("mongoose");
const orderItemsSchema = new mongoose.Schema(
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
        items: [
            {
                ProductInfo: {
                    NumberOfItems: {
                        type: Number,
                        trim: true,
                    },
                },
                ASIN: {
                    type: String,
                    trim: true,
                },
                SellerSKU: {
                    type: String,
                    trim: true,
                },
                Title: {
                    type: String,
                    trim: true,
                },
                QuantityOrdered: {
                    type: Number,
                    trim: true,
                },
                OrderItemId: {
                    type: String,
                    trim: true,
                },
                QuantityShipped: {
                    type: Number,
                    trim: true,
                },
                ItemTax: {
                    CurrencyCode: {
                        type: String,
                        trim: true,
                    },
                    Amount: {
                        type: String,
                        trim: true,
                    },
                },
                ItemPrice: {
                    CurrencyCode: {
                        type: String,
                        trim: true,
                    },
                    Amount: {
                        type: String,
                        trim: true,
                    },
                },
                PromotionDiscountTax: {
                    CurrencyCode: {
                        type: String,
                        trim: true,
                    },
                    Amount: {
                        type: String,
                        trim: true,
                    },
                },
                PromotionDiscount: {
                    CurrencyCode: {
                        type: String,
                        trim: true,
                    },
                    Amount: {
                        type: String,
                        trim: true,
                    },
                },
                IsGift: {
                    type: String,
                    trim: true,
                },
                IsTransparency: {
                    type: Boolean,
                    trim: true,
                },
            },
        ],
    },
    { timestamps: true }
);
module.exports = new mongoose.model("orderItem", orderItemsSchema);
