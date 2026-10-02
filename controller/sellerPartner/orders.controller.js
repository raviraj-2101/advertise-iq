const request = require("request");
const ordersSchema = require("../../models/sellerPartner/orders.model");
const sellerConfigAdsSchema = require("../../models/sellerPartner/configAd.model");
const {
    cronGetSellerAccessToken,
    checkPermission,
} = require("../../common/helper");
const orderItemsSchema = require("../../models/sellerPartner/orderItems.model");
const orderAddressSchema = require("../../models/sellerPartner/orderAddress.model");
const orderBuyerInfoSchema = require("../../models/sellerPartner/orderBuyerInfo.model");
const {
    write_logs,
} = require("../../winston/orders/logger");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const allMarketplaceIds =
    "A2EUQ1WTGCTBG2,ATVPDKIKX0DER,A1AM78C64UM0Y8,A2Q3Y263D00KWC,A1RKKUPIHCS9HS,A1F83G8C2ARO7P,A13V1IB3VIYZZH,AMEN7PMS3EDWL,A1805IZSGTT6HS,A1PA6795UKMFR9,APJ6JRA9NG5V4,A2NODRKZP88ZB9,AE08WJ6YKNBMC,A1C3SOZRARQ6R3,ARBP9OOSHTCHU,A33AVAJ2PDY3EV,A17E79C6D8DWNP,A2VIGQ35RCS4UG,A21TJRUUN4KGV,A19VAU5U5O7RUS,A39IBJ37TRP1C6,A1VC38T7YXB528";

exports.cronJobOrdersFromSeller = async () => {
    try {
        write_logs({
            message: `Cron call ==> cronJobOrdersFromSeller`,
            log_type: "info",
        });
        // if (mongoose.connection.readyState !== 1) {
        //     // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        //     return write_logs({
        //         message: `MongoDB not connected : ${mongoose.connection.readyState}`,
        //         log_type: "error",
        //     });
        // }
        const getSeller = await sellerConfigAdsSchema.find();
        write_logs({
            message: `getSeller : ${getSeller.length}`,
            log_type: "info",
        });
        if (getSeller.length > 0) {
            write_logs({
                message: `IF getSeller: ${getSeller.length}`,
                log_type: "info",
            });
            await Promise.all(
                getSeller.map(async (seller) => {
                    const companyId = seller.companyId;
                    const profileId = seller.profileId;
                    const profileData = await profileSchema.findOne({ profileId: profileId });
                    const orderDate = moment().tz(profileData.timezone).format("YYYY-MM-DD");
                    const getOrders = await getOrdersFromSeller(
                        companyId,
                        seller,
                        orderDate
                    );
                    if (getOrders.length > 0) {
                        await Promise.all(
                            getOrders.map(async (item) => {
                                const getOrder = await ordersSchema.findOne({
                                    companyId: item.companyId,
                                    amazonOrderId: item.amazonOrderId,
                                });
                                if (!getOrder) {
                                    let createOrder = new ordersSchema(item);
                                    await createOrder.save();
                                    return write_logs({
                                        message: `CompanyId ${companyId} ProfileId ${profileId} AmazonOrderId ${item.amazonOrderId} Order created Successfully`,
                                        log_type: "info",
                                    });
                                } else {
                                    await ordersSchema.findByIdAndUpdate(
                                        { _id: getOrder._id },
                                        item,
                                        { new: true }
                                    );
                                    return write_logs({
                                        message: `CompanyId ${companyId} ProfileId ${profileId} AmazonOrderId ${item.amazonOrderId} Order updated Successfully`,
                                        log_type: "info",
                                    });
                                }
                            })
                        );
                    }
                })
            );
        }
    } catch (error) {
        return write_logs({
            message: `Catch Error: ${JSON.stringify(error)}`,
            log_type: "error",
        });
    }
};

async function getOrdersFromSeller(companyId, checkConfigAds, orderDate) {
    return new Promise((resolve, reject) => {
        let qsObj = {
            MarketplaceIds: allMarketplaceIds,
            CreatedAfter: orderDate,
        };
        const orderOptions = {
            method: "GET",
            url: `${checkConfigAds.baseUrl}/orders/v0/orders`,
            headers: {
                "x-amz-access-token": checkConfigAds.sellerAccessToken,
            },
        };
        const orders = [];
        let NextToken = "";
        async function makeRequest() {
            if (NextToken) {
                qsObj.NextToken = NextToken;
            }
            orderOptions.qs = qsObj;
            try {
                const response = await new Promise((resolve, reject) => {
                    request(orderOptions, (error, response, body) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve({ body });
                        }
                    });
                });
                const body = JSON.parse(response.body);
                if (body.errors) {
                    console.log("body error", body.error);
                    resolve(orders);
                } else if (body.payload.Orders.length > 0) {
                    for (const item of body.payload.Orders) {
                        let obj = {
                            companyId,
                            profileId: checkConfigAds.profileId,
                            buyerInfo: item.BuyerInfo.BuyerEmail
                                ? item.BuyerInfo
                                : { BuyerEmail: "" },
                            amazonOrderId: item.AmazonOrderId ? item.AmazonOrderId : null,
                            earliestDeliveryDate: item.EarliestDeliveryDate
                                ? item.EarliestDeliveryDate
                                : null,
                            earliestShipDate: item.EarliestShipDate
                                ? item.EarliestShipDate
                                : null,
                            salesChannel: item.SalesChannel ? item.SalesChannel : null,
                            automatedShippingSettings: item.AutomatedShippingSettings
                                ? item.AutomatedShippingSettings
                                : null,
                            orderStatus: item.OrderStatus ? item.OrderStatus : null,
                            numberOfItemsShipped: item.NumberOfItemsShipped,
                            orderType: item.OrderType ? item.OrderType : null,
                            isPremiumOrder: item.IsPremiumOrder,
                            isPrime: item.IsPrime,
                            fulfillmentChannel: item.FulfillmentChannel
                                ? item.FulfillmentChannel
                                : null,
                            numberOfItemsUnshipped: item.NumberOfItemsUnshipped,
                            hasRegulatedItems: item.HasRegulatedItems,
                            isReplacementOrder: item.IsReplacementOrder
                                ? item.IsReplacementOrder
                                : null,
                            isSoldByAB: item.IsSoldByAB,
                            latestShipDate: item.LatestShipDate ? item.LatestShipDate : null,
                            shipServiceLevel: item.ShipServiceLevel
                                ? item.ShipServiceLevel
                                : null,
                            defaultShipFromLocationAddress:
                                item.DefaultShipFromLocationAddress
                                    ? item.DefaultShipFromLocationAddress
                                    : null,
                            isISPU: item.IsISPU,
                            marketplaceId: item.MarketplaceId ? item.MarketplaceId : null,
                            latestDeliveryDate: item.LatestDeliveryDate
                                ? item.LatestDeliveryDate
                                : "",
                            purchaseDate: item.PurchaseDate ? item.PurchaseDate : null,
                            shippingAddress: item.ShippingAddress
                                ? item.ShippingAddress
                                : {
                                    StateOrRegion: "",
                                    PostalCode: "",
                                    City: "",
                                    CountryCode: "",
                                },
                            isAccessPointOrder: item.IsAccessPointOrder,
                            paymentMethod: item.PaymentMethod ? item.PaymentMethod : null,
                            isBusinessOrder: item.IsBusinessOrder,
                            orderTotal: item.OrderTotal
                                ? item.OrderTotal
                                : { CurrencyCode: "", Amount: 0 },
                            paymentMethodDetails: item.PaymentMethodDetails
                                ? item.PaymentMethodDetails
                                : null,
                            isGlobalExpressEnabled: item.IsGlobalExpressEnabled,
                            lastUpdateDate: item.LastUpdateDate ? item.LastUpdateDate : null,
                            shipmentServiceLevelCategory: item.ShipmentServiceLevelCategory
                                ? item.ShipmentServiceLevelCategory
                                : null,
                        };
                        orders.push(obj);
                    }
                    NextToken = body.payload.NextToken;
                    if (NextToken) {
                        console.log("before call", orders.length);
                        await sleep(20000);
                        console.log("after call");
                        await makeRequest();
                        console.log("calling function", orders.length);
                    } else {
                        resolve(orders);
                    }
                } else {
                    resolve(orders);
                }
            } catch (error) {
                console.log(error, "error");
                resolve(orders);
            }
        }
        makeRequest();
    });
}

exports.cronJobOrderItemFromSeller = async () => {
    try {
        write_logs({
            message: `Cron call ==> cronJobOrderItemFromSeller`,
            log_type: "info",
        });
        // if (mongoose.connection.readyState !== 1) {
        //     // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        //     return write_logs({
        //         message: `MongoDB not connected : ${mongoose.connection.readyState}`,
        //         log_type: "error",
        //     });
        // }
        const getSeller = await sellerConfigAdsSchema.find();
        write_logs({
            message: `getSeller : ${getSeller.length}`,
            log_type: "info",
        });
        if (getSeller.length > 0) {
            write_logs({
                message: `IF getSeller: ${getSeller.length}`,
                log_type: "info",
            });
            await Promise.all(
                getSeller.map(async (seller) => {
                    const companyId = seller.companyId;
                    const profileId = seller.profileId;
                    let filter = { companyId, profileId };
                    const getOrderIds = await orderItemsSchema.find(filter, {
                        amazonOrderId: 1,
                        _id: 0,
                    });

                    if (getOrderIds.length > 0) {
                        const orderIdsArray = getOrderIds.map(
                            (order) => order.amazonOrderId
                        );
                        filter.amazonOrderId = {
                            $nin: orderIdsArray,
                        };
                    }
                    const orders = await ordersSchema.find(filter).limit(10);
                    if (orders.length > 0) {
                        const orderItems = [];
                        await Promise.all(
                            orders.map(async (order) => {
                                const orderOptions = {
                                    method: "GET",
                                    url: `${seller.baseUrl}/orders/v0/orders/${order.amazonOrderId}/orderItems`,
                                    headers: {
                                        "x-amz-access-token": seller.sellerAccessToken,
                                    },
                                    qs: {
                                        MarketplaceIds: order.marketplaceId,
                                    },
                                };
                                const response = await new Promise((resolve, reject) => {
                                    request(orderOptions, (error, response, body) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            resolve({ body });
                                        }
                                    });
                                });
                                const body = JSON.parse(response.body);
                                if (body.errors) {
                                    write_logs({
                                        message: `Response Error: ${order.amazonOrderId
                                            } ${JSON.stringify(body.errors)}`,
                                        log_type: "error",
                                    });
                                    return orderItems;
                                } else if (body.payload.OrderItems.length > 0) {
                                    write_logs({
                                        message: `Response: ${JSON.stringify(body.payload)}`,
                                        log_type: "info",
                                    });
                                    const obj = {
                                        companyId: order.companyId,
                                        profileId: order.profileId,
                                        amazonOrderId: order.amazonOrderId,
                                        items: body.payload.OrderItems,
                                    };
                                    orderItems.push(obj);
                                }
                            })
                        );
                        if (orderItems.length > 0) {
                            await Promise.all(
                                orderItems.map(async (item) => {
                                    const getOrderItems = await orderItemsSchema.findOne({
                                        companyId: item.companyId,
                                        amazonOrderId: item.amazonOrderId,
                                    });
                                    if (!getOrderItems) {
                                        let createItems = new orderItemsSchema(item);
                                        await createItems.save();
                                    } else {
                                        await orderItemsSchema.findByIdAndUpdate(
                                            { _id: getOrderItems._id },
                                            item,
                                            {
                                                new: true,
                                            }
                                        );
                                    }
                                    return write_logs({
                                        message: `AmazonOrderId ${item.amazonOrderId} Order items retrieved successfully`,
                                        log_type: "info",
                                    });
                                })
                            );
                        }
                    }
                })
            );
        }
    } catch (error) {
        return write_logs({
            message: `Catch Error: ${JSON.stringify(error)}`,
            log_type: "error",
        });
    }
};

exports.cronJobOrderBuyerInfoFromSeller = async () => {
    try {
        write_logs({
            message: `Cron call ==> cronJobOrderBuyerInfoFromSeller`,
            log_type: "info",
        });
        //   if (mongoose.connection.readyState !== 1) {
        //     // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        //     return write_logs({
        //       message: `MongoDB not connected : ${mongoose.connection.readyState}`,
        //       log_type: "error",
        //     });
        //   }
        const getSeller = await sellerConfigAdsSchema.find();
        write_logs({
            message: `getSeller : ${getSeller.length}`,
            log_type: "info",
        });
        if (getSeller.length > 0) {
            write_logs({
                message: `IF getSeller: ${getSeller.length}`,
                log_type: "info",
            });
            await Promise.all(
                getSeller.map(async (seller) => {
                    const companyId = seller.companyId;
                    const profileId = seller.profileId;
                    let filter = { companyId, profileId };
                    const getOrderIds = await orderBuyerInfoSchema.find(filter, {
                        amazonOrderId: 1,
                        _id: 0,
                    });
                    if (getOrderIds.length > 0) {
                        const orderIdsArray = getOrderIds.map(
                            (order) => order.amazonOrderId
                        );
                        filter.amazonOrderId = {
                            $nin: orderIdsArray,
                        };
                    }
                    filter.orderStatus = ["Shipped", "Unshipped"];
                    const orders = await ordersSchema.find(filter).limit(10);
                    if (orders.length > 0) {
                        const orderBuyer = [];
                        await Promise.all(
                            orders.map(async (order) => {
                                const orderOptions = {
                                    method: "GET",
                                    url: `${seller.baseUrl}/orders/v0/orders/${order.amazonOrderId}/buyerInfo`,
                                    headers: {
                                        "x-amz-access-token": seller.sellerAccessToken,
                                    },
                                };
                                const response = await new Promise((resolve, reject) => {
                                    request(orderOptions, (error, response, body) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            resolve({ body });
                                        }
                                    });
                                });
                                const body = JSON.parse(response.body);
                                if (body.errors) {
                                    write_logs({
                                        message: `Response Error: ${order.amazonOrderId
                                            } ${JSON.stringify(body.errors)}`,
                                        log_type: "error",
                                    });
                                    return orderBuyer;
                                } else if (body.payload) {
                                    const obj = {
                                        companyId: order.companyId,
                                        profileId: order.profileId,
                                        amazonOrderId: body.payload.AmazonOrderId,
                                        BuyerEmail: body.payload.BuyerEmail,
                                    };
                                    orderBuyer.push(obj);
                                }
                            })
                        );
                        if (orderBuyer.length > 0) {
                            await Promise.all(
                                orderBuyer.map(async (item) => {
                                    const getOrderBuyer = await orderBuyerInfoSchema.findOne({
                                        companyId: item.companyId,
                                        amazonOrderId: item.amazonOrderId,
                                    });
                                    if (!getOrderBuyer) {
                                        let createItems = new orderBuyerInfoSchema(item);
                                        await createItems.save();
                                    } else {
                                        await orderBuyerInfoSchema.findByIdAndUpdate(
                                            { _id: getOrderBuyer._id },
                                            item,
                                            {
                                                new: true,
                                            }
                                        );
                                    }
                                    return write_logs({
                                        message: `AmazonOrderId ${item.amazonOrderId} Order Buyer Info retrieved successfully`,
                                        log_type: "info",
                                    });
                                })
                            );
                        }
                    }
                })
            );
        }
    } catch (error) {
        return write_logs({
            message: `Catch Error: ${JSON.stringify(error)}`,
            log_type: "error",
        });
    }
};

exports.cronJobOrderAddressFromSeller = async () => {
    try {
        write_logs({
            message: `Cron call ==> cronJobOrderAddressFromSeller`,
            log_type: "info",
        });
        // if (mongoose.connection.readyState !== 1) {
        //     // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        //     return write_logs({
        //         message: `MongoDB not connected : ${mongoose.connection.readyState}`,
        //         log_type: "error",
        //     });
        // }
        const getSeller = await sellerConfigAdsSchema.find();
        write_logs({
            message: `getSeller : ${getSeller.length}`,
            log_type: "info",
        });
        if (getSeller.length > 0) {
            write_logs({
                message: `IF getSeller: ${getSeller.length}`,
                log_type: "info",
            });
            await Promise.all(
                getSeller.map(async (seller) => {
                    const companyId = seller.companyId;
                    const profileId = seller.profileId;
                    let filter = { companyId, profileId };
                    const getOrderIds = await orderAddressSchema.find(filter, {
                        amazonOrderId: 1,
                        _id: 0,
                    });
                    if (getOrderIds.length > 0) {
                        const orderIdsArray = getOrderIds.map(
                            (order) => order.amazonOrderId
                        );
                        filter.amazonOrderId = {
                            $nin: orderIdsArray,
                        };
                    }
                    filter.orderStatus = ["Shipped", "Unshipped"];
                    const orders = await ordersSchema.find(filter).limit(10);
                    if (orders.length > 0) {
                        const orderAddress = [];
                        await Promise.all(
                            orders.map(async (order) => {
                                const orderOptions = {
                                    method: "GET",
                                    url: `${seller.baseUrl}/orders/v0/orders/${order.amazonOrderId}/address`,
                                    headers: {
                                        "x-amz-access-token": seller.sellerAccessToken,
                                    },
                                };
                                const response = await new Promise((resolve, reject) => {
                                    request(orderOptions, (error, response, body) => {
                                        if (error) {
                                            reject(error);
                                        } else {
                                            resolve({ body });
                                        }
                                    });
                                });
                                const body = JSON.parse(response.body);
                                if (body.errors) {
                                    write_logs({
                                        message: `Response Error: AmazonOrderId ${order.amazonOrderId
                                            } ${JSON.stringify(body.errors)}`,
                                        log_type: "error",
                                    });
                                    return orderAddress;
                                } else if (body.payload) {
                                    const obj = {
                                        companyId: order.companyId,
                                        profileId: order.profileId,
                                        amazonOrderId: body.payload.AmazonOrderId,
                                        ShippingAddress: body.payload.ShippingAddress,
                                    };
                                    orderAddress.push(obj);
                                }
                            })
                        );
                        if (orderAddress.length > 0) {
                            await Promise.all(
                                orderAddress.map(async (item) => {
                                    const getOrderAddress = await orderAddressSchema.findOne({
                                        companyId: item.companyId,
                                        amazonOrderId: item.amazonOrderId,
                                    });
                                    if (!getOrderAddress) {
                                        let createItems = new orderAddressSchema(item);
                                        await createItems.save();
                                    } else {
                                        await orderAddressSchema.findByIdAndUpdate(
                                            { _id: getOrderAddress._id },
                                            item,
                                            {
                                                new: true,
                                            }
                                        );
                                    }
                                    return write_logs({
                                        message: `AmazonOrderId ${item.amazonOrderId} Order Address retrieved successfully`,
                                        log_type: "info",
                                    });
                                })
                            );
                        }
                    }
                })
            );
        }
    } catch (error) {
        return write_logs({
            message: `Catch Error: ${JSON.stringify(error)}`,
            log_type: "error",
        });
    }
};

exports.getOrdersFromSeller = async (req, res) => {
    try {
        const companyId = req.user.company;
        const { profileId, orderDate } = req.body;
        const checkConfigAds = await cronGetSellerAccessToken(
            companyId,
            profileId
        );
        if (checkConfigAds && checkConfigAds.sellerAccessToken) {
            const getOrdersData = await getOrdersFromSeller(
                companyId,
                checkConfigAds,
                orderDate
            );
            if (getOrdersData.length > 0) {
                await Promise.all(
                    getOrdersData.map(async (item) => {
                        const getOrder = await ordersSchema.findOne({
                            companyId: item.companyId,
                            amazonOrderId: item.amazonOrderId,
                        });
                        if (!getOrder) {
                            let createOrder = new ordersSchema(item);
                            await createOrder.save();
                        } else {
                            await ordersSchema.findByIdAndUpdate(
                                { _id: getOrder._id },
                                item,
                                { new: true }
                            );
                        }
                    })
                );
            }
        }
        const getOrders = await ordersSchema.find({ companyId, profileId });
        const totalRecords = await ordersSchema.countDocuments({ companyId, profileId });
        return res.status(200).send({
            isSuccess: true,
            message: "Orders listing successfully.",
            totalRecords: totalRecords,
            data: getOrders,
        });
    } catch (error) {
        return res.status(203).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

exports.getOrderItemsFromSeller = async (req, res) => {
    try {
        const companyId = req.user.company;
        const { profileId } = req.body;
        const checkConfigAds = await cronGetSellerAccessToken(
            companyId,
            profileId
        );
        if (checkConfigAds && checkConfigAds.sellerAccessToken) {
            const getOrderIds = await orderItemsSchema.find(
                {
                    companyId,
                    profileId,
                },
                { amazonOrderId: 1, _id: 0 }
            );
            let filter = { companyId, profileId };
            if (getOrderIds.length > 0) {
                const orderIdsArray = getOrderIds.map((order) => order.amazonOrderId);
                filter.amazonOrderId = {
                    $nin: orderIdsArray,
                };
            }
            const orders = await ordersSchema.find(filter).limit(10);
            if (orders.length > 0) {
                const orderItems = [];
                await Promise.all(
                    orders.map(async (order) => {
                        const orderOptions = {
                            method: "GET",
                            url: `${checkConfigAds.baseUrl}/orders/v0/orders/${order.amazonOrderId}/orderItems`,
                            headers: {
                                "x-amz-access-token": checkConfigAds.sellerAccessToken,
                            },
                            qs: {
                                MarketplaceIds: order.marketplaceId,
                            },
                        };
                        const response = await new Promise((resolve, reject) => {
                            request(orderOptions, (error, response, body) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve({ body });
                                }
                            });
                        });
                        console.log(response);
                        const body = JSON.parse(response.body);
                        if (body.errors) {
                            console.log(order.amazonOrderId, body.errors);
                            return orderItems;
                        } else if (body.payload.OrderItems.length > 0) {
                            const obj = {
                                companyId: order.companyId,
                                profileId: order.profileId,
                                amazonOrderId: order.amazonOrderId,
                                items: body.payload.OrderItems,
                            };
                            orderItems.push(obj);
                        }
                    })
                );
                if (orderItems.length) {
                    await Promise.all(
                        orderItems.map(async (item) => {
                            const getOrderItems = await orderItemsSchema.findOne({
                                companyId: item.companyId,
                                amazonOrderId: item.amazonOrderId,
                            });
                            if (!getOrderItems) {
                                let createItems = new orderItemsSchema(item);
                                await createItems.save();
                            } else {
                                await orderItemsSchema.findByIdAndUpdate(
                                    { _id: getOrderItems._id },
                                    item,
                                    {
                                        new: true,
                                    }
                                );
                            }
                        })
                    );
                }
            }
            return res.status(200).json({
                isSuccess: true,
                message: "Order items retrieved successfully",
            });
        }
    } catch (error) {
        return res.status(203).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

exports.getOrderBuyerInfoFromSeller = async (req, res) => {
    try {
        const companyId = req.user.company;
        const { profileId } = req.body;
        const checkConfigAds = await cronGetSellerAccessToken(
            companyId,
            profileId
        );
        if (checkConfigAds && checkConfigAds.sellerAccessToken) {
            const getOrderIds = await orderBuyerInfoSchema.find(
                {
                    companyId,
                    profileId,
                },
                { amazonOrderId: 1, _id: 0 }
            );
            let filter = { companyId, profileId };
            if (getOrderIds.length > 0) {
                const orderIdsArray = getOrderIds.map((order) => order.amazonOrderId);
                filter.amazonOrderId = {
                    $nin: orderIdsArray,
                };
            }
            filter.orderStatus = ["Shipped", "Unshipped"];
            const orders = await ordersSchema.find(filter).limit(10);
            if (orders.length > 0) {
                const orderBuyer = [];
                await Promise.all(
                    orders.map(async (order) => {
                        const orderOptions = {
                            method: "GET",
                            url: `${checkConfigAds.baseUrl}/orders/v0/orders/${order.amazonOrderId}/buyerInfo`,
                            headers: {
                                "x-amz-access-token": checkConfigAds.sellerAccessToken,
                            },
                        };
                        const response = await new Promise((resolve, reject) => {
                            request(orderOptions, (error, response, body) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve({ body });
                                }
                            });
                        });
                        const body = JSON.parse(response.body);
                        if (body.errors) {
                            console.log(order.amazonOrderId, body.errors);
                            //console.log("before call");
                            //await sleep(20000);
                            //console.log("After call");
                            return orderBuyer;
                        } else if (body.payload) {
                            console.log(body.payload);
                            const obj = {
                                companyId: order.companyId,
                                profileId: order.profileId,
                                amazonOrderId: body.payload.AmazonOrderId,
                                BuyerEmail: body.payload.BuyerEmail,
                            };
                            orderBuyer.push(obj);
                        }
                    })
                );
                console.log(orderBuyer.length);
                if (orderBuyer.length > 0) {
                    await Promise.all(
                        orderBuyer.map(async (item) => {
                            const getOrderBuyer = await orderBuyerInfoSchema.findOne({
                                companyId: item.companyId,
                                amazonOrderId: item.amazonOrderId,
                            });
                            if (!getOrderBuyer) {
                                let createItems = new orderBuyerInfoSchema(item);
                                await createItems.save();
                            } else {
                                await orderBuyerInfoSchema.findByIdAndUpdate(
                                    { _id: getOrderBuyer._id },
                                    { $set: item },
                                    {
                                        new: true,
                                    }
                                );
                            }
                        })
                    );
                }
            }
            return res.status(200).json({
                isSuccess: true,
                message: "Order Buyer Info retrieved successfully",
            });
        }
    } catch (error) {
        return res.status(203).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

exports.getOrderAddressFromSeller = async (req, res) => {
    try {
        const companyId = req.user.company;
        const { profileId } = req.body;
        const checkConfigAds = await cronGetSellerAccessToken(
            companyId,
            profileId
        );
        if (checkConfigAds && checkConfigAds.sellerAccessToken) {
            const getOrderIds = await orderAddressSchema.find(
                {
                    companyId,
                    profileId,
                },
                { amazonOrderId: 1, _id: 0 }
            );
            let filter = { companyId, profileId };
            if (getOrderIds.length > 0) {
                const orderIdsArray = getOrderIds.map((order) => order.amazonOrderId);
                filter.amazonOrderId = {
                    $nin: orderIdsArray,
                };
            }
            filter.orderStatus = ["Shipped", "Unshipped"];
            const orders = await ordersSchema.find(filter).limit(5);
            if (orders.length > 0) {
                const orderAddress = [];
                await Promise.all(
                    orders.map(async (order) => {
                        const orderOptions = {
                            method: "GET",
                            url: `${checkConfigAds.baseUrl}/orders/v0/orders/${order.amazonOrderId}/address`,
                            headers: {
                                "x-amz-access-token": checkConfigAds.sellerAccessToken,
                            },
                        };
                        const response = await new Promise((resolve, reject) => {
                            request(orderOptions, (error, response, body) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    resolve({ body });
                                }
                            });
                        });
                        console.log(response);
                        const body = JSON.parse(response.body);
                        if (body.errors) {
                            console.log(order.amazonOrderId, body.errors);
                            //console.log("before call");
                            //await sleep(20000);
                            //console.log("After call");
                            return orderAddress;
                        } else if (body.payload) {
                            const obj = {
                                companyId: order.companyId,
                                profileId: order.profileId,
                                amazonOrderId: body.payload.AmazonOrderId,
                                ShippingAddress: body.payload.ShippingAddress,
                            };
                            orderAddress.push(obj);
                        }
                    })
                );
                console.log(orderAddress.length);
                if (orderAddress.length > 0) {
                    await Promise.all(
                        orderAddress.map(async (item) => {
                            const getOrderAddress = await orderAddressSchema.findOne({
                                companyId: item.companyId,
                                amazonOrderId: item.amazonOrderId,
                            });
                            if (!getOrderAddress) {
                                let createItems = new orderAddressSchema(item);
                                await createItems.save();
                            } else {
                                await orderAddressSchema.findByIdAndUpdate(
                                    { _id: getOrderAddress._id },
                                    item,
                                    {
                                        new: true,
                                    }
                                );
                            }
                        })
                    );
                }
            }
            return res.status(200).json({
                isSuccess: true,
                message: "Order Address retrieved successfully",
            });
        }
    } catch (error) {
        return res.status(203).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

exports.getOrderFromSeller = async (req, res) => {
    const companyId = req.user.company;
    try {
        const amazonOrderId = req.params.amazonOrderId;
        let filter = {
            companyId: new ObjectId(companyId),
            amazonOrderId,
        };
        const order = await ordersSchema.findOne(filter);
        if (!order) {
            return res.status(404).send({
                isSuccess: false,
                message: "Order not found.",
            });
        }
        const profileId = order.profileId;
        const checkConfigAds = await cronGetSellerAccessToken(
            companyId,
            profileId
        );
        if (checkConfigAds && checkConfigAds.sellerAccessToken) {
            const orderOptions = {
                method: "GET",
                url: `${checkConfigAds.baseUrl}/orders/v0/orders/${order.amazonOrderId}`,
                headers: {
                    "x-amz-access-token": checkConfigAds.sellerAccessToken,
                },
            };
            const response = await new Promise((resolve, reject) => {
                request(orderOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ body });
                    }
                });
            });
            const body = JSON.parse(response.body);
            if (body.errors) {
                console.log(order.amazonOrderId, body.errors);
                //console.log("before call");
                //await sleep(20000);
                //console.log("After call");
            } else if (body.payload) {
                const item = body.payload;
                let obj = {
                    companyId,
                    profileId: checkConfigAds.profileId,
                    buyerInfo: item.BuyerInfo.BuyerEmail
                        ? item.BuyerInfo
                        : { BuyerEmail: "" },
                    amazonOrderId: item.AmazonOrderId ? item.AmazonOrderId : null,
                    earliestDeliveryDate: item.EarliestDeliveryDate
                        ? item.EarliestDeliveryDate
                        : null,
                    earliestShipDate: item.EarliestShipDate
                        ? item.EarliestShipDate
                        : null,
                    salesChannel: item.SalesChannel ? item.SalesChannel : null,
                    automatedShippingSettings: item.AutomatedShippingSettings
                        ? item.AutomatedShippingSettings
                        : null,
                    orderStatus: item.OrderStatus ? item.OrderStatus : null,
                    numberOfItemsShipped: item.NumberOfItemsShipped,
                    orderType: item.OrderType ? item.OrderType : null,
                    isPremiumOrder: item.IsPremiumOrder,
                    isPrime: item.IsPrime,
                    fulfillmentChannel: item.FulfillmentChannel
                        ? item.FulfillmentChannel
                        : null,
                    numberOfItemsUnshipped: item.NumberOfItemsUnshipped,
                    hasRegulatedItems: item.HasRegulatedItems,
                    isReplacementOrder: item.IsReplacementOrder
                        ? item.IsReplacementOrder
                        : null,
                    isSoldByAB: item.IsSoldByAB,
                    latestShipDate: item.LatestShipDate ? item.LatestShipDate : null,
                    shipServiceLevel: item.ShipServiceLevel
                        ? item.ShipServiceLevel
                        : null,
                    defaultShipFromLocationAddress: item.DefaultShipFromLocationAddress
                        ? item.DefaultShipFromLocationAddress
                        : null,
                    isISPU: item.IsISPU,
                    marketplaceId: item.MarketplaceId ? item.MarketplaceId : null,
                    latestDeliveryDate: item.LatestDeliveryDate
                        ? item.LatestDeliveryDate
                        : "",
                    purchaseDate: item.PurchaseDate ? item.PurchaseDate : null,
                    shippingAddress: item.ShippingAddress
                        ? item.ShippingAddress
                        : {
                            StateOrRegion: "",
                            PostalCode: "",
                            City: "",
                            CountryCode: "",
                        },
                    isAccessPointOrder: item.IsAccessPointOrder,
                    paymentMethod: item.PaymentMethod ? item.PaymentMethod : null,
                    isBusinessOrder: item.IsBusinessOrder,
                    orderTotal: item.OrderTotal
                        ? item.OrderTotal
                        : { CurrencyCode: "", Amount: 0 },
                    paymentMethodDetails: item.PaymentMethodDetails
                        ? item.PaymentMethodDetails
                        : null,
                    isGlobalExpressEnabled: item.IsGlobalExpressEnabled,
                    lastUpdateDate: item.LastUpdateDate ? item.LastUpdateDate : null,
                    shipmentServiceLevelCategory: item.ShipmentServiceLevelCategory
                        ? item.ShipmentServiceLevelCategory
                        : null,
                };
                await ordersSchema.findByIdAndUpdate({ _id: order._id }, obj, {
                    new: true,
                });
            }
            return res.status(200).send({
                isSuccess: true,
                message: "Get order listing successfully.",
            });
        }
    } catch (error) {
        return res.status(203).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

exports.getOrderFromDB = async (req, res) => {
    const companyId = req.user.company;
    try {
        const amazonOrderId = req.params.amazonOrderId;
        let filter = {
            companyId: new ObjectId(companyId),
            amazonOrderId,
        };
        const order = await ordersSchema.findOne(filter);
        if (!order) {
            return res.status(404).send({
                isSuccess: false,
                message: "Order not found.",
            });
        }
        const orderItems = await orderItemsSchema.findOne(
            {
                amazonOrderId: order.amazonOrderId,
            },
            { items: 1 }
        );
        order.orderItems = orderItems ? orderItems.items : [];
        return res.status(200).send({
            isSuccess: true,
            message: "Get order listing successfully.",
            data: order,
            totalOrderItems: order.orderItems?.length,
        });
    } catch (error) {
        return res.status(203).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

exports.getOrdersFromDB = async (req, res) => {
    const companyId = req.user.company;
    try {
        const permissionResult = await checkPermission(
            companyId,
            "Orders",
            "View Only",
            true
        );
        if (!permissionResult.hasPermission) {
            return res.status(203).send({
                isSuccess: false,
                message: permissionResult.message,
            });
        }
        let { profileId, fromDate, toDate, status, pageNo, perPage } = req.body;
        if (!profileId) {
            return res
                .status(203)
                .send({ isSuccess: false, message: "Profile id required!" });
        }
        pageNo = pageNo ? pageNo : 1;
        perPage = perPage ? perPage : 10;
        let filter = {
            companyId: new ObjectId(companyId),
            profileId: Number(profileId),
        };
        if (fromDate && toDate) {
            filter.purchaseDate = {
                $gte: new Date(`${fromDate}T00:00:00Z`),
                $lte: new Date(`${toDate}T23:59:59Z`),
            };
        }
        if (status) {
            filter.orderStatus = status;
        }
        await ordersSchema
            .find(filter)
            .skip(perPage * pageNo - perPage)
            .limit(perPage)
            .sort({ _id: -1 })
            .then(async (orders) => {
                const totalRecords = await ordersSchema.countDocuments(filter);
                await Promise.all(
                    orders.map(async (order) => {
                        const orderItems = await orderItemsSchema.findOne(
                            {
                                amazonOrderId: order.amazonOrderId,
                            },
                            { items: 1 }
                        );
                        if (orderItems) {
                            order.orderItems = orderItems.items;
                        } else {
                            order.orderItems = [];
                        }
                    })
                );
                return res.status(200).send({
                    isSuccess: true,
                    message: "Orders listing successfully.",
                    currentPageNo: pageNo,
                    totalRecords: totalRecords,
                    totalPages: Math.ceil(totalRecords / perPage),
                    data: orders,
                });
            })
            .catch((error) => {
                return res.status(203).send({
                    error: error.message,
                    message: "Something went wrong, please try again!",
                    isSuccess: false,
                });
            });
    } catch (error) {
        return res.status(203).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
