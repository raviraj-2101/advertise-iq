const request = require("request");
const profileSchema = require("../../models/config/profiles.model");
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const productSchema = require("../../models/sp/product.model");
const { write_logs } = require("../../winston/products/logger");
const { cronGetAccessToken, getPaginatedData, cronCheckCustomerPermission } = require("../../common/helper");
const moment = require("moment-timezone");

exports.listProductFromAmazon = async (req, res) => {
    try {
        const getProfileId = await profileSchema.find({
            isActive: true
        });
        await Promise.all(
            getProfileId.map(async (i) => {
                const todayDate = moment.tz(i.timezone).format("YYYY-MM-DD");
                const currentDate =
                    moment(todayDate)
                        // .subtract(1, "day")
                        .format("YYYY-MM-DD")
                const checkCustomerPermission = await cronCheckCustomerPermission(
                    i?.companyId,
                    i?.profileId,
                    "Products Listing"
                );
                if (
                    checkCustomerPermission
                ) {
                    const checkConfigAds = await cronGetAccessToken(i.companyId);
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const createCronHistory = new cronJobHistorySchema({
                            companyId: i.companyId,
                            profileId: i.profileId,
                            cronName: "Products Listing",
                            status: "PENDING",
                            historyDate: currentDate,
                        });
                        await createCronHistory.save();
                        const products = await getProductFromAmazon(
                            i.companyId,
                            i.profileId,
                            checkConfigAds,
                        );
                        if (products.length > 0) {
                            await Promise.all(
                                products.map(async (item) => {
                                    const getProduct = await productSchema.findOne({
                                        companyId: item.companyId,
                                        profileId: item.profileId,
                                        asin: item.asin,
                                        sku: item.sku
                                    });
                                    if (!getProduct) {
                                        let product = new productSchema(item);
                                        await product.save();
                                    } else {
                                        await productSchema.findByIdAndUpdate(
                                            { _id: getProduct._id },
                                            item,
                                            { new: true }
                                        );
                                    }
                                })
                            );

                        }
                        const getCronData = await cronJobHistorySchema.findOne({
                            companyId: i.companyId,
                            profileId: i.profileId,
                            cronName: "Products Listing",
                            status: "PENDING",
                            historyDate: currentDate,
                        });
                        if (getCronData) {
                            await cronJobHistorySchema.findByIdAndUpdate(
                                { _id: getCronData._id },
                                {
                                    status: "COMPLETED",
                                },
                                { new: true }
                            );
                        }
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in Products Listing ${i?.companyId}`,
                        log_type: "info",
                    });
                }
            })
        );
        write_logs({
            message: `Product added from Amazon`,
            log_type: "info",
        });
    } catch (error) {
        write_logs({
            message: error.message,
            log_type: "error",
        });
    }
};

const getProductFromAmazon = async (companyId, profileId, checkConfigAds) => {
    return new Promise(async (resolve, reject) => {

        const spOptions = {
            method: "POST",
            url: `${process.env.ROOT_LINK}/product/metadata`,
            headers: {
                "Amazon-Advertising-API-ClientId": process.env.CLIENT_ID,
                "Amazon-Advertising-API-Scope": profileId,
                Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                "Content-Type": "application/json",
            },
        };
        const products = [];
        let cursorToken = ""
        function makeRequest(pageIndex) {
            spOptions.body = JSON.stringify({
                checkItemDetails: "true",
                adType: "SP",
                pageIndex,
                checkEligibility: "true",
                pageSize: 300,
                cursorToken: cursorToken
            });
            request(spOptions, async (error, response, body) => {
                if (error) {
                    console.log("request ~ error:", error)
                    write_logs({
                        message: `Company ID: ${companyId}, Profile ID: ${profileId} SP product listing err: ${JSON.stringify(error)}`,
                        log_type: "error",
                    });
                    resolve(products);
                }
                if (response.statusCode == 200) {
                    body = JSON.parse(body);
                    if (body.ProductMetadataList.length > 0) {
                        body.ProductMetadataList.forEach((item) => {
                            let obj = {
                                companyId,
                                profileId,
                                asin: item.asin ? item.asin : null,
                                availability: item.availability ? item.availability : null,
                                brand: item.brand ? item.brand : null,
                                eligibilityStatus: item.eligibilityStatus
                                    ? item.eligibilityStatus
                                    : null,
                                imageUrl: item.imageUrl ? item.imageUrl : null,
                                amount: item.priceToPay ? item.priceToPay.amount : null,
                                sku: item.sku ? item.sku : null,
                                title: item.title ? item.title : null,
                                type: "Sponsored Products",
                                category: item.category ? item.category : null,
                                createdDate: item.createdDate ? item.createdDate : null,
                                bestSellerRank: item.bestSellerRank ? item.bestSellerRank : null,
                            };
                            products.push(obj);
                        });
                        if (body.cursorToken) {
                            cursorToken = body.cursorToken
                            makeRequest(pageIndex + 1);
                        } else {
                            resolve(products)
                        }
                    } else {
                        resolve(products);
                    }
                } else {
                    resolve(products);
                }
            });
        }
        makeRequest(0);
    })

}

// product list from db 
exports.getProductList = async (req, res) => {
    try {
        let { pageNo, perPage, profileId } = req.body;

        pageNo = pageNo ? pageNo : 1;
        perPage = perPage ? perPage : 25;

        let totalRecords = 0;

        const productList = await productSchema.find({
            // profileId: profileId,
            companyId: req.user.company
        });

        totalRecords = productList.length;
        //generate paginated data
        paginatedResult = getPaginatedData(productList, pageNo, perPage);

        if (productList) {
            return res.status(200).send({
                isSuccess: true,
                message: "Product list successfully",
                data: paginatedResult,
                totalRecords,
                currentPageNo: pageNo,
                totalPages: Math.ceil(totalRecords / perPage),
            });
        } else {
            return res.status(404).send({
                isSuccess: false,
                message: "Profile id not found!",
            });
        }

    } catch (error) {
        return res.status(500).send({
            message: error.message,
            error,
            isSuccess: false,
        });
    }
}
