const request = require("request");
const spTargetReportSchema = require("../../models/sp/spTargetReport.model");
const spTargetingSchema = require("../../models/sp/spTargeting.model");
const profileSchema = require("../../models/config/profiles.model");
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const { write_logs } = require("../../winston/targeting/logger");
const moment = require("moment-timezone");
const fs = require("fs");
const zlib = require("node:zlib");
const path = require("path");
const { cronGetAccessToken, cronCheckCustomerPermission } = require("../../common/helper");

exports.cronDaySpTargetReport = async () => {
    try {
        // get profile data
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
                const checkCustomerPermission = await cronCheckCustomerPermission(
                    i?.companyId,
                    i?.profileId,
                    "spTarget Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    //get config data for amazon credentials
                    const checkConfigAds = await cronGetAccessToken(i.companyId);
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        //generate spTarget report
                        const reportSpResponse = await spTargetingGenerateReport(
                            i.companyId,
                            currentDate,
                            i.profileId,
                            startDate,
                            endDate,
                            checkConfigAds,
                            i.timezone,
                        );
                        write_logs({
                            message: `SP Target ${reportSpResponse}`,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in spTarget Report ${profile?.companyId}`,
                        log_type: "info",
                    });
                }
            })
        );
        return write_logs({
            message: "spTarget report updated successfully..",
            log_type: "info",
        });
    } catch (error) {
        return write_logs({
            message: `Error: ${error.message}`,
            log_type: "error",
        });
    }
};

exports.cronSpTargetReport = async () => {
    try {
        // get profile data
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

                const checkCustomerPermission = await cronCheckCustomerPermission(
                    i?.companyId,
                    i?.profileId,
                    "spTarget Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    //get config data for amazon credentials
                    const checkConfigAds = await cronGetAccessToken(i.companyId);
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        //generate spTarget report
                        const reportSpResponse = await spTargetingGenerateReport(
                            i.companyId,
                            currentDate,
                            i.profileId,
                            startDate,
                            endDate,
                            checkConfigAds,
                            i.timezone,
                        );
                        write_logs({
                            message: `SP Target ${reportSpResponse}`,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in spTarget Report ${profile?.companyId}`,
                        log_type: "info",
                    });
                }
            })
        ).then(() => {
            return write_logs({
                message: "spTarget report updated successfully..",
                log_type: "info",
            });
        })
    } catch (error) {
        return write_logs({
            message: `Error: ${error.message}`,
            log_type: "error",
        });
    }
};

//generate target report and add data 
async function spTargetingGenerateReport(
    companyId,
    currentDate,
    profileId,
    startDate,
    endDate,
    checkConfigAds,
    timezone,
    report,
) {
    return new Promise(async (resolve, reject) => {
        // body data for amazon api 
        const bodyData = {
            name: "",
            startDate: startDate,
            endDate: endDate,
            configuration: {
                adProduct: "SPONSORED_PRODUCTS",
                groupBy: ["targeting"],
                columns: [
                    "campaignId",
                    "adGroupId",
                    "keywordId",
                    "keyword",
                    "adKeywordStatus",
                    "keywordBid",
                    "targeting",
                    "keywordType",
                    "matchType",
                    "impressions",
                    "clicks",
                    "cost",
                    "purchases1d",
                    "purchases7d",
                    "purchases14d",
                    "purchases30d",
                    "date",
                    "sales1d",
                    "sales7d",
                ],
                reportTypeId: "spTargeting",
                timeUnit: "DAILY",
                format: "GZIP_JSON",
            },
        };

        // object for api request in amazon for get report
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
            // get report data 
            const getReportData = await spTargetReportSchema.findOne({
                startDate,
                endDate,
                profileId,
                reportTypeId: "spTargeting",
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
                                message: `Placement SP Target Report err: ${JSON.stringify(
                                    error
                                )}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                        if (response && response.statusCode == 200) {
                            body = JSON.parse(body);
                            if (body.reportId && body.code != "UNAUTHORIZED") {
                                // get report data form db
                                await spTargetReportSchema.findByIdAndUpdate(
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
                                    message: `Placement SP Target report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `Placement SP Target report amazon err: ${JSON.stringify(
                                    response
                                )}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    });
                } else if (getReportData.status == "COMPLETED") {
                    resolve(getReportData.status);
                } else {
                    //object for get report data by reportId
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
                                message: `Placement SP Target report err: ${JSON.stringify(
                                    error
                                )}`,
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
                                        const updated = await spTargetReportSchema.updateOne(
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
                                    // unzip spTarget report
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
                                    console.log("request ~ body.url:", body.url);
                                    const zipFilePath = `upload/targets/sp-target/${getReportData.startDate}-${getReportData.reportId}.zip`;
                                    const extractionPath = `upload/targets/sp-target/${getReportData.startDate}-${getReportData.reportId}.json`;
                                    const file = fs.createWriteStream(zipFilePath);
                                    const downloadRequest = request(body.url);
                                    downloadRequest.on("error", (error) => {
                                        write_logs({
                                            message: `Placement SP Target Report err: ${JSON.stringify(
                                                error
                                            )}`,
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
                                                        message: `Placement SP Target Report err: ${unzipError}`,
                                                        log_type: "error",
                                                    });
                                                    resolve("ERROR");
                                                }
                                                const data = require(path.join(
                                                    __dirname,
                                                    "../../",
                                                    extractionPath
                                                ));
                                                await Promise.all(
                                                    Array.from({ length: Math?.ceil(data?.length / 20000) }, (_, i) => data?.slice(i * 20000, i * 20000 + 20000))?.map((spTargetsData) => {
                                                        spTargetsData.map(async (item) => {
                                                            //check spTarget data is exist or not
                                                            let placement = await spTargetingSchema.findOne({
                                                                profileId,
                                                                date: item.date,
                                                                adGroupId: item.adGroupId,
                                                                keywordId: item.keywordId,
                                                            });
                                                            if (placement) {
                                                                //update spTarget data
                                                                await spTargetingSchema.updateOne(
                                                                    {
                                                                        profileId,
                                                                        date: item.date,
                                                                        adGroupId: item.adGroupId,
                                                                        campaignId: item.campaignId,
                                                                        keywordId: item.keywordId,
                                                                    },
                                                                    {
                                                                        $set: {
                                                                            keywordId: item.keywordId,
                                                                            cost: item.cost,
                                                                            matchType: item.matchType,
                                                                            impressions: item.impressions,
                                                                            keywordBid: item.keywordBid ?? 0,
                                                                            targeting: item.targeting,
                                                                            adKeywordStatus: item.adKeywordStatus,
                                                                            keywordType: item.keywordType,
                                                                            clicks: item.clicks,
                                                                            keyword: item.keyword,
                                                                            spend: item.cost ? item.cost : 0,
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
                                                                            sales: item.sales7d ? item.sales7d : 0,
                                                                        },
                                                                    },
                                                                );
                                                            } else {
                                                                //add spTarget data
                                                                let spTargets = new spTargetingSchema({
                                                                    profileId,
                                                                    date: item.date,
                                                                    campaignId: item.campaignId,
                                                                    adGroupId: item.adGroupId,
                                                                    keywordId: item.keywordId,
                                                                    cost: item.cost,
                                                                    matchType: item.matchType,
                                                                    impressions: item.impressions,
                                                                    keywordBid: item.keywordBid ?? 0,
                                                                    targeting: item.targeting,
                                                                    adKeywordStatus: item.adKeywordStatus,
                                                                    keywordType: item.keywordType,
                                                                    clicks: item.clicks,
                                                                    keyword: item.keyword,
                                                                    spend: item.cost ? item.cost : 0,
                                                                    orders: item.purchases7d ? item.purchases7d : 0,
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
                                                                    sales: item.sales7d ? item.sales7d : 0,
                                                                });
                                                                await spTargets.save();
                                                            }
                                                        })
                                                    })
                                                );

                                                const getCronData = await cronJobHistorySchema.findOne({
                                                    companyId: companyId,
                                                    profileId: profileId,
                                                    cronName: "spTarget Report",
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
                                    message: `Placement SP Target report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `Placement SP Target report amazon err: ${JSON.stringify(
                                    response
                                )}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    });
                }
            } else {
                //generate spTarget report
                request(reportPOSTOptions, async (error, response, body) => {
                    if (error) {
                        write_logs({
                            message: `Placement SP Target report err: ${JSON.stringify(
                                error
                            )}`,
                            log_type: "error",
                        });
                        resolve("ERROR");
                    }
                    if (response && response.statusCode == 200) {
                        body = JSON.parse(body);
                        if (body.reportId && body.code != "UNAUTHORIZED") {
                            let create = {
                                reportTypeId: "spTargeting",
                                startDate,
                                endDate,
                                reportId: body.reportId,
                                status: body.status,
                                profileId,
                                cronRun: false,
                            };
                            // add spTrget report in db
                            let createSpReport = new spTargetReportSchema(create);
                            await createSpReport.save();
                            const createCronHistory = new cronJobHistorySchema({
                                companyId: companyId,
                                profileId: profileId,
                                cronName: "spTarget Report",
                                status: "PENDING",
                                historyDate: currentDate,
                            });
                            await createCronHistory.save();
                            resolve(body.status);
                        } else {
                            console.log(
                                `Placement SP Target report err token expire: ${body.details}`
                            );
                            write_logs({
                                message: `Placement SP Target report err token expire: ${body.details}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    } else {
                        console.log(
                            `Placement SP Target report amazon err: ${JSON.stringify(
                                response
                            )}`
                        );
                        write_logs({
                            message: `Placement SP Target report amazon err: ${JSON.stringify(
                                response
                            )}`,
                            log_type: "error",
                        });
                        resolve("ERROR");
                    }
                });
            }
        } catch (error) {
            console.log(`Placement SP Target report err: ${JSON.stringify(error)}`);
            write_logs({
                message: `Placement SP Target report err: ${JSON.stringify(error)}`,
                log_type: "error",
            });
            resolve("ERROR");
        }
    });
}
