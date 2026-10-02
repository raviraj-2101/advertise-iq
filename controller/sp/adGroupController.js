const request = require("request");
const { write_logs } = require("../../winston/adGroup/logger");
const adGroupSchema = require("../../models/sp/adGroup.model");
const profileSchema = require("../../models/config/profiles.model")
const cronJobSchema = require("../../models/cronJob.model")
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const moment = require("moment-timezone");
const spCampaignsSchema = require("../../models/sp/spCampaign.model");
const { getAccessToken, cronCheckCustomerPermission } = require("../../common/helper");

// get adGroup list from amazon and store in db
exports.getAdGroupList = async (req, res) => {
  const getCronStatus = await cronJobSchema.findOne({
    cronName: "AdGroups Listing",
    isActive: false,
  });
  if (getCronStatus) {
    return write_logs({
      message: `Your keyword listing status is deactive.`,
      log_type: "info",
    });
  }
  const todayDate = moment.tz("America/Los_Angeles").format("YYYY-MM-DD");
  const date =
    moment(todayDate)
      .subtract(1, "day")
      .format("YYYY-MM-DD")
  const profileIds = await spCampaignsSchema.aggregate([
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
      const checkCustomerPermission = await cronCheckCustomerPermission(
        profileData?.companyId,
        profileData?.profileId,
        "AdGroups Listing"
      );
      if (
        checkCustomerPermission
      ) {
        //get config data for amazon credentials
        const checkConfigAds = await getAccessToken(profileData?.companyId);
        if (profile.campaignIds && profile?.campaignIds?.length) {
          Array.from({ length: Math?.ceil(profile.campaignIds?.length / 100) }, (_, i) => profile.campaignIds?.slice(i * 100, i * 100 + 100))?.map((campaignArr) => {

            //object for request in amazon for keyword data
            let nextToken = "";
            const bodyData = {
              campaignIdFilter: {
                include: campaignArr,
                profileId: profile.profileId,
              },
            };
            function makeRequest() {
              if (nextToken) {
                bodyData.nextToken = nextToken;
              }
              //object for request in amazon for adGroup data
              let reportPOSTOptions = {
                method: "POST",
                url: `${process.env.ROOT_LINK}/sp/adGroups/list`,
                headers: {
                  "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                  "Amazon-Advertising-API-Scope": profile.profileId,
                  Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                  Accept: "application/vnd.spAdGroup.v3+json",
                  "Content-Type": "application/vnd.spAdGroup.v3+json",
                },
                body: JSON.stringify(bodyData),
              };

              // if (Object.keys(bodyData)?.length > 0) {
              //   reportPOSTOptions.bodyData = JSON.stringify(bodyData)
              // }
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
                    const currentDate = date;
                    await Promise.all(
                      Array.from({ length: Math?.ceil(body.adGroups?.length / 500) }, (_, i) => body.adGroups?.slice(i * 500, i * 500 + 500))?.map(async (adGroupsData) => {
                        await Promise.all(
                          adGroupsData.map(async (ad) => {
                            // get adGroup data 
                            let adGroupExist = await adGroupSchema.findOne({
                              adGroupId: ad.adGroupId,
                              campaignId: ad.campaignId,
                              date: currentDate,
                              profileId: profile.profileId,
                            });
                            if (adGroupExist) {
                              //update exist adGroup data
                              await adGroupSchema.updateOne(
                                {
                                  adGroupId: ad.adGroupId,
                                  campaignId: ad.campaignId,
                                  date: currentDate,
                                  profileId: profile.profileId,
                                },
                                {
                                  $set: {
                                    bid: ad.defaultBid,
                                    name: ad.name,
                                    status: ad.state,
                                  },
                                }
                              );
                            } else {
                              //add new adGroup data in db
                              let groupData = new adGroupSchema({
                                adGroupId: ad.adGroupId,
                                campaignId: ad.campaignId,
                                bid: ad.defaultBid,
                                name: ad.name,
                                status: ad.state,
                                date: currentDate,
                                profileId: profile.profileId,
                              });
                              await groupData.save();
                            }
                          })
                        )
                      })

                    )
                    const totalResults = body.totalResults;
                    nextToken = body.nextToken;
                    if (body.adGroups.length < totalResults && nextToken) {
                      makeRequest()
                    } else {
                      write_logs({
                        message: `AdGroup added successfully for profile ${profile?.profileId}`,
                        log_type: "info",
                      });
                    }
                  } else {
                    write_logs({
                      message: `Error getting Adgroup: ${profile}`,
                      log_type: "error",
                    });
                  }
                } else {
                  write_logs({
                    message: `Error getting Adgroup: ${JSON.stringify(response)
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
            cronName: "AdGroups Listing",
            status: "COMPLETED",
            historyDate: date,
          });
          await createCronHistory.save();
        } else {
          write_logs({
            message: `Error getting Adgroup`,
            log_type: "error",
          });
        }
      } else {
        return write_logs({
          message: `Account disconnected in AdGroup listing ${profileData?.companyId}`,
          log_type: "info",
        });
      }

    })
  );
};
