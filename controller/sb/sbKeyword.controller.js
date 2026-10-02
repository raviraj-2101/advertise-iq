const request = require("request");
const sbAdGroupSchema = require("../../models/sb/sbAdGroup.model");
const sbKeywordSchema = require("../../models/sb/sbKeyword.model");
const profileSchema = require("../../models/config/profiles.model");
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const cronJobSchema = require("../../models/cronJob.model")
const { write_logs } = require("../../winston/sbKeyword/logger");
const moment = require("moment-timezone");
const { getAccessToken, cronGetAccessToken, cronCheckCustomerPermission } = require("../../common/helper");
const sbKeywordReportSchema = require("../../models/sb/sbKeywordReport.model")
const fs = require("fs");
const zlib = require("node:zlib");
const path = require("path");

// get keyword list from amazon and store in db
exports.getSbKeywordList = async (req, res) => {
    const getCronStatus = await cronJobSchema.findOne({
        cronName: "SB Keywords Listing",
        isActive: false,
    });
    if (getCronStatus) {
        return write_logs({
            message: `Your SB keyword listing status is deactive.`,
            log_type: "info",
        });
    }
    const todayDate = moment.tz("America/Los_Angeles").format("YYYY-MM-DD");
    const date = moment(todayDate)
        .subtract(1, "day")
        .format("YYYY-MM-DD")
    const adGroupIds = await sbAdGroupSchema.aggregate([
        {
            $match: {
                // profileId: { $nin: ["309547138925706", "1357842260915805", "2241933467116975"] },
                reportDate: date
            }
        },
        {
            $group: {
                _id: "$profileId", // Group by profileId
                adGroupIds: { $addToSet: "$adGroupId" }, // Collect adGroupId values into an array
            },
        },
        {
            $project: {
                _id: 0, // Exclude the _id field from the output
                profileId: "$_id", // Rename _id to profileId
                adGroupIds: 1,
            },
        },
    ]);
    await Promise.all(
        adGroupIds.map(async (adGroup) => {
            //get profile data by Id
            const profile = await profileSchema.findOne({
                profileId: adGroup.profileId,
            });
            const checkCustomerPermission = await cronCheckCustomerPermission(
                profile?.companyId,
                profile?.profileId,
                "SB Keywords Listing"
            );
            if (
                checkCustomerPermission
            ) {
                //get config data for amazon credentials
                if (adGroup?.adGroupIds && adGroup?.adGroupIds?.length) {
                    Array.from({ length: Math?.ceil(adGroup?.adGroupIds?.length / 100) }, (_, i) => adGroup?.adGroupIds?.slice(i * 100, i * 100 + 100))?.map(async (adGroupArr) => {
                        //request body for amazon api
                        // const bodyData = {
                        //     adGroupIdFilter: {
                        //         include: adGroupArr,
                        //     },
                        //     includeExtendedDataFields: true,
                        // };
                        //object for request in amazon for keyword data
                        const params = new URLSearchParams();

                        // Add `adGroupIdFilter.include` as query params
                        params.append("adGroupIdFilter", adGroupArr.join(","))

                        // Add `includeExtendedDataFields`
                        // params.append("includeExtendedDataFields", "true");
                        // let nextToken = "";
                        async function makeRequest() {

                            const checkConfigAds = await cronGetAccessToken(profile?.companyId);
                            // if (nextToken) {
                            //     bodyData.nextToken = nextToken;
                            // }

                            // Add nextToken if available
                            // if (nextToken) {
                            //     params.append("nextToken", nextToken);
                            // }

                            let reportGETOptions = {
                                method: "GET",
                                url: `${process.env.ROOT_LINK}/sb/keywords?${params.toString()}`,
                                headers: {
                                    "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                                    "Amazon-Advertising-API-Scope": adGroup.profileId,
                                    Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                                    Accept: "application/vnd.sbkeyword.v3.2+json"
                                },
                                // body: JSON.stringify(bodyData),
                            };

                            request(reportGETOptions, async (error, response, body) => {
                                if (error) {
                                    write_logs({
                                        message: `Error getting SB Keywords: ${JSON.stringify(error)}`,
                                        log_type: "error",
                                    });
                                    // resolve("ERROR");
                                }
                                if (response && response.statusCode == 200) {
                                    body = JSON.parse(body);
                                    if (body.message != "UNAUTHORIZED") {
                                        const currentDate = date
                                        await Promise.all(
                                            Array.from({ length: Math?.ceil(body?.length / 500) }, (_, i) => body?.slice(i * 500, i * 500 + 500))?.map(async (keywordsData) => {
                                                await Promise.all(
                                                    // customerId,
                                                    // profileId,
                                                    // adGroupId: item.adGroupId,
                                                    // campaignId: item.campaignId,
                                                    // keywordId: item.keywordId,
                                                    // name: item.keywordText,
                                                    // currencyCode,
                                                    // status: item.state.toUpperCase(),
                                                    // timezone,
                                                    // type: "Sponsored Brands",
                                                    // bid: item.bid ? item.bid : 0,
                                                    // matchType: item.matchType.toUpperCase(),
                                                    // reportDate,
                                                    keywordsData.map(async (kw) => {
                                                        // get keyword data
                                                        let keywordExist = await sbKeywordSchema.findOne({
                                                            adGroupId: kw.adGroupId,
                                                            campaignId: kw.campaignId,
                                                            reportDate: currentDate,
                                                            keywordId: kw.keywordId,
                                                            profileId: adGroup.profileId,
                                                        });
                                                        if (keywordExist) {
                                                            //update exist keyword data
                                                            await sbKeywordSchema.updateOne(
                                                                {
                                                                    adGroupId: kw.adGroupId,
                                                                    campaignId: kw.campaignId,
                                                                    reportDate: currentDate,
                                                                    keywordId: kw.keywordId,
                                                                    profileId: adGroup.profileId,
                                                                },
                                                                {
                                                                    $set: {
                                                                        bid: kw.bid,
                                                                        name: kw.keywordText,
                                                                        status: kw.state,
                                                                        currencyCode: profile.currencyCode,
                                                                        timezone: profile.timezone,
                                                                        matchType: kw.matchType.toUpperCase(),
                                                                    },
                                                                }
                                                            );
                                                        } else {
                                                            //add new keyword data in db
                                                            let keywordData = new sbKeywordSchema({
                                                                adGroupId: kw.adGroupId,
                                                                campaignId: kw.campaignId,
                                                                keywordId: kw.keywordId,
                                                                name: kw.keywordText,
                                                                status: kw.state,
                                                                reportDate: currentDate,
                                                                bid: kw.bid || 0,
                                                                profileId: adGroup.profileId,
                                                                currencyCode: profile.currencyCode,
                                                                timezone: profile.timezone,
                                                                matchType: kw.matchType.toUpperCase(),
                                                            });
                                                            await keywordData.save();
                                                        }
                                                    })
                                                );
                                            })
                                        );
                                        // const totalResults = body.totalResults;
                                        // nextToken = body.nextToken;
                                        // if (body.keywords.length < totalResults && nextToken) {
                                        //     makeRequest()
                                        // } else {
                                        write_logs({
                                            message: `SB Keyword added successfully for profile ${adGroup?.profileId}`,
                                            log_type: "info",
                                        });
                                        // }
                                    } else {
                                        write_logs({
                                            message: `Error getting SB Keywords: ${adGroupArr}`,
                                            log_type: "error",
                                        });
                                    }
                                } else {
                                    write_logs({
                                        message: `Error getting SB Keywords: ${JSON.stringify(response)
                                            }`,
                                        log_type: "error",
                                    });
                                }
                            });

                        }
                        makeRequest()
                    })
                    const createCronHistory = new cronJobHistorySchema({
                        companyId: profile.companyId,
                        profileId: profile.profileId,
                        cronName: "SB Keywords Listing",
                        status: "COMPLETED",
                        historyDate: date,
                    });
                    await createCronHistory.save();
                } else {
                    write_logs({
                        message: `Error getting SB Adgroup`,
                        log_type: "error",
                    });
                }
            } else {
                return write_logs({
                    message: `Account disconnected in SB keywords listing ${profile.companyId}`,
                    log_type: "info",
                });
            }
        })
    );
};

exports.cronSbKeywordReport = async () => {
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
                    "SB Keyword Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    //get config data for amazon credentials
                    const checkConfigAds = await cronGetAccessToken(i.companyId);
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        //generate SB keyword report
                        const reportSpResponse = await sbKeywordGenerateReport(
                            i.companyId,
                            currentDate,
                            i.profileId,
                            startDate,
                            endDate,
                            checkConfigAds,
                            i.timezone,
                        );
                        write_logs({
                            message: `SB Keyword ${reportSpResponse}`,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in SB Keyword Report ${profile?.companyId}`,
                        log_type: "info",
                    });
                }
            })
        ).then(() => {
            return write_logs({
                message: "SB Keyword report updated successfully..",
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
async function sbKeywordGenerateReport(
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
                adProduct: "SPONSORED_BRANDS",
                groupBy: ["targeting"],
                columns: [
                    "campaignId",
                    "adGroupId",
                    "adGroupName",
                    "impressions",
                    "clicks",
                    "cost",
                    "sales",
                    "purchases",
                    "keywordId",
                    "date",
                    "adKeywordStatus",
                    "keywordText",
                    "matchType",
                    "keywordBid"
                ],
                reportTypeId: "sbTargeting",
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
            const getReportData = await sbKeywordReportSchema.findOne({
                startDate,
                endDate,
                profileId,
                reportTypeId: "sbTargeting",
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
                                message: `SB Keyword Report err: ${JSON.stringify(
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
                                await sbKeywordReportSchema.findByIdAndUpdate(
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
                                    message: `SB Keyword report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `SB Keyword report amazon err: ${JSON.stringify(
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
                                message: `SB Keyword report err: ${JSON.stringify(
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
                                        const updated = await sbKeywordReportSchema.updateOne(
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
                                    const zipFilePath = `upload/keyword/sb-report/${getReportData.startDate}-${getReportData.reportId}.zip`;
                                    const extractionPath = `upload/keyword/sb-report/${getReportData.startDate}-${getReportData.reportId}.json`;
                                    const file = fs.createWriteStream(zipFilePath);
                                    const downloadRequest = request(body.url);
                                    downloadRequest.on("error", (error) => {
                                        write_logs({
                                            message: `SB Keyword Report err: ${JSON.stringify(
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
                                                        message: `SB Keyword Report err: ${unzipError}`,
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
                                                            let placement = await sbKeywordSchema.findOne({
                                                                profileId,
                                                                campaignId: item.campaignId,
                                                                reportDate: item.date,
                                                                adGroupId: item.adGroupId,
                                                                keywordId: item.keywordId,
                                                            });
                                                            if (placement) {
                                                                //update spTarget data
                                                                await sbKeywordSchema.updateOne(
                                                                    {
                                                                        profileId,
                                                                        campaignId: item.campaignId,
                                                                        adGroupId: item.adGroupId,
                                                                        keywordId: item.keywordId,
                                                                        reportDate: item.date,
                                                                    },
                                                                    {
                                                                        $set: {
                                                                            name: item.keywordText,
                                                                            bid: item.keywordBid,
                                                                            status:
                                                                                item.adKeywordStatus.toUpperCase(),
                                                                            matchType: item.matchType,
                                                                            spend: item.cost ? item.cost : 0,
                                                                            sales: item.sales
                                                                                ? item.sales
                                                                                : 0,
                                                                            timezone,
                                                                            impressions: item.impressions,
                                                                            clicks: item.clicks,
                                                                            orders:
                                                                                item.purchases
                                                                                    ? item.purchases
                                                                                    : 0,
                                                                            roas:
                                                                                item.sales != 0 &&
                                                                                    item.cost != 0
                                                                                    ? (
                                                                                        item.sales /
                                                                                        item.cost
                                                                                    ).toFixed(2)
                                                                                    : 0,
                                                                            acos:
                                                                                item.sales != 0 &&
                                                                                    item.cost != 0
                                                                                    ? (
                                                                                        (item.cost /
                                                                                            item.sales) *
                                                                                        100
                                                                                    ).toFixed(2)
                                                                                    : 0,
                                                                        },
                                                                    }
                                                                );
                                                            } else {
                                                                //add spTarget data
                                                                let spTargets = new sbKeywordSchema({
                                                                    profileId,
                                                                    reportDate: item.date,
                                                                    campaignId: item.campaignId,
                                                                    adGroupId: item.adGroupId,
                                                                    keywordId: item.keywordId,
                                                                    name: item.keywordText,
                                                                    bid: item.keywordBid,
                                                                    status:
                                                                        item.adKeywordStatus.toUpperCase(),
                                                                    matchType: item.matchType,
                                                                    spend: item.cost ? item.cost : 0,
                                                                    timezone,
                                                                    sales: item.sales
                                                                        ? item.sales
                                                                        : 0,
                                                                    impressions: item.impressions,
                                                                    clicks: item.clicks,
                                                                    orders:
                                                                        item.purchases
                                                                            ? item.purchases
                                                                            : 0,
                                                                    roas:
                                                                        item.sales != 0 &&
                                                                            item.cost != 0
                                                                            ? (
                                                                                item.sales /
                                                                                item.cost
                                                                            ).toFixed(2)
                                                                            : 0,
                                                                    acos:
                                                                        item.sales != 0 &&
                                                                            item.cost != 0
                                                                            ? (
                                                                                (item.cost /
                                                                                    item.sales) *
                                                                                100
                                                                            ).toFixed(2)
                                                                            : 0,
                                                                });
                                                                await spTargets.save();
                                                            }
                                                        })
                                                    })
                                                );

                                                const getCronData = await cronJobHistorySchema.findOne({
                                                    companyId: companyId,
                                                    profileId: profileId,
                                                    cronName: "SB Keyword Report",
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
                                    message: `SB Keyword report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `SB Keyword report amazon err: ${JSON.stringify(
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
                            message: `SB Keyword report err: ${JSON.stringify(
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
                                reportTypeId: "sbTargeting",
                                startDate,
                                endDate,
                                reportId: body.reportId,
                                status: body.status,
                                profileId,
                                cronRun: false,
                            };
                            // add spTrget report in db
                            let createSpReport = new sbKeywordReportSchema(create);
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
                                `SB Keyword report err token expire: ${body.details}`
                            );
                            write_logs({
                                message: `SB Keyword report err token expire: ${body.details}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    } else {
                        console.log(
                            `SB Keyword report amazon err: ${JSON.stringify(
                                response
                            )}`
                        );
                        write_logs({
                            message: `SB Keyword report amazon err: ${JSON.stringify(
                                response
                            )}`,
                            log_type: "error",
                        });
                        resolve("ERROR");
                    }
                });
            }
        } catch (error) {
            console.log(`SB Keyword report err: ${JSON.stringify(error)}`);
            write_logs({
                message: `SB Keyword report err: ${JSON.stringify(error)}`,
                log_type: "error",
            });
            resolve("ERROR");
        }
    });
}