const request = require("request");
const {
    cronGetAccessToken, cronCheckCustomerPermission,
} = require("../../common/helper");
const profileSchema = require("../../models/config/profiles.model");
const { write_logs } = require("../../winston/placement/logger");
const spCampaignsSchema = require("../../models/sp/spCampaign.model")
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const moment = require("moment-timezone");

// get campaign list from amazon and store in db
exports.getCampaignList = async (req, res) => {

    //get profile data by Id
    const profileData = await profileSchema.find({
        isActive: true
    });

    const placementType = {
        PLACEMENT_PRODUCT_PAGE: "Product pages",
        PLACEMENT_TOP: "Top of Search",
        PLACEMENT_REST_OF_SEARCH: "Rest of Search"
    }
    await Promise.all(
        profileData.map(async (profile) => {
            const checkCustomerPermission = await cronCheckCustomerPermission(
                profile?.companyId,
                profile?.profileId,
                "Campaign Listing"
            );
            if (
                checkCustomerPermission
            ) {
                const todayDate = moment.tz(profile.timezone).format("YYYY-MM-DD");
                const currentDate =
                    moment(todayDate)
                        // .subtract(1, "day")
                        .format("YYYY-MM-DD")
                const createCronHistory = new cronJobHistorySchema({
                    companyId: profile.companyId,
                    profileId: profile.profileId,
                    cronName: "Campaign Listing",
                    status: "PENDING",
                    historyDate: currentDate,
                });
                await createCronHistory.save();
                //get config data for amazon credentials
                const checkConfigAds = await cronGetAccessToken(profile?.companyId);

                //object for request in amazon for campaign data
                let nextToken = "";

                let bodyData = { includeExtendedDataFields: true }
                function makeRequest() {
                    if (nextToken) {
                        bodyData.nextToken = nextToken;
                    }
                    //object for request in amazon for campaign data
                    let reportPOSTOptions = {
                        method: "POST",
                        url: `${process.env.ROOT_LINK}/sp/campaigns/list`,
                        headers: {
                            "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                            "Amazon-Advertising-API-Scope": profile.profileId,
                            Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                            Accept: "application/vnd.spCampaign.v3+json",
                            "Content-Type": "application/vnd.spCampaign.v3+json",
                        },
                        body: JSON.stringify(bodyData),
                    };

                    request(reportPOSTOptions, async (error, response, body) => {
                        if (error) {
                            write_logs({
                                message: `Error getting Adgroup: ${JSON.stringify(error)}`,
                                log_type: "error",
                            });
                            // resolve("ERROR");
                        }
                        if (response && response.statusCode == 200) {
                            body = JSON.parse(body);
                            if (body.message != "UNAUTHORIZED") {
                                Array.from({ length: Math?.ceil(body.campaigns?.length / 500) }, (_, i) => body.campaigns?.slice(i * 500, i * 500 + 500))?.map((campaigns) => {
                                    campaigns.map(async (cp) => {
                                        if (cp?.dynamicBidding?.placementBidding?.length > 0) {

                                            cp?.dynamicBidding?.placementBidding?.map(async (placement) => {
                                                // get adGroup data 
                                                let campaignExist = await spCampaignsSchema.findOne({
                                                    profileId: Number(profile?.profileId),
                                                    placement: placementType[placement?.placement],
                                                    campaignId: cp?.campaignId?.toString(),
                                                });
                                                if (!campaignExist?.endDate) {
                                                    if (placement?.placement !== "Off Amazon") {
                                                        if (campaignExist) {
                                                            //update exist campaign data
                                                            await spCampaignsSchema.updateOne(
                                                                {
                                                                    profileId: Number(profile?.profileId),
                                                                    placement: placementType[placement?.placement],
                                                                    campaignId: cp?.campaignId?.toString(),
                                                                },
                                                                {
                                                                    $set: {
                                                                        campaignName: cp?.name,
                                                                        campaignStatus: cp?.state,
                                                                        type: "Sponsored Products",
                                                                        portfolioId: cp?.portfolioId?.toString(),
                                                                        placementModifier: placement?.percentage,
                                                                        campaignBudget: cp?.budget?.budget,
                                                                        campaignBudgetType: cp?.budget?.budgetType
                                                                    },
                                                                }
                                                            );
                                                        } else {
                                                            //add new campaign data in db
                                                            let campaignData = new spCampaignsSchema({
                                                                profileId: profile?.profileId,
                                                                placement: placementType[placement?.placement],
                                                                campaignId: cp?.campaignId,
                                                                portfolioId: cp?.portfolioId,
                                                                campaignName: cp?.name,
                                                                campaignStatus: cp?.state,
                                                                type: "Sponsored Products",
                                                                placementModifier: placement?.percentage,
                                                                campaignBudget: cp?.budget?.budget,
                                                                campaignBudgetType: cp?.budget?.budgetType
                                                            });
                                                            await campaignData.save();
                                                        }
                                                    }
                                                } else {
                                                    await spCampaignsSchema.deleteOne({
                                                        profileId: profile.profileId,
                                                        placement: placement.placement,
                                                        campaignId: cp.campaignId,
                                                    });
                                                }
                                            })
                                        } else {
                                            let campaignExist = await spCampaignsSchema.findOne({
                                                profileId: Number(profile?.profileId),
                                                campaignId: cp?.campaignId?.toString(),
                                            });
                                            if (!campaignExist?.endDate) {
                                                if (campaignExist) {
                                                    //update exist campaign data
                                                    await spCampaignsSchema.updateOne(
                                                        {
                                                            profileId: Number(profile?.profileId),
                                                            campaignId: cp?.campaignId?.toString(),
                                                        },
                                                        {
                                                            $set: {
                                                                campaignName: cp?.name,
                                                                campaignStatus: cp?.state,
                                                                type: "Sponsored Products",
                                                                placement: null,
                                                                placementModifier: 0,
                                                                portfolioId: cp?.portfolioId?.toString(),
                                                                campaignBudget: cp?.budget?.budget,
                                                                campaignBudgetType: cp?.budget?.budgetType
                                                            },
                                                        }
                                                    );
                                                } else {
                                                    //add new campaign data in db
                                                    let campaignData = new spCampaignsSchema({
                                                        profileId: profile?.profileId,
                                                        placement: null,
                                                        campaignId: cp?.campaignId,
                                                        portfolioId: cp?.portfolioId,
                                                        campaignName: cp?.name,
                                                        campaignStatus: cp?.state,
                                                        type: "Sponsored Products",
                                                        placementModifier: 0,
                                                        campaignBudget: cp?.budget?.budget,
                                                        campaignBudgetType: cp?.budget?.budgetType
                                                    });
                                                    await campaignData.save();
                                                }
                                            } else {
                                                await spCampaignsSchema.deleteOne({
                                                    profileId: Number(profile.profileId),
                                                    campaignId: cp?.campaignId?.toString(),
                                                });
                                            }
                                        }
                                    })
                                })

                                const totalResults = body.totalResults;
                                nextToken = body.nextToken;
                                if (body.campaigns.length < totalResults && nextToken) {
                                    makeRequest()
                                } else {
                                    const getCronData = await cronJobHistorySchema.findOne({
                                        companyId: profile.companyId,
                                        profileId: profile.profileId,
                                        cronName: "Campaign Listing",
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
                                    write_logs({
                                        message: `Campaigns added successfully`,
                                        log_type: "info",
                                    });
                                }
                            } else {
                                write_logs({
                                    message: `Error getting Campaign: ${profile.profileId
                                        }`,
                                    log_type: "error",
                                });
                            }
                        } else {
                            write_logs({
                                message: `Error getting Campaign: ${JSON.stringify(response)
                                    }`,
                                log_type: "error",
                            });
                        }
                    });
                }

                makeRequest()
            } else {
                return write_logs({
                    message: `Account disconnected in Campaign listing ${profile?.companyId}`,
                    log_type: "info",
                });
            }
        })

    );
};