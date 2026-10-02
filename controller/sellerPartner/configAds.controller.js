const sellerConfigAdsSchema = require("../../models/sellerPartner/configAd.model");
const request = require("request");
const moment = require("moment-timezone");
const { write_logs } = require("../../winston/updateToken/logger");

// add amazon credentials in config table
exports.linkToAmazonSeller = async (req, res) => {
    const { companyId, clientSecret, clientId, sellerAccessToken, sellerRefreshToken, sellerTokenExpire, baseUrl } = req.body;
    try {
        // find config data
        const findConfigAds = await sellerConfigAdsSchema.findOne({ companyId: companyId });

        if (!findConfigAds) {
            //add config data
            await sellerConfigAdsSchema.create({
                companyId: companyId,
                clientId: clientId,
                clientSecret: clientSecret,
                sellerAccessToken: sellerAccessToken,
                sellerRefreshToken: sellerRefreshToken,
                sellerTokenExpire: sellerTokenExpire,
                baseUrl: baseUrl
            })
        } else {
            //update config data
            await sellerConfigAdsSchema.findOneAndUpdate({
                companyId: companyId,
            }, {
                clientId: clientId,
                clientSecret: clientSecret,
                sellerAccessToken: sellerAccessToken,
                sellerRefreshToken: sellerRefreshToken,
                sellerTokenExpire: sellerTokenExpire,
                baseUrl: baseUrl
            })
        }
        return res.status(200).send({
            isSuccess: true,
            message: "SellerConfigAds data updated successfully.",
        })
    } catch (error) {
        return res.status(500).send({
            error: error.message,
            message: "Something went wrong, please try again!",
            isSuccess: false,
        });
    }
};

exports.cronUpdateSellerToken = async () => {
    try {
        write_logs({
            message: `Cron call => cronUpdateSellerToken for processing`,
            log_type: "info",
        });
        const checkConfigAds = await sellerConfigAdsSchema.find();
        await Promise.all(
            checkConfigAds.map(async (customer) => {
                request.post(
                    {
                        url: process.env.AUTH_LINK,
                        form: {
                            grant_type: "refresh_token",
                            client_id: customer.sellerClientId,
                            refresh_token: customer.sellerRefreshToken,
                            client_secret: customer.sellerClientSecret,
                        },
                    },
                    async (error, httpResponse, body) => {
                        try {
                            if (error) {
                                return write_logs({
                                    message: `seller ${JSON.stringify(error)}`,
                                    log_type: "info",
                                });
                            }
                            let data = JSON.parse(body);
                            await sellerConfigAdsSchema.findByIdAndUpdate(
                                { _id: customer._id },
                                {
                                    sellerAccessToken: data.access_token,
                                    sellerRefreshToken: data.refresh_token,
                                },
                                {
                                    new: true,
                                }
                            );
                            return write_logs({
                                message: `Seller ${customer._id} Access token updated successfully`,
                                log_type: "info",
                            });
                        } catch (error) {
                            return write_logs({
                                message: `Seller Token not updated ${JSON.stringify(error)}`,
                                log_type: "info",
                            });
                        }
                    }
                );
            })
        );
    } catch (error) {
        return write_logs({
            message: `Seller Main Try Catch ${JSON.stringify(error)}`,
            log_type: "info",
        });
    }
};
