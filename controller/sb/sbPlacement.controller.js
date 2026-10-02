const request = require("request");
const sbPlacementReportSchema = require("../../models/sb/sbPlacementReport.model");
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const profileSchema = require("../../models/config/profiles.model");
const sbPlacementSchema = require("../../models/sb/sbPlacement.model");
const moment = require("moment-timezone");
const fs = require("fs");
const zlib = require("node:zlib");
const path = require("path");
const mongoose = require("mongoose");
const { write_logs } = require("../../winston/placement/logger");
const { getAccessToken, getPaginatedData, checkPermission, cronCheckCustomerPermission } = require("../../common/helper");
const sbCampaignsSchema = require("../../models/sb/sbCampaign.model")
const cronJobSchema = require("../../models/cronJob.model")

RegExp.escape = function (string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

//generate placement report 
exports.generateReport = async (req, res) => {
    try {
        const getCronStatus = await cronJobSchema.findOne({
            cronName: "SB Placement Report",
            isActive: false,
        });
        if (getCronStatus) {
            return write_logs({
                message: `Your SB placement report status is deactive.`,
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
                    "SB Placement Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const reportSpResponse = await sbGenerateReport(
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
                        .send({ isSuccess: false, message: `Account disconnected in SB Placement Report ${i.companyId}`, error });
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
exports.cronPlacementReport = async () => {
    try {
        const getCronStatus = await cronJobSchema.findOne({
            cronName: "SB Placement Report",
            isActive: false,
        });
        if (getCronStatus) {
            return write_logs({
                message: `Your SB placement report status is deactive.`,
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
                    "SB Placement Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const reportSbResponse = await sbGenerateReport(
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
                            message: `SB ${reportSbResponse}`,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in SB Placement Report ${profile.companyId}`,
                        log_type: "info",
                    });
                }
            })
        );
        return write_logs({
            message: "SB Placement report updated successfully..",
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
async function sbGenerateReport(
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
                adProduct: "SPONSORED_BRANDS",
                groupBy: ["campaignPlacement"],
                columns: [
                    "campaignId",
                    "campaignName",
                    "campaignStatus",
                    "campaignBudgetAmount",
                    "campaignBudgetType",
                    "impressions",
                    "clicks",
                    "cost",

                    // "purchases",
                    // "unitsSoldClicks",
                    // "sales",

                    "purchases",
                    "unitsSoldClicks",
                    "sales",

                    "date",
                    // "campaignBiddingStrategy",
                    // "costPerClick",
                    // "clickThroughRate",
                    // "spend",
                    "placementClassification",
                    // "keywordId",
                    // "keyword",
                    // "keywordType",
                    // "adGroupId",
                ],
                reportTypeId: "sbCampaignPlacement",
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
        // const bodyData = {
        //     metrics:
        //         "impressions,clicks,cost,attributedConversions14d,attributedSales14d,attributedUnitsOrdered14d,campaignStatus,campaignName,campaignBudget,campaignBudgetType",
        //     segment: "placement",
        //     creativeType: "all",
        // };
        // let reportPOSTOptions = {
        //     method: "POST",
        //     url: `${process.env.ROOT_LINK}/v2/hsa/campaigns/report`,
        //     headers: {
        //         "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
        //         "Amazon-Advertising-API-Scope": profileId,
        //         Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
        //         "Content-Type": "application/json",
        //     },
        // };
        // bodyData.reportDate = startDate;
        // reportPOSTOptions.body = JSON.stringify(bodyData);
        try {
            //get placement report data
            const getReportData = await sbPlacementReportSchema.findOne({
                startDate,
                endDate,
                profileId,
                reportTypeId: "sbPlacements",
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
                                message: `Placement SB Report err: ${JSON.stringify(error)}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                        if (response && response.statusCode == 200) {
                            body = JSON.parse(body);
                            if (body.reportId && body.code != "UNAUTHORIZED") {
                                await sbPlacementReportSchema.findByIdAndUpdate(
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
                                    message: `Placement SB report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `Placement SB report amazon err: ${JSON.stringify(
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
                                message: `Placement SB report err: ${JSON.stringify(error)}`,
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
                                        const updated = await sbPlacementReportSchema.updateOne(
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
                                    const zipFilePath = `upload/placements/sb-report/${getReportData.startDate}-${getReportData.reportId}.zip`;
                                    //unzipped report file
                                    const extractionPath = `upload/placements/sb-report/${getReportData.startDate}-${getReportData.reportId}.json`;
                                    //add placement report file 
                                    const file = fs.createWriteStream(zipFilePath);
                                    console.log("request~body.url:", body.url);
                                    const downloadRequest = request(body.url);
                                    downloadRequest.on("error", (error) => {
                                        write_logs({
                                            message: `Placement SB Report err: ${JSON.stringify(
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
                                                        message: `Placement SB Report err: ${unzipError}`,
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
                                                                // let campaignBiddingStrategy = "";
                                                                // if (item.campaignBiddingStrategy == "legacy") {
                                                                //     campaignBiddingStrategy =
                                                                //         "Dynamic bids - down only";
                                                                // } else if (
                                                                //     item.campaignBiddingStrategy ==
                                                                //     "optimizeForSales"
                                                                // ) {
                                                                //     campaignBiddingStrategy =
                                                                //         "Dynamic bids - up and down";
                                                                // } else if (
                                                                //     item.campaignBiddingStrategy == "manual"
                                                                // ) {
                                                                //     campaignBiddingStrategy = "Fixed bid";
                                                                // }
                                                                //check placement is already exist in db or not
                                                                let placement = await sbPlacementSchema.findOne({
                                                                    profileId,
                                                                    campaignId: item.campaignId,
                                                                    placement: placementName,
                                                                    reportDate: item?.date,
                                                                });
                                                                let getManagePlacement =
                                                                    await sbPlacementSchema.findOne({
                                                                        profileId,
                                                                        campaignId: item.campaignId,
                                                                    });
                                                                let isManage = true;
                                                                if (getManagePlacement) {
                                                                    isManage = getManagePlacement.isManage
                                                                        ? true
                                                                        : false;
                                                                }
                                                                let placementPreviousDay = await sbPlacementSchema
                                                                    .findOne({
                                                                        campaignId: item.campaignId,
                                                                        placement: placementName,
                                                                    })
                                                                    .sort({ reportDate: -1 });
                                                                if (placement) {
                                                                    //update existed placement data
                                                                    await sbPlacementSchema.updateOne(
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
                                                                                sales: item.sales ? item.sales : 0,
                                                                                orders: item.purchases
                                                                                    ? item.purchases
                                                                                    : 0,
                                                                                acos:
                                                                                    item.sales != 0 && item.cost != 0
                                                                                        ? (
                                                                                            (item.cost / item.sales) *
                                                                                            100
                                                                                        ).toFixed(2)
                                                                                        : 0,
                                                                                roas:
                                                                                    item.sales != 0 && item.cost != 0
                                                                                        ? (item.sales / item.cost).toFixed(
                                                                                            2
                                                                                        )
                                                                                        : 0,
                                                                                cvr:
                                                                                    item.purchases != 0 &&
                                                                                        item.clicks != 0
                                                                                        ? (
                                                                                            (item.purchases / item.clicks) *
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
                                                                                conversion: item.purchases
                                                                                    ? item.purchases
                                                                                    : 0,
                                                                                placement: placementName,
                                                                                units: item.unitsSoldClicks
                                                                                    ? item.unitsSoldClicks
                                                                                    : 0,
                                                                                isManage,
                                                                            },
                                                                        }
                                                                    );
                                                                    await sbPlacementSchema.updateMany(
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
                                                                    let placementReport = new sbPlacementSchema({
                                                                        profileId,
                                                                        type: "Sponsored Brands",
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
                                                                        sales: item.sales ? item.sales : 0,
                                                                        orders: item.purchases
                                                                            ? item.purchases
                                                                            : 0,
                                                                        acos:
                                                                            item.sales != 0 && item.cost != 0
                                                                                ? (
                                                                                    (item.cost / item.sales) *
                                                                                    100
                                                                                ).toFixed(2)
                                                                                : 0,
                                                                        roas:
                                                                            item.sales != 0 && item.cost != 0
                                                                                ? (item.sales / item.cost).toFixed(2)
                                                                                : 0,
                                                                        cvr:
                                                                            item.purchases != 0 && item.clicks != 0
                                                                                ? (
                                                                                    (item.purchases / item.clicks) *
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
                                                                        conversion: item.purchases
                                                                            ? item.purchases
                                                                            : 0,
                                                                        timezone,
                                                                        placement: placementName,
                                                                        units: item.unitsSoldClicks
                                                                            ? item.unitsSoldClicks
                                                                            : 0,
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
                                                    cronName: "SB Placement Report",
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
                                    message: `Placement SB report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `Placement SB report amazon err: ${JSON.stringify(
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
                            message: `Placement SB report err: ${JSON.stringify(error)}`,
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
                                cronName: "SB Placement Report",
                                status: "PENDING",
                                historyDate: currentDate,
                            });
                            await createCronHistory.save();

                            let create = {
                                adProduct: body.configuration.adProduct,
                                reportTypeId: "sbPlacements",
                                startDate,
                                endDate,
                                reportId: body.reportId,
                                status: body.status,
                                profileId,
                                cronRun: false,
                            };
                            let createSbReport = new sbPlacementReportSchema(create);
                            await createSbReport.save();

                            resolve(body.status);
                        } else {
                            console.log(
                                `Placement SB report err token expire: ${body.details}`
                            );
                            write_logs({
                                message: `Placement SB report err token expire: ${body.details}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    } else {
                        console.log(
                            `Placement SB report amazon err: ${JSON.stringify(response)}`
                        );
                        write_logs({
                            message: `Placement SB report amazon err: ${JSON.stringify(
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
            console.log(`Placement SB report err: ${JSON.stringify(error)}`);
            write_logs({
                message: `Placement SB report err: ${JSON.stringify(error)}`,
                log_type: "error",
            });
            resolve("ERROR");
        }
    });
}

// //update placement modifier 
// exports.cronUpdateSBPlacementModifire = async (req, res) => {
//     try {
//         //get profile data
//         const getProfileId = await profileSchema.find({
//             isActive: true,
//         });
//         await Promise.all(
//             getProfileId.map(async (i) => {

//                 const checkConfigAds = await getAccessToken(i.companyId);
//                 if (checkConfigAds && checkConfigAds.adsAccessToken) {
//                     const currentDate = moment.tz(i.timezone).format("YYYY-MM-DD");
//                     const reportDate = moment(currentDate)
//                         .subtract(1, "day")
//                         .format("YYYY-MM-DD");
//                     const createCronHistory = new cronJobHistorySchema({
//                         companyId: i.companyId,
//                         profileId: i.profileId,
//                         cronName: "Placement Modifier",
//                         status: "PENDING",
//                         historyDate: currentDate,
//                     });
//                     await createCronHistory.save();
//                     const spCampaigns = await getSPCampaignsFromAmazon(
//                         i.companyId,
//                         i.profileId,
//                         currentDate,
//                         checkConfigAds,
//                         reportDate
//                     );
//                     write_logs({
//                         message: `SP ${spCampaigns}`,
//                         log_type: "info",
//                     });
//                 }
//             })
//         );
//         return write_logs({
//             message: "SB Placement modifire updated successfully.",
//             log_type: "info",
//         });
//     } catch (error) {
//         return write_logs({
//             message: `SB Error: ${JSON.stringify(error)}`,
//             log_type: "error",
//         });
//     }
// };

// async function getSPCampaignsFromAmazon(
//     companyId,
//     profileId,
//     currentDate,
//     checkConfigAds,
//     reportDate
// ) {
//     return new Promise((resolve, reject) => {
//         let bodyData = {
//             maxResults: 1000,
//         };
//         //object for mazon api call for get campaign list
//         const spOptions = {
//             method: "POST",
//             url: `${process.env.ROOT_LINK}/sb/v4/campaigns/list`,
//             headers: {
//                 "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
//                 "Amazon-Advertising-API-Scope": profileId,
//                 Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
//                 Accept: "application/vnd.spCampaign.v3+json",
//                 "Content-Type": "application/vnd.spCampaign.v3+json",
//             },
//         };
//         const campaigns = [];
//         let nextToken = "";
//         function makeRequest() {
//             if (nextToken) {
//                 bodyData.nextToken = nextToken;
//             }
//             spOptions.body = JSON.stringify(bodyData);
//             request(spOptions, async (error, response, body) => {
//                 if (error) {
//                     console.log(`Campaign listing err: ${JSON.stringify(error)}`);
//                     write_logs({
//                         message: `Campaign listing err: ${JSON.stringify(error)}`,
//                         log_type: "error",
//                     });
//                     resolve("ERROR");
//                 }
//                 if (response && response.statusCode == 200) {
//                     body = JSON.parse(body);
//                     if (body.message !== "Unauthorized") {
//                         if (body.campaigns.length > 0) {
//                             body.campaigns.forEach(async (item) => {
//                                 // if (item.state == "ARCHIVED") {
//                                 //   await placementSchema.deleteMany({
//                                 //     campaignId: Number(item.campaignId),
//                                 //   });
//                                 // await applyOnAmazonSchema.deleteMany({
//                                 //   campaignId: Number(item.campaignId),
//                                 // });
//                                 // } else {
//                                 if (item.dynamicBidding.placementBidding.length > 0) {
//                                     await Promise.all(
//                                         //add placement modifier to placements
//                                         item.dynamicBidding.placementBidding.map(
//                                             async (placementBid) => {
//                                                 if (
//                                                     placementBid.placement == "PLACEMENT_PRODUCT_PAGE"
//                                                 ) {
//                                                     await placementSchema.updateMany(
//                                                         {
//                                                             profileId,
//                                                             // companyId,
//                                                             campaignId: Number(item.campaignId),
//                                                             placement: "Product pages",
//                                                         },
//                                                         {
//                                                             placementModifier: placementBid.percentage,
//                                                             portfolioId: item.portfolioId,
//                                                         },
//                                                         { new: true }
//                                                     );
//                                                 }
//                                                 if (placementBid.placement == "PLACEMENT_TOP") {
//                                                     await placementSchema.updateMany(
//                                                         {
//                                                             profileId,
//                                                             // companyId,
//                                                             campaignId: Number(item.campaignId),
//                                                             placement: "Top of Search",
//                                                         },
//                                                         {
//                                                             placementModifier: placementBid.percentage,
//                                                             portfolioId: item.portfolioId,
//                                                         },
//                                                         { new: true }
//                                                     );
//                                                 }
//                                                 if (
//                                                     placementBid.placement == "PLACEMENT_REST_OF_SEARCH"
//                                                 ) {
//                                                     await placementSchema.updateMany(
//                                                         {
//                                                             profileId,
//                                                             // companyId,
//                                                             campaignId: Number(item.campaignId),
//                                                             placement: "Rest of Search",
//                                                         },
//                                                         {
//                                                             placementModifier: placementBid.percentage,
//                                                             portfolioId: item.portfolioId,
//                                                         },
//                                                         { new: true }
//                                                     );
//                                                 }
//                                             }
//                                         )
//                                     );
//                                     if (item.dynamicBidding.placementBidding.length < 3) {
//                                         await placementSchema.updateMany(
//                                             {
//                                                 profileId,
//                                                 campaignId: Number(item.campaignId),
//                                                 placement: { $in: ["Rest of Search", "Top of Search", "Product pages"] },
//                                             },
//                                             {
//                                                 portfolioId: item.portfolioId,
//                                             },
//                                             { new: true }
//                                         );
//                                     }
//                                 } else {
//                                     await placementSchema.updateMany(
//                                         {
//                                             profileId,
//                                             // companyId,
//                                             campaignId: Number(item.campaignId),
//                                             placement: "Product pages",
//                                         },
//                                         {
//                                             placementModifier: 0,
//                                             portfolioId: item.portfolioId,
//                                         },
//                                         { new: true }
//                                     );
//                                     await placementSchema.updateMany(
//                                         {
//                                             profileId,
//                                             // companyId,
//                                             campaignId: Number(item.campaignId),
//                                             placement: "Top of Search",
//                                         },
//                                         {
//                                             placementModifier: 0,
//                                             portfolioId: item.portfolioId,
//                                         },
//                                         { new: true }
//                                     );
//                                     await placementSchema.updateMany(
//                                         {
//                                             profileId,
//                                             // companyId,
//                                             campaignId: Number(item.campaignId),
//                                             placement: "Rest of Search",
//                                         },
//                                         {
//                                             placementModifier: 0,
//                                             portfolioId: item.portfolioId,
//                                         },
//                                         { new: true }
//                                     );
//                                 }
//                                 // }
//                             });
//                             const totalResults = body.totalResults;
//                             nextToken = body.nextToken;
//                             if (campaigns.length < totalResults && nextToken) {
//                                 makeRequest();
//                             } else {
//                                 resolve(
//                                     `Placement modifire updated successfully for date ${reportDate}`
//                                 );
//                             }
//                         } else {
//                             resolve(
//                                 `Placement modifire updated successfully for date ${reportDate}`
//                             );
//                         }
//                         const getCronData = await cronJobHistorySchema.findOne({
//                             companyId: companyId,
//                             profileId: profileId,
//                             cronName: "Placement Modifier",
//                             status: "PENDING",
//                             historyDate: currentDate,
//                         });
//                         if (getCronData) {
//                             await cronJobHistorySchema.findByIdAndUpdate(
//                                 { _id: getCronData._id },
//                                 {
//                                     status: "COMPLETED",
//                                 },
//                                 { new: true }
//                             );
//                         }
//                     } else {
//                         console.log(`Campaign listing err token expire: ${body.details} `);
//                         write_logs({
//                             message: `Campaign listing err token expire: ${body.details
//                                 } `,
//                             log_type: "error",
//                         });
//                         resolve("ERROR");
//                     }
//                 } else {
//                     console.log(
//                         `Campaign listing amazon err: ${JSON.stringify(response)} `
//                     );
//                     write_logs({
//                         message: `Campaign listing amazon err: ${JSON.stringify(response)} `,
//                         log_type: "error",
//                     });
//                     resolve("ERROR");
//                 }
//             });
//         }
//         makeRequest();
//     });
// }
