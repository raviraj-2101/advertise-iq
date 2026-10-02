const request = require("request");
const adGroupSchema = require("../../models/sp/adGroup.model");
const keywordSchema = require("../../models/sp/keyword.model");
const profileSchema = require("../../models/config/profiles.model");
const cronJobHistorySchema = require("../../models/cronJobHistory.model")
const cronJobSchema = require("../../models/cronJob.model")
const { write_logs } = require("../../winston/keyword/logger");
const moment = require("moment-timezone");
const { getAccessToken, cronGetAccessToken, cronCheckCustomerPermission } = require("../../common/helper");

// get keyword list from amazon and store in db
exports.getKeywordList = async (req, res) => {
  const getCronStatus = await cronJobSchema.findOne({
    cronName: "Keywords Listing",
    isActive: false,
  });
  if (getCronStatus) {
    return write_logs({
      message: `Your keyword listing status is deactive.`,
      log_type: "info",
    });
  }
  const todayDate = moment.tz("America/Los_Angeles").format("YYYY-MM-DD");
  const date = moment(todayDate)
    .subtract(1, "day")
    .format("YYYY-MM-DD")
  const adGroupIds = await adGroupSchema.aggregate([
    {
      $match: {
        // profileId: { $nin: ["309547138925706", "1357842260915805", "2241933467116975"] },
        // date: date
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
        "Keywords Listing"
      );
      if (
        checkCustomerPermission
      ) {
        //get config data for amazon credentials
        if (adGroup?.adGroupIds && adGroup?.adGroupIds?.length) {
          Array.from({ length: Math?.ceil(adGroup?.adGroupIds?.length / 100) }, (_, i) => adGroup?.adGroupIds?.slice(i * 100, i * 100 + 100))?.map(async (adGroupArr) => {
            //request body for amazon api
            const bodyData = {
              adGroupIdFilter: {
                include: adGroupArr,
              },
              includeExtendedDataFields: true,
            };
            //object for request in amazon for keyword data
            let nextToken = "";
            async function makeRequest() {

              const checkConfigAds = await cronGetAccessToken(profile?.companyId);
              if (nextToken) {
                bodyData.nextToken = nextToken;
              }
              let reportPOSTOptions = {
                method: "POST",
                url: `${process.env.ROOT_LINK}/sp/keywords/list`,
                headers: {
                  "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
                  "Amazon-Advertising-API-Scope": adGroup.profileId,
                  Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
                  Accept: "application/vnd.spKeyword.v3+json",
                  "Content-Type": "application/vnd.spKeyword.v3+json",
                },
                body: JSON.stringify(bodyData),
              };

              request(reportPOSTOptions, async (error, response, body) => {
                if (error) {
                  write_logs({
                    message: `Error getting Keywords: ${JSON.stringify(error)}`,
                    log_type: "error",
                  });
                  // resolve("ERROR");
                }
                if (response && response.statusCode == 200) {
                  body = JSON.parse(body);
                  if (body.message != "UNAUTHORIZED") {
                    const currentDate = date
                    await Promise.all(
                      Array.from({ length: Math?.ceil(body.keywords?.length / 500) }, (_, i) => body.keywords?.slice(i * 500, i * 500 + 500))?.map(async (keywordsData) => {
                        await Promise.all(
                          keywordsData.map(async (kw) => {
                            // get keyword data
                            let keywordExist = await keywordSchema.findOne({
                              adGroupId: kw.adGroupId,
                              campaignId: kw.campaignId,
                              date: currentDate,
                              keywordId: kw.keywordId,
                              profileId: adGroup.profileId,
                            });
                            if (keywordExist) {
                              //update exist keyword data
                              await keywordSchema.updateOne(
                                {
                                  adGroupId: kw.adGroupId,
                                  campaignId: kw.campaignId,
                                  date: currentDate,
                                  keywordId: kw.keywordId,
                                  profileId: adGroup.profileId,
                                },
                                {
                                  $set: {
                                    bid: kw.bid,
                                    keywordText: kw.keywordText,
                                    status: kw.state,
                                  },
                                }
                              );
                            } else {
                              //add new keyword data in db
                              let keywordData = new keywordSchema({
                                adGroupId: kw.adGroupId,
                                campaignId: kw.campaignId,
                                keywordId: kw.keywordId,
                                keywordText: kw.keywordText,
                                status: kw.state,
                                date: currentDate,
                                bid: kw.bid ?? 0,
                                profileId: adGroup.profileId,
                              });
                              await keywordData.save();
                            }
                          })
                        );
                      })
                    );
                    const totalResults = body.totalResults;
                    nextToken = body.nextToken;
                    if (body.keywords.length < totalResults && nextToken) {
                      makeRequest()
                    } else {
                      write_logs({
                        message: `Keyword added successfully for profile ${adGroup?.profileId}`,
                        log_type: "info",
                      });
                    }
                  } else {
                    write_logs({
                      message: `Error getting Keywords: ${adGroupArr}`,
                      log_type: "error",
                    });
                  }
                } else {
                  write_logs({
                    message: `Error getting Keywords: ${JSON.stringify(response)
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
            cronName: "Keywords Listing",
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
          message: `Account disconnected in keywords listing ${profile.companyId}`,
          log_type: "info",
        });
      }
    })
  );
};

