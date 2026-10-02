const { getAccessToken } = require("../../common/helper");
const configAdsSchema = require("../../models/config/configAds.model");
const profileSchema = require("../../models/config/profiles.model");
const cronJobSchema = require("../../models/cronJob.model")
const cronJobSchedularSchema = require("../../models/cronJobSchedular.model")
const request = require("request");
const { write_logs } = require("../../winston/updateToken/logger");

// generate access token form amazon
exports.generateAccessToken = async (req, res) => {
  try {
    const companyId = req?.user?.company;

    //get amazon creadentials from config table
    const checkConfigAds = await configAdsSchema.findOne({
      companyId,
      // adsRefreshToken: process.env.REFRESH_TOKEN,
    });
    if (checkConfigAds) {
      // amazon api request for access token 
      request.post(
        {
          url: process.env.AUTH_LINK,
          form: {
            grant_type: "refresh_token",
            client_id: checkConfigAds.clientId,
            refresh_token: checkConfigAds.adsRefreshToken,
            client_secret: checkConfigAds.clientSecret,
          },
        },
        async (error, httpResponse, body) => {
          try {
            if (error) {
              return res.status(203).send({
                error,
                isSuccess: false,
              });
            }
            let data = JSON.parse(body);
            // update config data with new access token in db
            await configAdsSchema.findByIdAndUpdate(
              { _id: checkConfigAds._id },
              {
                adsAccessToken: data.access_token,
                adsRefreshToken: data.refresh_token,
                adsTokenExpire: data.expires_in,
              },
              {
                new: true,
              }
            );
            return res.status(200).send({
              isSuccess: true,
              content: {
                adsAccessToken: data.access_token,
              },
              message: "Access token updated successfully.",
            });
          } catch (error) {
            return console.log({ message: error.message, error });
          }
        }
      );
    }
    else {
      return res.status(203).send({
        message: "Credentials not found",
        isSuccess: false,
      });
    }
  } catch (err) {
    return res.status(203).send({
      message: err.message,
      err,
      isSuccess: false,
    });
  }
};

//get all profiles 
exports.listProfiles = async (req, res) => {
  const companyId = req?.user?.company;
  const { company } = req.body
  try {
    const id = company ? company : companyId
    const profiles = await profileSchema.find(
      { companyId: id },
      {
        marketplaceStringId: 0,
        _id: 0,
        updatedAt: 0,
        createdAt: 0,
        type: 0,
        companyId: 0,
      }
    ).sort({ countryCode: -1 });
    return res.status(200).send({
      isSuccess: true,
      message: "Profiles list fetched successfully",
      data: profiles,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ isSuccess: false, message: error.message, error });
  }
};

// fetch profiles from amazon
exports.getAmazonProfile = async (req, res) => {
  const companyId = req?.user?.company;
  const { company } = req?.body
  try {
    const id = company ? company : companyId
    //get amazon credentials
    const checkConfigAds = await getAccessToken(id, res);
    let options = {
      method: "GET",
      url: `${process.env.ROOT_LINK}/v2/profiles`,
      headers: {
        "Amazon-Advertising-API-ClientId": checkConfigAds.clientId,
        Authorization: `Bearer ${checkConfigAds.adsAccessToken}`,
      },
    };

    // add limit for keyword and adGroup bid
    const minCountryBid = {
      US: {
        SP: {
          adGroup: {
            min: 0.02,
            max: 1000
          },
          keyword: {
            min: 0.02,
            max: 1000
          }
        }
      },
    }
    request(options, async function (error, response, body) {
      if (error) {
        return res
          .status(203)
          .send({ isSuccess: false, message: error.message, error });
      }
      body = JSON.parse(body);
      if (body.code !== "UNAUTHORIZED") {
        await Promise.all(
          body.map(async (item) => {
            if (item.accountInfo.type == "vendor") {
              let item1 = {
                companyId: id,
                profileId: parseInt(item.profileId),
                countryCode: item.countryCode,
                currencyCode: item.currencyCode,
                timezone: item.timezone,
                marketplaceStringId: item.accountInfo.marketplaceStringId,
                type: item.accountInfo.type,
                name: item.accountInfo.name,
                limit: minCountryBid[item?.countryCode]
              };
              //check profile is exist or not
              const getProfile = await profileSchema.findOne({
                companyId: id,
                profileId: item.profileId,
              });
              const getCrons = await cronJobSchema.find();
              await Promise.all(
                getCrons.map(async (cronData) => {
                  const cronSchedularData = await cronJobSchedularSchema.findOne({
                    cronId: cronData._id,
                    cronName: cronData.cronName,
                  })
                  if (cronSchedularData) {
                    await cronJobSchedularSchema.findOneAndUpdate(
                      {
                        cronId: cronData._id,
                        cronName: cronData.cronName,
                      },
                      {
                        $set: {
                          companyId: id,
                          profileId: item.profileId,
                          timezone: item.timezone,
                        }
                      },
                      {
                        new: true
                      }
                    )
                  } else {

                    const createCron = await cronJobSchedularSchema({
                      companyId: id,
                      profileId: item.profileId,
                      cronId: cronData._id,
                      cronName: cronData.cronName,
                      timezone: item.timezone,
                      isActive: true,
                    });
                    createCron.save();
                  }
                })
              );
              if (!getProfile) {
                // add profiles
                let createProfile = new profileSchema(item1);
                await createProfile.save();

              } else {
                //update profiles
                await profileSchema.findByIdAndUpdate(
                  { _id: getProfile._id },
                  item1,
                  { new: true }
                );
              }
            }
          })
        );

        //get profiles by company Id
        const profiles = await profileSchema.find({
          companyId: id,
        });
        return res.status(200).send({
          isSuccess: true,
          message: "Profiles list successfully",
          data: profiles,
        });
      } else {
        return res.status(401).send({
          isSuccess: false,
          message: "Unauthorized",
        });
      }
    }
    )
  } catch (error) {
    return res
      .status(400)
      .send({ isSuccess: false, message: error.message, error });
  }
};

// get access token and refresh token from amazon in uopdate in db
exports.cronUpdateToken = async () => {
  try {
    //get amazon credentials
    const checkConfigAds = await configAdsSchema.find();
    await Promise.all(
      checkConfigAds.map(async (company) => {
        //config data wise amazon api call 
        request.post(
          {
            url: process.env.AUTH_LINK,
            form: {
              grant_type: "refresh_token",
              client_id: company.clientId,
              refresh_token: company.adsRefreshToken,
              client_secret: company.clientSecret,
            },
          },
          async (error, httpResponse, body) => {
            try {
              if (error) {
                return write_logs({
                  message: `Something went wrong while token update: ${JSON.stringify(
                    error
                  )}`,
                  log_type: "error",
                });
              }
              let data = JSON.parse(body);
              //update config data in db
              await configAdsSchema.findByIdAndUpdate(
                { _id: company._id },
                {
                  adsAccessToken: data.access_token,
                  adsRefreshToken: data.refresh_token,
                },
                {
                  new: true,
                }
              );
            } catch (error) {
              return write_logs({
                message: error.message,
                log_type: "error",
              });
            }
          }
        );
      })
    );
    return write_logs({
      message: "Access token updated successfully",
      log_type: "info",
    });
  } catch (err) {
    return write_logs({
      message: err,
      log_type: "error",
    });
  }
};

//update profile data
exports.updateProfile = async (req, res) => {
  const { companyId, profileId, isActive } = req.body
  try {
    await profileSchema.findOneAndUpdate(
      { profileId: parseInt(profileId), companyId: companyId },
      {
        $set: {
          isActive: isActive
        }
      },
      {
        new: true,
      }
    );
    return res
      .status(200)
      .send({ isSuccess: true, message: "Profile updated successfully." });
  } catch (error) {
    return res
      .status(500)
      .send({ isSuccess: false, message: error.message, error });
  }
}

// add amazon credentials in config table
exports.linkToAmazon = async (req, res) => {
  const { companyId, clientSecret, clientId, adsRefreshToken } = req.body;
  try {
    // find config data
    const findConfigAds = await configAdsSchema.findOne({ companyId: companyId });

    if (!findConfigAds) {
      //add config data
      await configAdsSchema.create({
        companyId: companyId,
        clientId: clientId,
        clientSecret: clientSecret,
        adsRefreshToken: adsRefreshToken
      })
    } else {
      //update config data
      await configAdsSchema.findOneAndUpdate({
        companyId: companyId,
      }, {
        companyId: companyId,
        clientId: clientId,
        clientSecret: clientSecret,
        adsRefreshToken: adsRefreshToken
      })
    }
    return res.status(200).send({
      isSuccess: true,
      message: "ConfigAds data updated successfully.",
    })
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};