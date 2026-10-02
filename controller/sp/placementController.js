const request = require("request");
const placementReportSchema = require("../../models/sp/placementReport.model");
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const profileSchema = require("../../models/config/profiles.model");
const placementSchema = require("../../models/sp/placement.model");
const moment = require("moment-timezone");
const fs = require("fs");
const zlib = require("node:zlib");
const path = require("path");
const mongoose = require("mongoose");
const { write_logs } = require("../../winston/placement/logger");
const { getAccessToken, getPaginatedData, checkPermission, cronCheckCustomerPermission } = require("../../common/helper");
const spCampaignsSchema = require("../../models/sp/spCampaign.model")
const cronJobSchema = require("../../models/cronJob.model")

RegExp.escape = function (string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

//generate placement report 
exports.generateReport = async (req, res) => {
    try {
        const getCronStatus = await cronJobSchema.findOne({
            cronName: "Placement Report",
            isActive: false,
        });
        if (getCronStatus) {
            return write_logs({
                message: `Your placement report status is deactive.`,
                log_type: "info",
            });
        }
        //get profile data
        const getProfileId = await profileSchema.find({
            isActive: true
        });
        await Promise.all(
            getProfileId.map(async (i) => {

                const startDate = req.body.startDate;
                const endDate = req.body.endDate;
                const checkConfigAds = await getAccessToken(i.companyId);
                const checkCustomerPermission = await cronCheckCustomerPermission(
                    i?.companyId,
                    i?.profileId,
                    "Placement Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const reportSpResponse = await spGenerateReport(
                            i.companyId,
                            currentDate,
                            i.profileId,
                            startDate,
                            endDate,
                            checkConfigAds,
                            i.timezone,
                            i.currencyCode
                        );
                        console.log("SP ", reportSpResponse);
                    }
                } else {
                    return res
                        .status(400)
                        .send({ isSuccess: false, message: `Account disconnected in Placement Report ${i.companyId}`, error });
                }
            })
        );
        return res.status(200).send({ message: "Report updated successfully.." });
    } catch (error) {
        console.log("Error:", error.message);
        return res
            .status(400)
            .send({ isSuccess: false, message: error.message, error });
    }
};

// generate placement report and add data in placement table
exports.cronDayPlacementReport = async () => {
    try {
        const getCronStatus = await cronJobSchema.findOne({
            cronName: "Placement Report",
            isActive: false,
        });
        if (getCronStatus) {
            return write_logs({
                message: `Your placement report status is deactive.`,
                log_type: "info",
            });
        }
        //get active profile data
        const getProfileIds = await profileSchema.find({ isActive: true });

        await Promise.all(
            getProfileIds.map(async (i) => {
                const currentDate = moment.tz(i.timezone).format("YYYY-MM-DD");
                const startDate = moment(currentDate)
                    .subtract(2, "day")
                    .format("YYYY-MM-DD");
                const endDate = moment(currentDate)
                    .subtract(2, "day")
                    .format("YYYY-MM-DD");
                const checkConfigAds = await getAccessToken(i.companyId);
                const checkCustomerPermission = await cronCheckCustomerPermission(
                    i?.companyId,
                    i?.profileId,
                    "Placement Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const reportSpResponse = await spGenerateReport(
                            i.companyId,
                            currentDate,
                            i.profileId,
                            startDate,
                            endDate,
                            checkConfigAds,
                            i.timezone,
                            i.currencyCode
                        );
                        write_logs({
                            message: `SP ${reportSpResponse}`,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in Placement Report ${profile.companyId}`,
                        log_type: "info",
                    });
                }
            })
        );
        return write_logs({
            message: "Placement report updated successfully..",
            log_type: "info",
        });
    } catch (error) {
        return write_logs({
            message: `Error: ${error.message}`,
            log_type: "error",
        });
    }
};

// generate placement report and add data in placement table
exports.cronPlacementReport = async () => {
    try {
        const getCronStatus = await cronJobSchema.findOne({
            cronName: "Placement Report",
            isActive: false,
        });
        if (getCronStatus) {
            return write_logs({
                message: `Your placement report status is deactive.`,
                log_type: "info",
            });
        }
        //get active profile data
        const getProfileIds = await profileSchema.find({ isActive: true });

        await Promise.all(
            getProfileIds.map(async (i) => {
                const currentDate = moment.tz(i.timezone).format("YYYY-MM-DD");
                const startDate = moment(currentDate)
                    .subtract(1, "day")
                    .format("YYYY-MM-DD");
                const endDate = moment(currentDate)
                    .subtract(1, "day")
                    .format("YYYY-MM-DD");
                const checkConfigAds = await getAccessToken(i.companyId);
                const checkCustomerPermission = await cronCheckCustomerPermission(
                    i?.companyId,
                    i?.profileId,
                    "Placement Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const reportSpResponse = await spGenerateReport(
                            i.companyId,
                            currentDate,
                            i.profileId,
                            startDate,
                            endDate,
                            checkConfigAds,
                            i.timezone,
                            i.currencyCode
                        );
                        write_logs({
                            message: `SP ${reportSpResponse}`,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in Placement Report ${profile.companyId}`,
                        log_type: "info",
                    });
                }
            })
        );
        return write_logs({
            message: "Placement report updated successfully..",
            log_type: "info",
        });
    } catch (error) {
        return write_logs({
            message: `Error: ${error.message}`,
            log_type: "error",
        });
    }
};

// Generate report based on props ans store data from zip to DB
async function spGenerateReport(
    companyId,
    currentDate,
    profileId,
    startDate,
    endDate,
    checkConfigAds,
    timezone,
    currencyCode,
    report
) {
    return new Promise(async (resolve, reject) => {
        // generate req body for amazon api
        const bodyData = {
            name: "",
            startDate: startDate,
            endDate: endDate,
            configuration: {
                adProduct: "SPONSORED_PRODUCTS",
                groupBy: ["campaign", "campaignPlacement"],
                columns: [
                    "campaignId",
                    "campaignName",
                    "campaignStatus",
                    "campaignBudgetAmount",
                    "campaignBudgetType",
                    "impressions",
                    "clicks",
                    "cost",
                    "purchases7d",
                    "unitsSoldClicks7d",
                    "sales7d",
                    "date",
                    "campaignBiddingStrategy",
                    "costPerClick",
                    "clickThroughRate",
                    "spend",
                    "placementClassification",
                    // "keywordId",
                    // "keyword",
                    // "keywordType",
                    // "adGroupId",
                ],
                reportTypeId: "spCampaigns",
                timeUnit: "DAILY",
                format: "GZIP_JSON",
            },
        };

        //object for request in amazon for get reports 
        let reportPOSTOptions = {
            method: "POST",
            url: `${process.env.ROOT_LINK}/reporting/reports`,
            headers: {
                "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                "Amazon-Advertising-API-Scope": profileId,
                Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                "Content-Type": "application/vnd.createasyncreportrequest.v3+json",
            },
            body: JSON.stringify(bodyData),
        };
        try {
            //get placement report data
            const getReportData = await placementReportSchema.findOne({
                startDate,
                endDate,
                profileId,
                reportTypeId: "spPlacements",
            });
            if (getReportData) {
                let lastUpdateDate = moment(getReportData.updatedAt)
                    .tz(timezone)
                    .format("YYYY-MM-DD HH:mm:ss");
                const currentTime = moment().tz(timezone).format("YYYY-MM-DD HH:mm:ss");
                const lastUpdateTimeObj = moment(lastUpdateDate, "YYYY-MM-DD HH:mm:ss");
                const currentTimeObj = moment(currentTime, "YYYY-MM-DD HH:mm:ss");
                const timeDifferenceMinutes = currentTimeObj.diff(
                    lastUpdateTimeObj,
                    "minutes"
                );
                if (
                    getReportData.status == "COMPLETED" &&
                    (timeDifferenceMinutes >= 10 || timeDifferenceMinutes < 0)
                ) {
                    request(reportPOSTOptions, async (error, response, body) => {
                        if (error) {
                            write_logs({
                                message: `Placement SP Report err: ${JSON.stringify(error)}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                        if (response && response.statusCode == 200) {
                            body = JSON.parse(body);
                            if (body.reportId && body.code != "UNAUTHORIZED") {
                                await placementReportSchema.findByIdAndUpdate(
                                    getReportData._id,
                                    {
                                        $set: {
                                            reportId: body.reportId,
                                            status: body.status,
                                        },
                                    }
                                );
                                resolve(body.status);
                            } else {
                                write_logs({
                                    message: `Placement SP report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `Placement SP report amazon err: ${JSON.stringify(
                                    response
                                )
                                    }`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    });
                } else if (getReportData.status == "COMPLETED") {

                    resolve(getReportData.status);
                } else {
                    ///object for request in amazon for get report data by reportId 
                    let reportIdOptions = {
                        method: "GET",
                        url: `${process.env.ROOT_LINK}/reporting/reports/${getReportData.reportId}`,
                        headers: {
                            "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                            "Amazon-Advertising-API-Scope": profileId,
                            Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                            "Content-Type":
                                "application/vnd.createasyncreportrequest.v3+json",
                        },
                    };
                    request(reportIdOptions, async (error, response, body) => {
                        if (error) {
                            write_logs({
                                message: `Placement SP report err: ${JSON.stringify(error)}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                        if (response && response.statusCode == 200) {
                            body = JSON.parse(body);
                            if (body.code != "UNAUTHORIZED") {
                                if (body.status !== "COMPLETED") {
                                    resolve(body.status);
                                } else {
                                    try {
                                        const updated = await placementReportSchema.updateOne(
                                            {
                                                profileId,
                                                reportId: getReportData.reportId,
                                            },
                                            {
                                                $set: {
                                                    cronRun: report || false,
                                                    status: body.status,
                                                },
                                            }
                                        );
                                    } catch (err) {
                                        console.log(err);
                                    }
                                    //unzip placement report 
                                    const unzipReport = (
                                        zipFilePath,
                                        extractionPath,
                                        callback
                                    ) => {
                                        const unzip = zlib.createUnzip();
                                        const output = fs.createWriteStream(extractionPath);
                                        output.on("finish", () => {
                                            callback(null);
                                        });
                                        output.on("error", (error) => {
                                            callback(error);
                                        });
                                        const input = fs.createReadStream(zipFilePath);
                                        input.pipe(unzip).pipe(output);
                                    };
                                    //zip report file
                                    const zipFilePath = `upload/placements/sp-report/${getReportData.startDate}-${getReportData.reportId}.zip`;
                                    //unzipped report file
                                    const extractionPath = `upload/placements/sp-report/${getReportData.startDate}-${getReportData.reportId}.json`;
                                    //add placement report file 
                                    const file = fs.createWriteStream(zipFilePath);
                                    console.log("request~body.url:", body.url);
                                    const downloadRequest = request(body.url);
                                    downloadRequest.on("error", (error) => {
                                        write_logs({
                                            message: `Placement SP Report err: ${JSON.stringify(
                                                error
                                            )
                                                }`,
                                            log_type: "error",
                                        });
                                        resolve("ERROR");
                                    });

                                    file.on("finish", () => {
                                        unzipReport(
                                            zipFilePath,
                                            extractionPath,
                                            async (unzipError) => {
                                                if (unzipError) {
                                                    write_logs({
                                                        message: `Placement SP Report err: ${unzipError}`,
                                                        log_type: "error",
                                                    });
                                                    resolve("ERROR");
                                                }

                                                const data = require(path.join(
                                                    __dirname,
                                                    "../../",
                                                    extractionPath
                                                ));

                                                Array.from({ length: Math?.ceil(data?.length / 500) }, (_, i) => data?.slice(i * 500, i * 500 + 500))?.map(async (placementsData) => {
                                                    await Promise.all(
                                                        placementsData.map(async (item) => {
                                                            if (
                                                                item.placementClassification != "Off Amazon" &&
                                                                item.campaignStatus != "ARCHIVED"
                                                            ) {
                                                                let placementName = "";
                                                                if (
                                                                    item.placementClassification ==
                                                                    "Other on-Amazon" ||
                                                                    item.placementClassification ==
                                                                    "Other Placements"
                                                                ) {
                                                                    placementName = "Rest of Search";
                                                                } else if (
                                                                    item.placementClassification ==
                                                                    "Detail Page on-Amazon"
                                                                ) {
                                                                    placementName = "Product pages";
                                                                } else if (
                                                                    item.placementClassification ==
                                                                    "Top of Search on-Amazon" ||
                                                                    item.placementClassification == "Top of Search"
                                                                ) {
                                                                    placementName = "Top of Search";
                                                                }
                                                                let campaignBiddingStrategy = "";
                                                                if (item.campaignBiddingStrategy == "legacy") {
                                                                    campaignBiddingStrategy =
                                                                        "Dynamic bids - down only";
                                                                } else if (
                                                                    item.campaignBiddingStrategy ==
                                                                    "optimizeForSales"
                                                                ) {
                                                                    campaignBiddingStrategy =
                                                                        "Dynamic bids - up and down";
                                                                } else if (
                                                                    item.campaignBiddingStrategy == "manual"
                                                                ) {
                                                                    campaignBiddingStrategy = "Fixed bid";
                                                                }
                                                                //check placement is already exist in db or not
                                                                let placement = await placementSchema.findOne({
                                                                    profileId,
                                                                    campaignId: item.campaignId,
                                                                    placement: placementName,
                                                                    reportDate: item?.date,
                                                                });
                                                                let getManagePlacement =
                                                                    await placementSchema.findOne({
                                                                        profileId,
                                                                        campaignId: item.campaignId,
                                                                    });
                                                                let isManage = true;
                                                                if (getManagePlacement) {
                                                                    isManage = getManagePlacement.isManage
                                                                        ? true
                                                                        : false;
                                                                }
                                                                let placementPreviousDay = await placementSchema
                                                                    .findOne({
                                                                        campaignId: item.campaignId,
                                                                        placement: placementName,
                                                                    })
                                                                    .sort({ reportDate: -1 });
                                                                if (placement) {
                                                                    //update existed placement data
                                                                    await placementSchema.updateOne(
                                                                        {
                                                                            profileId,
                                                                            campaignId: item.campaignId,
                                                                            placement: placementName,
                                                                            reportDate: item?.date,
                                                                        },
                                                                        {
                                                                            $set: {
                                                                                campaignName: item.campaignName,
                                                                                campaignStatus:
                                                                                    item.campaignStatus.toUpperCase(),
                                                                                campaignBudget: item.campaignBudgetAmount,
                                                                                campaignBudgetType:
                                                                                    item.campaignBudgetType.toUpperCase(),
                                                                                clicks: item.clicks,
                                                                                spend: item.cost ? item.cost : 0,
                                                                                sales: item.sales7d ? item.sales7d : 0,
                                                                                orders: item.purchases7d
                                                                                    ? item.purchases7d
                                                                                    : 0,
                                                                                acos:
                                                                                    item.sales7d != 0 && item.cost != 0
                                                                                        ? (
                                                                                            (item.cost / item.sales7d) *
                                                                                            100
                                                                                        ).toFixed(2)
                                                                                        : 0,
                                                                                roas:
                                                                                    item.sales7d != 0 && item.cost != 0
                                                                                        ? (item.sales7d / item.cost).toFixed(
                                                                                            2
                                                                                        )
                                                                                        : 0,
                                                                                cvr:
                                                                                    item.purchases7d != 0 &&
                                                                                        item.clicks != 0
                                                                                        ? (
                                                                                            (item.purchases7d / item.clicks) *
                                                                                            100
                                                                                        ).toFixed(2)
                                                                                        : 0,
                                                                                ctr:
                                                                                    item.clicks != 0 &&
                                                                                        item.impressions != 0
                                                                                        ? (
                                                                                            (item.clicks / item.impressions) *
                                                                                            100
                                                                                        ).toFixed(2)
                                                                                        : 0,
                                                                                cpc:
                                                                                    item.cost != 0 && item.clicks != 0
                                                                                        ? (item.cost / item.clicks).toFixed(2)
                                                                                        : 0,
                                                                                impressions: item.impressions,
                                                                                conversion: item.purchases7d
                                                                                    ? item.purchases7d
                                                                                    : 0,
                                                                                placement: placementName,
                                                                                units: item.unitsSoldClicks7d
                                                                                    ? item.unitsSoldClicks7d
                                                                                    : 0,
                                                                                biddingStartegy: campaignBiddingStrategy,
                                                                                isManage,
                                                                            },
                                                                        }
                                                                    );
                                                                    await placementSchema.updateMany(
                                                                        {
                                                                            profileId,
                                                                            campaignId: item.campaignId,
                                                                            placement: placementName,
                                                                        },
                                                                        {
                                                                            campaignName: item.campaignName,
                                                                        },
                                                                        { new: true }
                                                                    );
                                                                } else {
                                                                    //add new placement data
                                                                    let placementReport = new placementSchema({
                                                                        profileId,
                                                                        type: "Sponsored Products",
                                                                        currencyCode,
                                                                        campaignId: item.campaignId,
                                                                        campaignName: item.campaignName,
                                                                        campaignStatus:
                                                                            item.campaignStatus.toUpperCase(),
                                                                        reportDate: item?.date,
                                                                        campaignBudget: item.campaignBudgetAmount,
                                                                        campaignBudgetType:
                                                                            item.campaignBudgetType.toUpperCase(),
                                                                        clicks: item.clicks,
                                                                        spend: item.cost ? item.cost : 0,
                                                                        sales: item.sales7d ? item.sales7d : 0,
                                                                        orders: item.purchases7d
                                                                            ? item.purchases7d
                                                                            : 0,
                                                                        acos:
                                                                            item.sales7d != 0 && item.cost != 0
                                                                                ? (
                                                                                    (item.cost / item.sales7d) *
                                                                                    100
                                                                                ).toFixed(2)
                                                                                : 0,
                                                                        roas:
                                                                            item.sales7d != 0 && item.cost != 0
                                                                                ? (item.sales7d / item.cost).toFixed(2)
                                                                                : 0,
                                                                        cvr:
                                                                            item.purchases7d != 0 && item.clicks != 0
                                                                                ? (
                                                                                    (item.purchases7d / item.clicks) *
                                                                                    100
                                                                                ).toFixed(2)
                                                                                : 0,
                                                                        ctr:
                                                                            item.clicks != 0 && item.impressions != 0
                                                                                ? (
                                                                                    (item.clicks / item.impressions) *
                                                                                    100
                                                                                ).toFixed(2)
                                                                                : 0,
                                                                        cpc:
                                                                            item.cost != 0 && item.clicks != 0
                                                                                ? (item.cost / item.clicks).toFixed(2)
                                                                                : 0,
                                                                        impressions: item.impressions,
                                                                        conversion: item.purchases7d
                                                                            ? item.purchases7d
                                                                            : 0,
                                                                        timezone,
                                                                        placement: placementName,
                                                                        units: item.unitsSoldClicks7d
                                                                            ? item.unitsSoldClicks7d
                                                                            : 0,
                                                                        biddingStartegy: campaignBiddingStrategy,
                                                                        isManage,
                                                                        targetAcos: placementPreviousDay
                                                                            ? placementPreviousDay.targetAcos
                                                                            : 0,
                                                                        keywordBid: placementPreviousDay
                                                                            ? placementPreviousDay.keywordBid
                                                                            : 0,
                                                                        placementModifier: placementPreviousDay
                                                                            ? placementPreviousDay.placementModifier
                                                                            : 0,
                                                                    });
                                                                    await placementReport.save();
                                                                }
                                                            }
                                                        })
                                                    );
                                                })
                                                const getCronData = await cronJobHistorySchema.findOne({
                                                    companyId: companyId,
                                                    profileId: profileId,
                                                    cronName: "Placement Report",
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

                                                resolve(body.status);
                                            }
                                        );
                                    });
                                    downloadRequest.pipe(file);
                                }
                            } else {
                                write_logs({
                                    message: `Placement SP report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `Placement SP report amazon err: ${JSON.stringify(
                                    response
                                )
                                    }`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    });
                }
            } else {
                //generate report for placement data
                request(reportPOSTOptions, async (error, response, body) => {
                    if (error) {
                        write_logs({
                            message: `Placement SP report err: ${JSON.stringify(error)}`,
                            log_type: "error",
                        });
                        resolve("ERROR");
                    }
                    if (response && response.statusCode == 200) {
                        body = JSON.parse(body);
                        if (body.reportId && body.code != "UNAUTHORIZED") {
                            const createCronHistory = new cronJobHistorySchema({
                                companyId: companyId,
                                profileId: profileId,
                                cronName: "Placement Report",
                                status: "PENDING",
                                historyDate: currentDate,
                            });
                            await createCronHistory.save();

                            let create = {
                                adProduct: body.configuration.adProduct,
                                reportTypeId: "spPlacements",
                                startDate,
                                endDate,
                                reportId: body.reportId,
                                status: body.status,
                                profileId,
                                cronRun: false,
                            };
                            let createSpReport = new placementReportSchema(create);
                            await createSpReport.save();

                            resolve(body.status);
                        } else {
                            console.log(
                                `Placement SP report err token expire: ${body.details}`
                            );
                            write_logs({
                                message: `Placement SP report err token expire: ${body.details}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    } else {
                        console.log(
                            `Placement SP report amazon err: ${JSON.stringify(response)}`
                        );
                        write_logs({
                            message: `Placement SP report amazon err: ${JSON.stringify(
                                response
                            )
                                }`,
                            log_type: "error",
                        });
                        resolve("ERROR");
                    }
                });
            }
        } catch (error) {
            console.log(`Placement SP report err: ${JSON.stringify(error)}`);
            write_logs({
                message: `Placement SP report err: ${JSON.stringify(error)}`,
                log_type: "error",
            });
            resolve("ERROR");
        }
    });
}

// get campaign from amazon
exports.listCampaignFromAmazon = async (req, res) => {
    try {
        //get profile data
        const getProfileId = await profileSchema.find({
            isActive: true,
        });
        await Promise.all(
            getProfileId.map(async (i) => {
                const checkConfigAds = await getAccessToken(i.companyId);
                if (checkConfigAds && checkConfigAds.adsAccessToken) {
                    let reportDate = req.body.reportDate;
                    //get data from amazon
                    const spCampaigns = await getSPCampaignsFromAmazon(
                        i.companyId,
                        i.profileId,
                        checkConfigAds,
                        reportDate
                    );
                    console.log("SP ", spCampaigns);
                }
            })
        );
        return res
            .status(200)
            .send({ message: "Placement modifire updated successfully." });
    } catch (error) {
        return res
            .status(400)
            .send({ isSuccess: false, message: error.message, error });
    }
};

//update placement modifier 
exports.cronUpdatePlacementModifire = async (req, res) => {
    try {
        //get profile data
        const getProfileId = await profileSchema.find({
            isActive: true,
        });
        await Promise.all(
            getProfileId.map(async (i) => {

                const checkConfigAds = await getAccessToken(i.companyId);
                if (checkConfigAds && checkConfigAds.adsAccessToken) {
                    const currentDate = moment.tz(i.timezone).format("YYYY-MM-DD");
                    const reportDate = moment(currentDate)
                        .subtract(1, "day")
                        .format("YYYY-MM-DD");
                    const createCronHistory = new cronJobHistorySchema({
                        companyId: i.companyId,
                        profileId: i.profileId,
                        cronName: "Placement Modifier",
                        status: "PENDING",
                        historyDate: currentDate,
                    });
                    await createCronHistory.save();
                    const spCampaigns = await getSPCampaignsFromAmazon(
                        i.companyId,
                        i.profileId,
                        currentDate,
                        checkConfigAds,
                        reportDate
                    );
                    write_logs({
                        message: `SP ${spCampaigns}`,
                        log_type: "info",
                    });
                }
            })
        );
        return write_logs({
            message: "Placement modifire updated successfully.",
            log_type: "info",
        });
    } catch (error) {
        return write_logs({
            message: `Error: ${JSON.stringify(error)}`,
            log_type: "error",
        });
    }
};

async function getSPCampaignsFromAmazon(
    companyId,
    profileId,
    currentDate,
    checkConfigAds,
    reportDate
) {
    return new Promise((resolve, reject) => {
        let bodyData = {
            maxResults: 1000,
        };
        //object for mazon api call for get campaign list
        const spOptions = {
            method: "POST",
            url: `${process.env.ROOT_LINK}/sp/campaigns/list`,
            headers: {
                "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                "Amazon-Advertising-API-Scope": profileId,
                Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                Accept: "application/vnd.spCampaign.v3+json",
                "Content-Type": "application/vnd.spCampaign.v3+json",
            },
        };
        const campaigns = [];
        let nextToken = "";
        function makeRequest() {
            if (nextToken) {
                bodyData.nextToken = nextToken;
            }
            spOptions.body = JSON.stringify(bodyData);
            request(spOptions, async (error, response, body) => {
                if (error) {
                    console.log(`Campaign listing err: ${JSON.stringify(error)}`);
                    write_logs({
                        message: `Campaign listing err: ${JSON.stringify(error)}`,
                        log_type: "error",
                    });
                    resolve("ERROR");
                }
                if (response && response.statusCode == 200) {
                    body = JSON.parse(body);
                    if (body.message !== "Unauthorized") {
                        if (body.campaigns.length > 0) {
                            body.campaigns.forEach(async (item) => {
                                // if (item.state == "ARCHIVED") {
                                //   await placementSchema.deleteMany({
                                //     campaignId: Number(item.campaignId),
                                //   });
                                // await applyOnAmazonSchema.deleteMany({
                                //   campaignId: Number(item.campaignId),
                                // });
                                // } else {
                                if (item.dynamicBidding.placementBidding.length > 0) {
                                    await Promise.all(
                                        //add placement modifier to placements
                                        item.dynamicBidding.placementBidding.map(
                                            async (placementBid) => {
                                                if (
                                                    placementBid.placement == "PLACEMENT_PRODUCT_PAGE"
                                                ) {
                                                    await placementSchema.updateMany(
                                                        {
                                                            profileId,
                                                            // companyId,
                                                            campaignId: Number(item.campaignId),
                                                            placement: "Product pages",
                                                        },
                                                        {
                                                            placementModifier: placementBid.percentage,
                                                            portfolioId: item.portfolioId,
                                                        },
                                                        { new: true }
                                                    );
                                                }
                                                if (placementBid.placement == "PLACEMENT_TOP") {
                                                    await placementSchema.updateMany(
                                                        {
                                                            profileId,
                                                            // companyId,
                                                            campaignId: Number(item.campaignId),
                                                            placement: "Top of Search",
                                                        },
                                                        {
                                                            placementModifier: placementBid.percentage,
                                                            portfolioId: item.portfolioId,
                                                        },
                                                        { new: true }
                                                    );
                                                }
                                                if (
                                                    placementBid.placement == "PLACEMENT_REST_OF_SEARCH"
                                                ) {
                                                    await placementSchema.updateMany(
                                                        {
                                                            profileId,
                                                            // companyId,
                                                            campaignId: Number(item.campaignId),
                                                            placement: "Rest of Search",
                                                        },
                                                        {
                                                            placementModifier: placementBid.percentage,
                                                            portfolioId: item.portfolioId,
                                                        },
                                                        { new: true }
                                                    );
                                                }
                                            }
                                        )
                                    );
                                    if (item.dynamicBidding.placementBidding.length < 3) {
                                        await placementSchema.updateMany(
                                            {
                                                profileId,
                                                campaignId: Number(item.campaignId),
                                                placement: { $in: ["Rest of Search", "Top of Search", "Product pages"] },
                                            },
                                            {
                                                portfolioId: item.portfolioId,
                                            },
                                            { new: true }
                                        );
                                    }
                                } else {
                                    await placementSchema.updateMany(
                                        {
                                            profileId,
                                            // companyId,
                                            campaignId: Number(item.campaignId),
                                            placement: "Product pages",
                                        },
                                        {
                                            placementModifier: 0,
                                            portfolioId: item.portfolioId,
                                        },
                                        { new: true }
                                    );
                                    await placementSchema.updateMany(
                                        {
                                            profileId,
                                            // companyId,
                                            campaignId: Number(item.campaignId),
                                            placement: "Top of Search",
                                        },
                                        {
                                            placementModifier: 0,
                                            portfolioId: item.portfolioId,
                                        },
                                        { new: true }
                                    );
                                    await placementSchema.updateMany(
                                        {
                                            profileId,
                                            // companyId,
                                            campaignId: Number(item.campaignId),
                                            placement: "Rest of Search",
                                        },
                                        {
                                            placementModifier: 0,
                                            portfolioId: item.portfolioId,
                                        },
                                        { new: true }
                                    );
                                }
                                // }
                            });
                            const totalResults = body.totalResults;
                            nextToken = body.nextToken;
                            if (campaigns.length < totalResults && nextToken) {
                                makeRequest();
                            } else {
                                resolve(
                                    `Placement modifire updated successfully for date ${reportDate}`
                                );
                            }
                        } else {
                            resolve(
                                `Placement modifire updated successfully for date ${reportDate}`
                            );
                        }
                        const getCronData = await cronJobHistorySchema.findOne({
                            companyId: companyId,
                            profileId: profileId,
                            cronName: "Placement Modifier",
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
                        console.log(`Campaign listing err token expire: ${body.details} `);
                        write_logs({
                            message: `Campaign listing err token expire: ${body.details
                                } `,
                            log_type: "error",
                        });
                        resolve("ERROR");
                    }
                } else {
                    console.log(
                        `Campaign listing amazon err: ${JSON.stringify(response)} `
                    );
                    write_logs({
                        message: `Campaign listing amazon err: ${JSON.stringify(response)} `,
                        log_type: "error",
                    });
                    resolve("ERROR");
                }
            });
        }
        makeRequest();
    });
}

exports.getPlacementAnother = async (req, res) => {
    let {
        fromDate,
        toDate,
        profileId,
        pageNo,
        perPage,
        search,
        portfolioIds
    } = req.body;
    try {
        let filterType = "Date";

        if (!profileId) {
            return res.status(400).send({
                isSuccess: false,
                message: "Profile id required.",
            });
        }
        pageNo = pageNo ? pageNo : 1;
        perPage = perPage ? perPage : 25;
        //get profile data
        let filter = {
            profileId: Number(profileId),
            type: "Sponsored Products",
        };
        let campaignFilter = {
            profileId: Number(profileId),
            type: "Sponsored Products",
        }
        // Searching
        if (search) {
            campaignFilter.campaignName = {
                $regex: new RegExp(RegExp.escape(search), "i"),
            };
            filter.campaignName = {
                $regex: new RegExp(RegExp.escape(search), "i"),
            };
        }

        if (portfolioIds && portfolioIds?.length > 0) {
            campaignFilter.portfolioId = {
                $in: portfolioIds.map(item => item.toString())
            }
            filter.portfolioId = {
                $in: portfolioIds.map(item => item.toString())
            }
        }

        let totalRecords = 0;

        if (filterType == "Date") {
            if (fromDate && toDate) {
                filter.reportDate = { $gte: fromDate, $lte: toDate };
            }
            let paginatedResult = [];

            const getPlacementData = [
                {
                    $match: campaignFilter
                },
                {
                    $group:
                    {
                        _id: {
                            campaignId: "$campaignId",
                            placement: "$placement"
                        },
                        campaignTempId: {
                            $first: "$_id"
                        },
                        campaignPlacement: {
                            $first: "$$ROOT"
                        },
                        campaignBudget: {
                            $first: "$campaignBudget"
                        },
                        campaignStatus: {
                            $first: "$campaignStatus"
                        },
                        campaignBudgetType: {
                            $first: "$campaignBudgetType"
                        },
                        campaignName: {
                            $first: "$campaignName"
                        },
                        campaignId: {
                            $first: "$campaignId"
                        },
                        type: {
                            $first: "$type"
                        },
                        profileId: {
                            $first: "$profileId"
                        },
                        isManage: {
                            $first: "$isManage"
                        },
                        isUpdatedOnAmazon: {
                            $first: "$isUpdatedOnAmazon"
                        }
                    }
                },

                {
                    $addFields:
                    {
                        numCampaignId: {
                            $toDouble: "$campaignId"
                        }
                    }
                },
                {
                    $lookup:
                    {
                        from: "placements",
                        // Replace with the name of your target collection
                        let: {
                            campaignId: "$numCampaignId"
                        },
                        // Pass necessary variables from the parent collection
                        pipeline: [
                            {
                                $match: filter,
                            },
                            {
                                $sort: {
                                    reportDate: -1,
                                },
                            },
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$campaignId", "$$campaignId"] },
                                            // Add additional conditions as needed
                                        ],
                                    },
                                },
                            },
                            {
                                $group: {
                                    _id: {
                                        campaignId: "$campaignId",
                                        placement: "$placement",
                                    },
                                    tempId: {
                                        $first: "$_id",
                                    },
                                    placement: {
                                        $first: "$$ROOT",
                                    },
                                    spend: {
                                        $sum: "$spend",
                                    },
                                    campaignBudget: {
                                        $first: "$campaignBudget"
                                    },
                                    sales: {
                                        $sum: "$sales",
                                    },
                                    impressions: {
                                        $sum: "$impressions",
                                    },
                                    clicks: {
                                        $sum: "$clicks",
                                    },
                                    orders: {
                                        $sum: "$orders",
                                    },
                                    conversion: {
                                        $sum: "$conversion",
                                    },
                                    units: {
                                        $sum: "$units",
                                    },
                                    isManage: {
                                        $first: "$isManage",
                                    },
                                },
                            },
                            {
                                $group: {
                                    _id: {
                                        campaignId: "$campaignId",
                                    },
                                    tempId: {
                                        $first: "$_id",
                                    },
                                    placement: {
                                        $first: "$$ROOT",
                                    },
                                    spend: {
                                        $sum: "$spend",
                                    },
                                    campaignBudget: {
                                        $first: "$campaignBudget"
                                    },
                                    sales: {
                                        $sum: "$sales",
                                    },
                                    impressions: {
                                        $sum: "$impressions",
                                    },
                                    clicks: {
                                        $sum: "$clicks",
                                    },
                                    orders: {
                                        $sum: "$orders",
                                    },
                                    conversion: {
                                        $sum: "$conversion",
                                    },
                                    units: {
                                        $sum: "$units",
                                    },
                                    isManage: {
                                        $first: "$isManage",
                                    },
                                },
                            },
                            {
                                $sort: {
                                    "placement.reportDate": -1,
                                },
                            },
                            {
                                $group: {
                                    _id: "$_id.campaignId",
                                    key: {
                                        $first: "$tempId",
                                    },
                                    campaignId: {
                                        $first: "$tempId"
                                    },
                                    campaignName: {
                                        $first: "$placement.campaignName",
                                    },
                                    campaignStatus: {
                                        $first: "$placement.campaignStatus",
                                    },
                                    type: {
                                        $first: "$placement.type",
                                    },
                                    isManage: {
                                        $first: "$isManage",
                                    },
                                    keywordBid: {
                                        $first: "$placement.keywordBid",
                                    },
                                    newKeywordBid: {
                                        $first: "$placement.newKeywordBid",
                                    },
                                    campaignBudget: {
                                        $first: "$campaignBudget"
                                    },
                                    totalImpressions: {
                                        $sum: "$impressions",
                                    },
                                    totalClicks: {
                                        $sum: "$clicks",
                                    },
                                    totalOrders: {
                                        $sum: "$orders",
                                    },
                                    totalUnits: {
                                        $sum: "$units",
                                    },
                                    totalSales: {
                                        $sum: "$sales",
                                    },
                                    totalSpend: {
                                        $sum: "$spend",
                                    },
                                    reportDate: {
                                        $first: "$placement.reportDate"
                                    },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    key: 1,
                                    keywordBid: 1,
                                    newKeywordBid: 1,
                                    totalImpressions: 1,
                                    totalClicks: 1,
                                    totalOrders: 1,
                                    totalUnits: 1,
                                    isManage: 1,
                                    reportDate: 1,
                                    totalSales: {
                                        $round: ["$totalSales", 2],
                                    },
                                    totalSpend: {
                                        $round: ["$totalSpend", 2],
                                    },
                                    totalCvr: {
                                        $round: [
                                            {
                                                $cond: {
                                                    if: {
                                                        $gt: ["$totalClicks", 0],
                                                    },
                                                    then: {
                                                        $multiply: [
                                                            {
                                                                $divide: ["$totalOrders", "$totalClicks"],
                                                            },
                                                            100,
                                                        ],
                                                    },
                                                    else: 0,
                                                },
                                            },
                                            2,
                                        ],
                                    },
                                    totalCtr: {
                                        $round: [
                                            {
                                                $cond: {
                                                    if: {
                                                        $gt: ["$totalImpressions", 0],
                                                    },
                                                    then: {
                                                        $multiply: [
                                                            {
                                                                $divide: ["$totalClicks", "$totalImpressions"],
                                                            },
                                                            100,
                                                        ],
                                                    },
                                                    else: 0,
                                                },
                                            },
                                            2,
                                        ],
                                    },
                                    totalCpc: {
                                        $round: [
                                            {
                                                $cond: {
                                                    if: {
                                                        $gt: ["$totalClicks", 0],
                                                    },
                                                    then: {
                                                        $divide: ["$totalSpend", "$totalClicks"],
                                                    },
                                                    else: 0,
                                                },
                                            },
                                            2,
                                        ],
                                    },
                                    totalAcos: {
                                        $round: [
                                            {
                                                $cond: {
                                                    if: {
                                                        $gt: ["$totalSales", 0],
                                                    },
                                                    then: {
                                                        $multiply: [
                                                            {
                                                                $divide: ["$totalSpend", "$totalSales"],
                                                            },
                                                            100,
                                                        ],
                                                    },
                                                    else: 0,
                                                },
                                            },
                                            2,
                                        ],
                                    },
                                    totalRoas: {
                                        $round: [
                                            {
                                                $cond: {
                                                    if: {
                                                        $gt: ["$totalSpend", 0],
                                                    },
                                                    then: {
                                                        $divide: ["$totalSales", "$totalSpend"],
                                                    },
                                                    else: 0,
                                                },
                                            },
                                            2,
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "placementData"
                    }
                },
                {
                    $unwind: {
                        path: "$placementData",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $sort: {
                        reportId: -1
                    }
                },
                {
                    $group: {
                        _id: "$_id.campaignId",
                        campaignId: {
                            $first: "$campaignId"
                        },
                        key: {
                            $first: "$campaignId",
                        },
                        placement: { $first: "$placementData" },
                        campaignName: {
                            $first: "$campaignName",
                        },
                        profileId: {
                            $first: "$profileId"
                        },
                        portfolioId: {
                            $first: "$portfolioId"
                        },
                        campaignStatus: {
                            $first: "$campaignStatus",
                        },
                        type: {
                            $first: "$type",
                        },
                        isManage: {
                            $first: "$isManage",
                        },
                        keywordBid: {
                            $first: "$placementData.keywordBid",
                        },
                        newKeywordBid: {
                            $first: "$placementData.newKeywordBid",
                        },
                        campaignBudget: {
                            $first: "$campaignBudget"
                        },
                        totalImpressions: {
                            $first: "$placementData.totalImpressions",
                        },
                        totalClicks: {
                            $first: "$placementData.totalClicks",
                        },
                        totalOrders: {
                            $first: "$placementData.totalOrders",
                        },
                        totalUnits: {
                            $first: "$placementData.totalUnits",
                        },
                        totalSales: {
                            $first: "$placementData.totalSales",
                        },
                        totalSpend: {
                            $first: "$placementData.totalSpend",
                        },
                        reportDate: {
                            $first: "$placementData.reportDate"
                        },
                        isUpdatedOnAmazon: {
                            $first: "$isUpdatedOnAmazon"
                        }
                    },
                },
                {
                    $project: {
                        _id: 0,
                        key: 1,
                        profileId: 1,
                        campaignId: { $toDouble: "$campaignId" },
                        campaignName: 1,
                        campaignStatus: 1,
                        placement: 1,
                        portfolioId: 1,
                        type: 1,
                        keywordBid: 1,
                        newKeywordBid: 1,
                        totalImpressions: 1,
                        campaignBudget: 1,
                        totalClicks: 1,
                        totalOrders: 1,
                        totalUnits: 1,
                        isManage: 1,
                        reportDate: 1,
                        isUpdatedOnAmazon: 1,
                        totalSales: {
                            $round: ["$placement.totalSales", 2],
                        },
                        totalSpend: {
                            $round: ["$placement.totalSpend", 2],
                        },
                        totalCvr: {
                            $round: ["$placement.totalCvr", 2],
                        },
                        totalCtr: {
                            $round: ["$placement.totalCtr", 2],
                        },
                        totalCpc: {
                            $round: ["$placement.totalCpc", 2],
                        },
                        totalAcos: {
                            $round: ["$placement.totalAcos", 2],
                        },
                        totalRoas: {
                            $round: ["$placement.totalRoas", 2],
                        },
                    },
                },
                {
                    $sort: {
                        totalOrders:-1
                    }
                }

            ];

            //get campaign data
            let placementResult = await spCampaignsSchema.aggregate(getPlacementData);
            //get total no of records
            totalRecords = placementResult.length;
            if (perPage === "ALL") {
                perPage = totalRecords + 1;
            }
            //generate paginated data
            paginatedResult = getPaginatedData(placementResult, pageNo, perPage);

            return res.status(200).send({
                isSuccess: true,
                totalRecords,
                currentPageNo: pageNo,
                totalPages: Math.ceil(totalRecords / perPage),
                campaignsResult: paginatedResult,
            });
        }
    } catch (error) {
        return res
            .status(203)
            .send({ isSuccess: false, message: error.message, error });
    }
};

// get child data for campaign 
exports.getChildData = async (req, res) => {
    let {
        fromDate,
        toDate,
        profileId,
        portfolioIds,
        campaignNames,
        filterType = "Date",
    } = req.body;

    try {
        if (!profileId) {
            return res.status(400).send({
                isSuccess: false,
                message: "Profile id required.",
            });
        }
        //get profile data
        const getProfile = await profileSchema.findOne({ profileId });
        let filter = {
            profileId: Number(profileId),
            type: "Sponsored Products",
        };
        if (filterType == "Date") {
            if (fromDate && toDate) {
                filter.reportDate = { $gte: fromDate, $lte: toDate };
            } else {
                fromDate = moment().tz(getProfile.timezone).format("YYYY-MM-DD");
                toDate = moment().tz(getProfile.timezone).format("YYYY-MM-DD");
                filter.reportDate = { $gte: fromDate, $lte: toDate };
            }

            let placementSubResult = [];
            let campaignFilter = {
                profileId: Number(profileId),
                type: "Sponsored Products",
            }
            if (campaignNames.length > 0) {
                filter.campaignId = { $in: campaignNames };
                campaignFilter.campaignId = { $in: campaignNames.map(x => x.toString()) };
                if (portfolioIds && portfolioIds?.length > 0) {
                    campaignFilter.portfolioId = {
                        $in: portfolioIds.map(item => item.toString())
                    }
                    filter.portfolioId = {
                        $in: portfolioIds.map(item => item.toString())
                    }
                }
                //get placement data 
                placementSubResult = await getPlacementSubDataFunction(filter, campaignFilter);

                //all placement types
                const allPlacements = [
                    "Top of Search",
                    "Rest of Search",
                    "Product Pages",
                ];

                // placement data after filter
                placementSubResult = placementSubResult.map((campaign) => {
                    const placementsData = allPlacements.map((placement) => {
                        const placements = campaign?.campaignPlacement?.find((data) => {
                            return (
                                data.placement &&
                                data.placement.toLowerCase() === placement.toLowerCase()
                            );
                        });
                        const placementData = campaign?.placementData?.[0]?.placementsData.find((data) => {
                            return (
                                data.placement &&
                                data.placement.toLowerCase() === placement.toLowerCase()
                            );
                        });
                        if (placementData) {

                            return {
                                ...placementData,
                                isUpdatedOnAmazon: (placements?.isUpdatedOnAmazon || placementData?.isUpdatedOnAmazon) ? true
                                    : (placements?.isUpdatedOnAmazon === false || placementData?.isUpdatedOnAmazon === false) ? false
                                        : true,
                                placementModifier: placementData?.placementModifier || placements?.placementModifier
                            };
                        } else if (placements) {
                            return {
                                campaignId: Number(campaign?.campaignId),
                                key: campaign?.tempId ? `${campaign?.tempId} - ${placement}` : campaign?.key,
                                placement,
                                childData: true,
                                totalClicks: null,
                                isUpdatedOnAmazon: placements?.isUpdatedOnAmazon,
                                totalImpressions: null,
                                totalSales: null,
                                totalSpend: null,
                                totalOrders: null,
                                totalUnits: null,
                                totalAcos: null,
                                totalRoas: null,
                                totalCvr: null,
                                totalCtr: null,
                                totalCpc: null,
                                conversion: null,
                                tagetCPCAmazon: null,
                                placementModifier: placements?.placementModifier,
                                biddingStartegy: null,
                                targetAcos: null,
                                newKeywordBid: null
                            }
                        }
                        return {
                            campaignId: Number(campaign?.campaignId),
                            key: campaign?.tempId ? `${campaign?.tempId} - ${placement}` : campaign?.key,
                            placement,
                            childData: true,
                            totalClicks: null,
                            isUpdatedOnAmazon: true,
                            totalImpressions: null,
                            totalSales: null,
                            totalSpend: null,
                            totalOrders: null,
                            totalUnits: null,
                            totalAcos: null,
                            totalRoas: null,
                            totalCvr: null,
                            totalCtr: null,
                            totalCpc: null,
                            conversion: null,
                            tagetCPCAmazon: null,
                            placementModifier: null,
                            biddingStartegy: null,
                            targetAcos: null,
                            newKeywordBid: null
                        }
                    });
                    return {
                        campaignId: campaign?.campaignId,
                        placementsData: placementsData.filter((x) => x),
                    };
                });
                //sort placement data by placement type 
                placementSubResult.sort((a, b) => {
                    return (
                        allPlacements.indexOf(a.placementsData[0].placement) -
                        allPlacements.indexOf(b.placementsData[0].placement)
                    );
                });
            }
            let dataTableResult;
            return res.status(200).send({
                isSuccess: true,
                placementSubResult,
                dataTableResult,
            });
        } else {
            return res
                .status(400)
                .send({ isSuccess: false, message: "Filter type required." });
        }
    } catch (error) {
        return res
            .status(400)
            .send({ isSuccess: false, message: error.message, error });
    }
};

// To get data for subdata for campaign by placement
async function getPlacementSubDataFunction(filter, campaignFilter) {
    return new Promise(async (resolve, reject) => {
        const getData = [
            {
                $match: campaignFilter
            },
            {
                $group:
                {
                    _id: {
                        campaignId: "$campaignId",
                        placement: "$placement"
                    },
                    tempId: {
                        $first: "$_id"
                    },
                    campaignPlacement: {
                        $push: "$$ROOT"
                    },
                    campaignId: {
                        $first: "$campaignId"
                    },
                    type: {
                        $first: "$type"
                    },
                    profileId: {
                        $first: "$profileId"
                    },
                    isUpdatedOnAmazon: {
                        $first: "$isUpdatedOnAmazon"
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.campaignId",
                    campaignPlacement: {
                        $push: "$$ROOT"
                    },
                    placement: {
                        $first: "$placement"
                    },
                    tempId: {
                        $first: "$_id.campaignId"
                    },
                    campaignId: {
                        $first: "$_id.campaignId"
                    },
                    type: {
                        $first: "$type"
                    },
                    profileId: {
                        $first: "$profileId"
                    },
                    isUpdatedOnAmazon: {
                        $first: "$isUpdatedOnAmazon"
                    }
                }
            },
            {
                $unwind:
                {
                    path: "$campaignPlacement"
                }
            },
            {
                $unwind:
                {
                    path: "$campaignPlacement.campaignPlacement",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group:
                {
                    _id: "$campaignPlacement.campaignPlacement.campaignId",
                    campaignId: {
                        $first: "$campaignId"
                    },
                    campaignPlacement: {
                        $push:
                            "$campaignPlacement.campaignPlacement"
                    }
                }
            },
            {
                $addFields:
                {
                    numCampaignId: {
                        $toDouble: "$campaignId",

                    }
                }
            },
            {
                $lookup:
                {
                    from: "placements",
                    // Replace with the name of your target collection
                    let: {
                        campaignId: "$numCampaignId"
                    },
                    // Pass necessary variables from the parent collection
                    pipeline: [
                        {
                            $match: filter,
                        },
                        {
                            $sort: {
                                reportDate: -1,
                            },
                        },
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$campaignId", "$$campaignId"] },
                                        // Add additional conditions as needed
                                    ],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: {
                                    campaignId: "$campaignId",
                                    placement: "$placement",
                                },
                                campaignId: { $first: "$$campaignId" },
                                tempId: {
                                    $first: {
                                        $toString: "$_id",
                                    },
                                },
                                placementType: {
                                    $first: "$placement",
                                },
                                placement: {
                                    $first: "$$ROOT",
                                },
                                spend: {
                                    $sum: "$spend",
                                },
                                sales: {
                                    $sum: "$sales",
                                },
                                impressions: {
                                    $sum: "$impressions",
                                },
                                clicks: {
                                    $sum: "$clicks",
                                },
                                orders: {
                                    $sum: "$orders",
                                },
                                conversion: {
                                    $sum: "$conversion",
                                },
                                units: {
                                    $sum: "$units",
                                },
                                isUpdatedOnAmazon: {
                                    $sum: "$isUpdatedOnAmazon"
                                }
                            },
                        },
                        {
                            $group: {
                                _id: "$_id.campaignId",
                                placementsData: {
                                    $push: {
                                        campaignId: "$campaignId",
                                        key: {
                                            $concat: ["$tempId", "-", "$placementType"],
                                        },
                                        placement: "$_id.placement",
                                        totalClicks: "$clicks",
                                        isUpdatedOnAmazon: "$placement.isUpdatedOnAmazon",
                                        totalImpressions: "$impressions",
                                        totalSales: {
                                            $round: ["$sales", 2],
                                        },
                                        totalSpend: {
                                            $round: ["$spend", 2],
                                        },
                                        totalOrders: "$orders",
                                        totalUnits: "$units",
                                        totalAcos: {
                                            $round: [
                                                {
                                                    $cond: {
                                                        if: {
                                                            $gt: ["$sales", 0],
                                                        },
                                                        then: {
                                                            $multiply: [
                                                                {
                                                                    $divide: ["$spend", "$sales"],
                                                                },
                                                                100,
                                                            ],
                                                        },
                                                        else: 0,
                                                    },
                                                },
                                                2,
                                            ],
                                        },
                                        totalRoas: {
                                            $round: [
                                                {
                                                    $cond: {
                                                        if: {
                                                            $gt: ["$spend", 0],
                                                        },
                                                        then: {
                                                            $divide: ["$sales", "$spend"],
                                                        },
                                                        else: 0,
                                                    },
                                                },
                                                2,
                                            ],
                                        },
                                        totalCvr: {
                                            $round: [
                                                {
                                                    $cond: {
                                                        if: {
                                                            $gt: ["$clicks", 0],
                                                        },
                                                        then: {
                                                            $multiply: [
                                                                {
                                                                    $divide: ["$orders", "$clicks"],
                                                                },
                                                                100,
                                                            ],
                                                        },
                                                        else: 0,
                                                    },
                                                },
                                                2,
                                            ],
                                        },
                                        totalCtr: {
                                            $round: [
                                                {
                                                    $cond: {
                                                        if: {
                                                            $gt: ["$impressions", 0],
                                                        },
                                                        then: {
                                                            $multiply: [
                                                                {
                                                                    $divide: ["$clicks", "$impressions"],
                                                                },
                                                                100,
                                                            ],
                                                        },
                                                        else: 0,
                                                    },
                                                },
                                                2,
                                            ],
                                        },
                                        totalCpc: {
                                            $round: [
                                                {
                                                    $cond: {
                                                        if: {
                                                            $gt: ["$clicks", 0],
                                                        },
                                                        then: {
                                                            $divide: ["$spend", "$clicks"],
                                                        },
                                                        else: 0,
                                                    },
                                                },
                                                2,
                                            ],
                                        },
                                        conversion: {
                                            $round: ["$conversion", 2],
                                        },
                                        bidStrategy: "$placement.biddingStartegy",
                                        placementModifier: {
                                            $ifNull: ["$placement.placementModifier", 0],
                                        },
                                        targetAcos: {
                                            $ifNull: ["$placement.targetAcos", 0],
                                        },
                                        tagetCPCAmazon: {
                                            $ifNull: ["$placement.tagetCPCAmazon", 0],
                                        },
                                        newKeywordBid: {
                                            $ifNull: ["$placement.newKeywordBid", 0],
                                        },
                                        childData: true,
                                    },
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                campaignId: "$_id.campaignId",
                                placementsData: 1,
                            },
                        },
                    ],
                    as: "placementData"
                }
            },
            // {
            //   $addFields: {
            //     placements: "$placementData.placementsData"
            //   }
            // },
            {
                $project: {
                    _id: 0,
                    tempId: 1,
                    campaignId: { $toDouble: "$_id" },
                    placementData: 1,
                    campaignPlacement: 1
                },
            },
        ];
        let placementSubResult = await spCampaignsSchema.aggregate(getData);
        resolve(placementSubResult);
    });
}

exports.createCampaigns = async (req, res) => {
    const { type } = req.body;
    const companyId = req.user.company;
    try {
        const permissionResult = await checkPermission(
            companyId,
            "Campaigns",
            "Create",
            true
        );
        if (!permissionResult.hasPermission) {
            return res.status(203).send({
                isSuccess: false,
                message: permissionResult.message,
            });
        }
        if (type == "Sponsored Products") {
            await createSPCampaigns(req, res);
        } else {
            return res.status(203).send({
                isSuccess: false,
                message: "Type is required.",
            });
        }
    } catch (error) {
        return res.status(203).send({
            message: "Something went wrong, please try again!",
            isSuccess: false,
            error: error.message,
        });
    }
};

async function createSPCampaigns(req, res) {
    const companyId = req.user.company;
    let {
        // profileId,
        // type,
        // name,
        // startDate,
        // endDate,
        // targetingType,
        // budget,
        // status,
        // adGroupId,
        // keywordIds,
        // negativeKeywords,
        // asins,
        profileId,
        campaigns
    } = req.body;
    try {
        let bodyData = {
            campaigns: []
        }
        const getCampaign = await spCampaignsSchema.find(
            { profileId: new Object(profileId) },
            { campaignName: 1, _id: 0 }
        ).lean();

        if (getCampaign?.length) {
            const campaignNames = getCampaign?.map((item) => item?.campaignName)
            const data = campaigns?.filter((item) => campaignNames.includes(item?.name))
            if (data.length) {
                write_logs({
                    message: `Campaign name is already exists!`,
                    log_type: "error",
                });
                return res.status(203).send({
                    message: "Campaign name is already exists!",
                    isSuccess: false,
                });
            }
        }

        if (campaigns?.length) {
            campaigns?.map((campaign) => {
                if (campaign?.endDate) {
                    bodyData.campaigns = [...bodyData.campaigns, {
                        name: campaign?.name,
                        startDate: campaign?.startDate,
                        endDate: campaign?.endDate,
                        targetingType: campaign?.targetingType,
                        state: campaign?.status,
                        budget: {
                            budgetType: "DAILY",
                            budget: campaign?.budget,
                        },
                    }]
                } else {
                    bodyData.campaigns = [...bodyData.campaigns, {
                        name: campaign?.name,
                        startDate: campaign?.startDate,
                        targetingType: campaign?.targetingType,
                        state: campaign?.status,
                        budget: {
                            budgetType: "DAILY",
                            budget: campaign?.budget,
                        },
                    }]
                }
            })
        }

        //NOTE: Below commented code for live amazon entry, so don't uncomment without PM permission.
        // const checkConfigAds = await getAccessToken(companyId, res);
        // const reportPOSTOptions = {
        //     method: "POST",
        //     url: `${process.env.ROOT_LINK}/sp/campaigns`,
        //     headers: {
        //         "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
        //         "Amazon-Advertising-API-Scope": profileId,
        //         Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
        //         Prefer: "return=representation",
        //         Accept: "application/vnd.spCampaign.v3+json",
        //         "Content-Type": "application/vnd.spCampaign.v3+json",
        //     },
        //     body: JSON.stringify(bodyData),
        // };
        // request(reportPOSTOptions, async (error, response, responseBody) => {
        //     if (error) {
        //         return res
        //             .status(203)
        //             .send({ isSuccess: false, message: error.message, error });
        //     }

        //     responseBody = JSON.parse(responseBody);
        //     if (responseBody.message) {
        //         return res.status(203).send({ isSuccess: false, error: responseBody });
        //     } else {
        //         if (responseBody.campaigns.error.length > 0) {
        //             return res.status(203).send({
        //                 isSuccess: false,
        //                 message: "Campaign with the specified name already exists.",
        //                 error: responseBody.campaigns.error,
        //             });
        //         }
        //         responseBody.campaigns.success?.map(async (campaign) => {
        //             const create = {
        //                 portfolioId: campaign?.campaign?.portfolioId,
        //                 profileId,
        //                 type: "Sponsored Products",
        //                 campaignId: campaign?.campaign?.campaignId,
        //                 campaignName: campaign?.campaign?.name,
        //                 campaignStatus: campaign?.campaign?.state,
        //                 campaignBudget: campaign?.campaign?.budget?.budget,
        //                 campaignBudgetType:
        //                     campaign?.campaign?.budget?.budgetType,
        //             };
        //             const createCampaign = new spCampaignsSchema(create);
        //             await createCampaign.save()
        //         })
        //         return res.status(200).send({
        //             isSuccess: true,
        //             message: "Sponsored products campaign created successfully.",
        //         });
        //     }
        // });
        campaigns?.map(async (campaign) => {
            const campaignId = Math.floor(10000000000 + Math.random() * 90000000000);
            const create = {
                // portfolioId: campaign?.campaign?.portfolioId,
                profileId,
                type: "Sponsored Products",
                campaignId: campaignId,
                campaignName: campaign?.name,
                campaignStatus: campaign?.status,
                campaignBudget: campaign?.budget,
                campaignBudgetType: "DAILY"
            };
            const createCampaign = new spCampaignsSchema(create);
            await createCampaign.save()
        })
        return res.status(200).send({
            isSuccess: true,
            message: "Sponsored products campaign created successfully.",
        });
    } catch (error) {
        return res.status(203).send({
            message: "Something went wrong, please try again!",
            isSuccess: false,
            error: error.message,
        });
    }
}
