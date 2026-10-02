const request = require("request");
const { write_logs } = require("../../winston/sbAdGroup/logger");
const sdAdGroupSchema = require("../../models/sd/sdAdGroup.model");
const profileSchema = require("../../models/config/profiles.model")
const cronJobSchema = require("../../models/cronJob.model")
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const moment = require("moment-timezone");
const sdCampaignsSchema = require("../../models/sd/sdCampaign.model");
const { getAccessToken, cronCheckCustomerPermission } = require("../../common/helper");
const sdAdGroupReportSchema = require("../../models/sd/sdAdGroupReport.model")
const fs = require("fs");
const zlib = require("node:zlib");
const path = require("path");

// get adGroup list from amazon and store in db
exports.getSdAdGroupList = async (req, res) => {
    const getCronStatus = await cronJobSchema.findOne({
        cronName: "SD AdGroups Listing",
        isActive: false,
    });
    if (getCronStatus) {
        return write_logs({
            message: `Your SD AdGroup listing status is deactive.`,
            log_type: "info",
        });
    }
    const profileIds = await sdCampaignsSchema.aggregate([
        {
            $group: {
                _id: "$profileId", // Group by profileId
                campaignIds: { $addToSet: "$campaignId" }, // Collect campaignId values into an array
            },
        },
        {
            $project: {
                _id: 0,
                profileId: { $toString: "$_id" }, // Convert profileId to string
                campaignIds: {
                    $map: {
                        input: "$campaignIds",
                        as: "campaignId",
                        in: { $toString: "$$campaignId" }, // Convert each campaignId to string
                    },
                },
            },
        },
    ]);

    await Promise.all(
        profileIds.map(async (profile) => {
            //get profile data by Id
            const profileData = await profileSchema.findOne({
                profileId: parseInt(profile.profileId),
            });
            const todayDate = moment.tz(profileData.timezone).format("YYYY-MM-DD");
            const date = moment(todayDate)
                .subtract(1, "day")
                .format("YYYY-MM-DD")
            const checkCustomerPermission = await cronCheckCustomerPermission(
                profileData?.companyId,
                profileData?.profileId,
                "SD AdGroups Listing"
            );
            if (
                checkCustomerPermission
            ) {
                //get config data for amazon credentials
                const checkConfigAds = await getAccessToken(profileData?.companyId);
                if (profile.campaignIds && profile?.campaignIds?.length) {
                    Array.from({ length: Math?.ceil(profile.campaignIds?.length / 100) }, (_, i) => profile.campaignIds?.slice(i * 100, i * 100 + 100))?.map((campaignArr) => {

                        //object for request in amazon for keyword data
                        const params = new URLSearchParams();

                        // Add `adGroupIdFilter.include` as query params
                        params.append("campaignIdFilter", campaignArr.join(","))
                        function makeRequest() {
                            // if (nextToken) {
                            //     bodyData.nextToken = nextToken;
                            // }
                            //object for request in amazon for adGroup data
                            let reportGETOptions = {
                                method: "GET",
                                url: `${process.env.ROOT_LINK}/sd/adGroups?${params.toString()}`,
                                headers: {
                                    "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                                    "Amazon-Advertising-API-Scope": profile.profileId,
                                    Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                                    // Accept: "application/vnd.sbadgroupresource.v4+json",
                                    // "Content-Type": "application/vnd.sbadgroupresource.v4+json",
                                },
                            };

                            request(reportGETOptions, async (error, response, body) => {
                                if (error) {
                                    write_logs({
                                        message: `Error getting SD Adgroup: ${JSON.stringify(error)}`,
                                        log_type: "error",
                                    });
                                    // resolve("ERROR");
                                }
                                if (response && response.statusCode == 200) {
                                    body = JSON.parse(body);
                                    if (body.message != "UNAUTHORIZED") {
                                        const currentDate = date;
                                        await Promise.all(
                                            Array.from({ length: Math?.ceil(body?.length / 500) }, (_, i) => body?.slice(i * 500, i * 500 + 500))?.map(async (adGroupsData) => {
                                                await Promise.all(
                                                    adGroupsData.map(async (ad) => {
                                                        // get adGroup data 
                                                        let adGroupExist = await sdAdGroupSchema.findOne({
                                                            adGroupId: ad.adGroupId,
                                                            campaignId: ad.campaignId,
                                                            reportDate: date,
                                                            profileId: profile.profileId,
                                                        });
                                                        if (adGroupExist) {
                                                            //update exist adGroup data
                                                            await sdAdGroupSchema.updateOne(
                                                                {
                                                                    adGroupId: ad.adGroupId,
                                                                    campaignId: ad.campaignId,
                                                                    reportDate: currentDate,
                                                                    profileId: profile.profileId,
                                                                },
                                                                {
                                                                    $set: {
                                                                        defaultBid: ad.defaultBid,
                                                                        name: ad.name,
                                                                        creativeType: item.creativeType ? item.creativeType : null,
                                                                        bidOptimization: item.bidOptimization
                                                                            ? item.bidOptimization
                                                                            : null,
                                                                        status: ad.state,
                                                                        timezone: profileData.timezone,
                                                                        currencyCode: profileData.currencyCode
                                                                    },
                                                                }
                                                            );
                                                        } else {
                                                            //add new adGroup data in db
                                                            let groupData = new sdAdGroupSchema({
                                                                adGroupId: ad.adGroupId,
                                                                campaignId: ad.campaignId,
                                                                defaultBid: ad.defaultBid,
                                                                name: ad.name,
                                                                status: ad.state,
                                                                reportDate: currentDate,
                                                                profileId: profile.profileId,
                                                                timezone: profileData.timezone,
                                                                creativeType: item.creativeType ? item.creativeType : null,
                                                                bidOptimization: item.bidOptimization
                                                                    ? item.bidOptimization
                                                                    : null,
                                                                currencyCode: profileData.currencyCode
                                                            });
                                                            await groupData.save();
                                                        }
                                                    })
                                                )
                                            })

                                        )
                                        write_logs({
                                            message: `SD AdGroup added successfully for profile ${profile?.profileId}`,
                                            log_type: "info",
                                        });
                                    } else {
                                        write_logs({
                                            message: `Error getting SD Adgroup: ${profile}`,
                                            log_type: "error",
                                        });
                                    }
                                } else {
                                    write_logs({
                                        message: `Error getting SD Adgroup: ${JSON.stringify(response)
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
                        cronName: "SD AdGroups Listing",
                        status: "COMPLETED",
                        historyDate: date,
                    });
                    await createCronHistory.save();
                } else {
                    write_logs({
                        message: `Error getting SD Adgroup`,
                        log_type: "error",
                    });
                }
            } else {
                return write_logs({
                    message: `Account disconnected in SD AdGroup listing ${profileData?.companyId}`,
                    log_type: "info",
                });
            }

        })
    );
};

// generate placement report and add data in placement table
exports.cronSdAdGroupReport = async () => {
    try {
        const getCronStatus = await cronJobSchema.findOne({
            cronName: "SD AdGroup Report",
            isActive: false,
        });
        if (getCronStatus) {
            return write_logs({
                message: `Your SD AdGroup report status is deactive.`,
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
                    "SD AdGroup Report"
                );
                if (
                    checkCustomerPermission
                ) {
                    if (checkConfigAds && checkConfigAds.adsAccessToken) {
                        const reportSbResponse = await sdGenerateAdGroupReport(
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
                            message: `SD ${reportSbResponse}`,
                            log_type: "info",
                        });
                    }
                } else {
                    return write_logs({
                        message: `Account disconnected in SD AdGroup Report ${profile.companyId}`,
                        log_type: "info",
                    });
                }
            })
        );
        return write_logs({
            message: "SD AdGroup report updated successfully..",
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
async function sdGenerateAdGroupReport(
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
                adProduct: "SPONSORED_DISPLAY",
                groupBy: ["adGroup"],
                columns: [
                    "campaignId",
                    "adGroupId",
                    "adGroupName",
                    "bidOptimization",
                    "impressions",
                    "clicks",
                    "cost",
                    "sales",
                    "purchases"
                ],
                reportTypeId: "sdAdGroup",
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
        //         "impressions,clicks,cost,attributedConversions14d,sales,attributedUnitsOrdered14d,campaignStatus,campaignName,campaignBudget,campaignBudgetType",
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
            const getReportData = await sdAdGroupReportSchema.findOne({
                startDate,
                endDate,
                profileId,
                reportTypeId: "sdAdGroup",
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
                                message: `SD AdGroup Report err: ${JSON.stringify(error)}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                        if (response && response.statusCode == 200) {
                            body = JSON.parse(body);
                            if (body.reportId && body.code != "UNAUTHORIZED") {
                                await sdAdGroupReportSchema.findByIdAndUpdate(
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
                                    message: `SD AdGroup report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `SD AdGroup report amazon err: ${JSON.stringify(
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
                                message: `SD AdGroup report err: ${JSON.stringify(error)}`,
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
                                        const updated = await sdAdGroupReportSchema.updateOne(
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
                                    const zipFilePath = `upload/adGroups/sd-report/${getReportData.startDate}-${getReportData.reportId}.zip`;
                                    //unzipped report file
                                    const extractionPath = `upload/adGroups/sd-report/${getReportData.startDate}-${getReportData.reportId}.json`;
                                    //add adGroup report file 
                                    const file = fs.createWriteStream(zipFilePath);
                                    console.log("request~body.url:", body.url);
                                    const downloadRequest = request(body.url);
                                    downloadRequest.on("error", (error) => {
                                        write_logs({
                                            message: `SD AdGroup Report err: ${JSON.stringify(
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
                                                        message: `SD AdGroup Report err: ${unzipError}`,
                                                        log_type: "error",
                                                    });
                                                    resolve("ERROR");
                                                }

                                                const data = require(path.join(
                                                    __dirname,
                                                    "../../",
                                                    extractionPath
                                                ));

                                                Array.from({ length: Math?.ceil(data?.length / 500) }, (_, i) => data?.slice(i * 500, i * 500 + 500))?.map(async (adGroupsData) => {
                                                    await Promise.all(
                                                        adGroupsData.map(async (item) => {

                                                            //update existed AdGroup data
                                                            await sdAdGroupSchema.updateOne(
                                                                {
                                                                    profileId,
                                                                    campaignId: item.campaignId,
                                                                    adGroupId: item.adGroupId,
                                                                    reportDate: item?.date,
                                                                },
                                                                {
                                                                    $set: {
                                                                        name: item.adGroupName,
                                                                        spend: item.cost ? item.cost : 0,
                                                                        sales: item.sales
                                                                            ? item.sales
                                                                            : 0,
                                                                        impressions: item.impressions,
                                                                        clicks: item.clicks,
                                                                        orders:
                                                                            item.purchases
                                                                                ? item.purchases
                                                                                : 0,
                                                                        costType: item.costType,
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
                                                                },
                                                                {
                                                                    upsert: true
                                                                }
                                                            );


                                                        })
                                                    );
                                                })
                                                const getCronData = await cronJobHistorySchema.findOne({
                                                    companyId: companyId,
                                                    profileId: profileId,
                                                    cronName: "SD AdGroup Report",
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
                                    message: `SD AdGroup report err token expire: ${body.details}`,
                                    log_type: "error",
                                });
                                resolve("ERROR");
                            }
                        } else {
                            write_logs({
                                message: `SD AdGroup report amazon err: ${JSON.stringify(
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
                            message: `SD AdGroup report err: ${JSON.stringify(error)}`,
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
                                cronName: "SD AdGroup Report",
                                status: "PENDING",
                                historyDate: currentDate,
                            });
                            await createCronHistory.save();

                            let create = {
                                adProduct: "SPONSORED_DISPLAY",
                                reportTypeId: "sdAdGroup",
                                startDate,
                                endDate,
                                reportId: body.reportId,
                                status: body.status,
                                profileId,
                            };
                            let createSbReport = new sdAdGroupReportSchema(create);
                            await createSbReport.save();

                            resolve(body.status);
                        } else {
                            console.log(
                                `SD AdGroup report err token expire: ${body.details}`
                            );
                            write_logs({
                                message: `SD AdGroup report err token expire: ${body.details}`,
                                log_type: "error",
                            });
                            resolve("ERROR");
                        }
                    } else {
                        console.log(
                            `SD AdGroup report amazon err: ${JSON.stringify(response)}`
                        );
                        write_logs({
                            message: `SD AdGroup report amazon err: ${JSON.stringify(
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
            console.log(`SD AdGroup report err: ${JSON.stringify(error)}`);
            write_logs({
                message: `SD AdGroup report err: ${JSON.stringify(error)}`,
                log_type: "error",
            });
            resolve("ERROR");
        }
    });
}
