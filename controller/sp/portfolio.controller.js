const request = require("request");
const portfolioSchema = require("../../models/sp/portfolio.model");
const {
    cronGetAccessToken, cronCheckCustomerPermission,
} = require("../../common/helper");
const profileSchema = require("../../models/config/profiles.model");
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const { write_logs } = require("../../winston/placement/logger");
const moment = require("moment-timezone");

//update portfolio 
exports.cronUpdatePortfolios = async (req, res) => {
    try {
        //get profile data
        const getProfileId = await profileSchema.find({
            isActive: true,
        });
        await Promise.all(
            getProfileId.map(async (i) => {
                const todayDate = moment.tz(i.timezone).format("YYYY-MM-DD");
                const checkCustomerPermission = await cronCheckCustomerPermission(
                    i?.companyId,
                    i?.profileId,
                    "Portfolio Listing"
                );
                if (
                    checkCustomerPermission
                ) {
                    const currentDate =
                        moment(todayDate)
                            // .subtract(1, "day")
                            .format("YYYY-MM-DD")
                    const createCronHistory = new cronJobHistorySchema({
                        companyId: i.companyId,
                        profileId: i.profileId,
                        cronName: "Portfolio Listing",
                        status: "PENDING",
                        historyDate: currentDate,
                    });
                    await createCronHistory.save();
                    const checkConfigAds = await cronGetAccessToken(i.companyId);
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const currentDate = moment.tz(i.timezone).format("YYYY-MM-DD");
                        const portfolio = await getPortfoliosFromAmazon(
                            i.companyId,
                            i.profileId,
                            checkConfigAds,
                            currentDate
                        );
                        write_logs({
                            message: `SP ${portfolio} `,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in Portfolio listing ${i?.companyId}`,
                        log_type: "info",
                    });
                }
            })
        );
        return write_logs({
            message: "Portfolios updated successfully.",
            log_type: "info",
        });
    } catch (error) {
        console.log(error)
        return write_logs({
            message: `Error: ${JSON.stringify(error)} `,
            log_type: "error",
        });
    }
};

async function getPortfoliosFromAmazon(
    companyId,
    profileId,
    checkConfigAds,
    currentDate
) {
    return new Promise((resolve, reject) => {
        //object for mazon api call for get campaign list
        let nextToken = "";
        const bodyData = { includeExtendedDataFields: true }
        function makeRequest() {
            if (nextToken) {
                bodyData.nextToken = nextToken;
            }
            const spOptions = {
                method: "POST",
                url: `${process.env.ROOT_LINK}/portfolios/list`,
                headers: {
                    "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                    "Amazon-Advertising-API-Scope": profileId,
                    Authorization: `Bearer ${checkConfigAds.adsAccessToken} `,
                    Accept: "application/vnd.spPortfolio.v3+json",
                    "Content-Type": "application/vnd.spPortfolio.v3+json",
                },
                body: JSON.stringify(bodyData),
            };

            request(spOptions, async (error, response, body) => {
                if (error) {
                    console.log(`Portfolio listing err: ${JSON.stringify(error)} `);
                    write_logs({
                        message: `Portfolio listing err: ${JSON.stringify(error)} `,
                        log_type: "error",
                    });
                    resolve("ERROR");
                }
                if (response && response.statusCode == 200) {
                    body = JSON.parse(body);
                    if (body.message !== "Unauthorized") {
                        if (body?.portfolios?.length > 0) {
                            body?.portfolios?.forEach(async (item) => {
                                const portfolioData = await portfolioSchema.findOne({
                                    portfolioId: item.portfolioId,
                                    profileId: profileId
                                });
                                if (portfolioData) {
                                    //update exist portfolio data
                                    await portfolioSchema.updateOne(
                                        {
                                            portfolioId: item.portfolioId,
                                            profileId: profileId
                                        },
                                        {
                                            $set: {
                                                name: item.name,
                                                state: item.state,
                                                inBudget: item.inBudget,
                                                currencyCode: item.currencyCode,
                                                policy: item.policy
                                            },
                                        }
                                    );
                                } else {
                                    //add new adGroup data in db
                                    let Portfolio = new portfolioSchema({
                                        portfolioId: item.portfolioId,
                                        profileId: profileId,
                                        name: item.name,
                                        state: item.state,
                                        inBudget: item.inBudget,
                                        currencyCode: item.currencyCode,
                                        policy: item.policy
                                    });
                                    await Portfolio.save();
                                }
                            });
                            const totalResults = body.totalResults;
                            nextToken = body.nextToken;
                            if (body?.portfolios?.length < totalResults && nextToken) {
                                makeRequest();
                            } else {
                                resolve(
                                    `Portfolio updated successfully for date ${currentDate} and for profile ${profileId}`
                                );
                            }
                        } else {
                            resolve(
                                `Portfolio updated successfully for date ${currentDate} and for profile ${profileId}`
                            );
                        }
                        const getCronData = await cronJobHistorySchema.findOne({
                            companyId: companyId,
                            profileId: profileId,
                            cronName: "Portfolio Listing",
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
                    } else {
                        console.log(`Portfolio listing err token expire: ${body.details} `);
                        write_logs({
                            message: `Portfolio listing err token expire: ${body.details} `,
                            log_type: "error",
                        });
                        resolve("ERROR");
                    }
                } else {
                    console.log(
                        `Portfolio listing amazon err: ${JSON.stringify(response)} `
                    );
                    write_logs({
                        message: `Portfolio listing amazon err: ${JSON.stringify(response)} `,
                        log_type: "error",
                    });
                    resolve("ERROR");
                }
            });
        }
        makeRequest();
    });
}

//get all portfolios 
exports.listPortfolios = async (req, res) => {
    const profileId = req.params.profileId
    try {
        const portfolios = await portfolioSchema.find(
            { profileId: (profileId).toString() },
            {
                updatedAt: 0,
                createdAt: 0,
            }
        ).sort({ name: 1 });
        return res.status(200).send({
            isSuccess: true,
            message: "Portfolio list fetched successfully",
            data: portfolios,
        });
    } catch (error) {
        return res
            .status(500)
            .send({ isSuccess: false, message: error.message, error });
    }
};

// get campaign from amazon
exports.listPortfolioFromAmazon = async (req, res) => {
    try {
        //get profile data
        const getProfileId = await profileSchema.find({
            isActive: true,
        });
        await Promise.all(
            getProfileId.map(async (i) => {
                const checkConfigAds = await cronGetAccessToken(i.customerId);
                if (checkConfigAds && checkConfigAds.adsAccessToken) {
                    const currentDate = moment.tz(i.timezone).format("YYYY-MM-DD");
                    //get data from amazon
                    const portfolio = await getPortfoliosFromAmazon(
                        i.profileId,
                        checkConfigAds,
                        currentDate
                    );
                }
            })
        );
        return res
            .status(200)
            .send({ message: "Portfolio updated successfully." });
    } catch (error) {
        return res
            .status(400)
            .send({ isSuccess: false, message: error.message, error });
    }
};