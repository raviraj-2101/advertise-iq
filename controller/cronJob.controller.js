const cronJobSchema = require("../models/cronJob.model");
const cronJobHistorySchema = require("../models/cronJobHistory.model");
const { getProfile, checkPermission } = require("../common/helper");
const moment = require("moment-timezone");
const profileSchema = require("../models/config/profiles.model");
const { write_logs } = require("../winston/masterCron/logger");
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const cronJobSchedularSchema = require("../models/cronJobSchedular.model");

exports.createCronJob = async (req, res) => {
  const companyId = req.user.company;
  const { profileId, cronName } = req.body;
  try {
    const getAccount = await getProfile(companyId, profileId);
    if (!getAccount) {
      return res
        .status(203)
        .send({ message: "Please select valid account", isSuccess: false });
    }
    const createCron = await cronJobSchema({
      companyId,
      profileId,
      cronName,
    });
    createCron
      .save()
      .then(async (rule) => {
        return res.status(200).send({
          isSuccess: true,
          message: "Record created successfully",
          data: rule,
        });
      })
      .catch((error) => {
        return res.status(203).send({
          error: error.message,
          message: "Something went wrong, please try again!",
          isSuccess: false,
        });
      });
  } catch (error) {
    return res.status(203).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.getAllCronJob = async (req, res) => {
  const pageNo = req.body.pageNo ? req.body.pageNo : 1;
  const perPage = req.body.perPage ? req.body.perPage : 10;
  const { search, isActive, type, profileId } = req.body;
  try {
    if (!profileId) {
      return res
        .status(203)
        .send({ isSuccess: false, message: "Profile id required!" });
    }
    let filter = {};
    if (search) {
      filter.cronName = { $regex: new RegExp(search, "i") };
    }
    if (isActive) {
      filter.isActive = isActive;
    }
    if (type) {
      filter.cronName = { $regex: new RegExp(type, "i") };
    }
    const getCrons = await cronJobSchema.find(filter);
    const getProfile = await profileSchema.findOne({ profileId });
    let nextDateList = moment().tz(getProfile.timezone).format("YYYY-MM-DD");
    nextDateList = nextDateList + " 11:00 PM";
    let nextDateReport = moment()
      .tz(getProfile.timezone)
      .add(1, "days")
      .format("YYYY-MM-DD");
    nextDateReport = nextDateReport + " 12:15 AM";
    await Promise.all(
      getCrons.map(async (cron) => {
        if (cron.cronName == "Campaign Listing") {
          const getCronData = await cronJobHistorySchema
            .findOne({
              companyId: req.user.company,
              profileId,
              cronName: "Campaign Listing",
            })
            .sort({ updatedAt: -1 });
          cron["lastRun"] =
            getCronData == null
              ? ""
              : moment
                .tz(getCronData.createdAt, getProfile.timezone)
                .format("YYYY-MM-DD hh:mm A");

          cron["nextRun"] = nextDateList;
          cron["status"] = getCronData == null ? "" : getCronData.status;
          if (cron.isActive) {
            cron["nextRun"] = nextDateList;
          } else {
            cron["nextRun"] = "";
          }
        }
        if (cron.cronName == "AdGroups Listing") {
          const getCronData = await cronJobHistorySchema
            .findOne({
              companyId: req.user.company,
              profileId,
              cronName: "AdGroups Listing",
            })
            .sort({ updatedAt: -1 });
          cron["lastRun"] =
            getCronData == null
              ? ""
              : moment
                .tz(getCronData.createdAt, getProfile.timezone)
                .format("YYYY-MM-DD hh:mm A");
          cron["nextRun"] = nextDateList;
          cron["status"] = getCronData == null ? "" : getCronData.status;
          if (cron.isActive) {
            cron["nextRun"] = nextDateList;
          } else {
            cron["nextRun"] = "";
          }
        }
        if (cron.cronName == "Keywords Listing") {
          const getCronData = await cronJobHistorySchema
            .findOne({
              companyId: req.user.company,
              profileId,
              cronName: "Keywords Listing",
            })
            .sort({ updatedAt: -1 });
          cron["lastRun"] =
            getCronData == null
              ? ""
              : moment
                .tz(getCronData.createdAt, getProfile.timezone)
                .format("YYYY-MM-DD hh:mm A");
          cron["nextRun"] = nextDateList;
          cron["status"] = getCronData == null ? "" : getCronData.status;
          if (cron.isActive) {
            cron["nextRun"] = nextDateList;
          } else {
            cron["nextRun"] = "";
          }
        }
        if (cron.cronName == "Placement Report") {
          const getCronData = await cronJobHistorySchema
            .findOne({
              companyId: req.user.company,
              profileId,
              cronName: "Placement Report",
            })
            .sort({ updatedAt: -1 });
          cron["lastRun"] =
            getCronData == null
              ? ""
              : moment
                .tz(getCronData.createdAt, getProfile.timezone)
                .format("YYYY-MM-DD hh:mm A");
          cron["nextRun"] = nextDateReport;
          cron["status"] = getCronData == null ? "" : getCronData.status;
          if (cron.isActive) {
            cron["nextRun"] = nextDateReport;
          } else {
            cron["nextRun"] = "";
          }
        }
      })
    );
    const totalRecords = await cronJobSchema.countDocuments(filter);
    return res.status(200).send({
      isSuccess: true,
      message: "Cron Job listing successfully",
      currentPageNo: pageNo,
      totalRecords: totalRecords,
      totalPages: Math.ceil(totalRecords / perPage),
      data: getCrons,
    });
  } catch (error) {
    return res.status(203).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.getAllCronJobByProfile = async (req, res) => {
  let { search, isActive, type, profileId, pageNo, perPage } = req.body;
  pageNo = pageNo ? pageNo : 1;
  perPage = perPage ? perPage : 10;
  const companyId = req.user.company;
  try {
    if (!profileId) {
      return res
        .status(203)
        .send({ isSuccess: false, message: "Profile id required!" });
    }
    let filter = {
      profileId: Number(profileId),
      companyId,
    };
    if (search) {
      filter.cronName = { $regex: new RegExp(search, "i") };
    }
    if (isActive) {
      filter.isActive = isActive;
    }
    if (type) {
      filter.cronName = { $regex: new RegExp(type, "i") };
    }
    const getCrons = await cronJobSchedularSchema.find(filter);
    const getProfile = await profileSchema.findOne({ profileId });
    let currentDate = moment().tz(getProfile.timezone).format("YYYY-MM-DD");
    let nextDate = moment()
      .tz(getProfile.timezone)
      .add(1, "days")
      .format("YYYY-MM-DD");
    const filteredCrons = await Promise.all(
      getCrons.map(async (cron) => {
        let permissionResult = {};
        if (cron.cronName == "Campaign Listing") {
          permissionResult = await checkPermission(
            companyId,
            "Cron Job Scheduler",
            "Campaign Listing",
            true
          );
          if (permissionResult.hasPermission) {
            const getCronData = await cronJobHistorySchema
              .findOne({
                companyId: req.user.company,
                profileId,
                cronName: "Campaign Listing",
              })
              .sort({ updatedAt: -1 });
            cron["lastRun"] =
              getCronData == null
                ? ""
                : moment
                  .tz(getCronData.updatedAt, getProfile.timezone)
                  .format("YYYY-MM-DD hh:mm A");
            const campaignNextDate = currentDate + " 11:00 PM";
            cron["nextRun"] = campaignNextDate;
            cron["status"] = getCronData == null ? "" : getCronData.status;
            if (cron.isActive) {
              cron["nextRun"] = campaignNextDate;
            } else {
              cron["nextRun"] = "";
            }
          } else {
            return null;
          }
        }
        if (cron.cronName == "AdGroups Listing") {
          permissionResult = await checkPermission(
            companyId,
            "Cron Job Scheduler",
            "AdGroups Listing",
            true
          );
          if (permissionResult.hasPermission) {
            const getCronData = await cronJobHistorySchema
              .findOne({
                companyId: req.user.company,
                profileId,
                cronName: "AdGroups Listing",
              })
              .sort({ updatedAt: -1 });
            cron["lastRun"] =
              getCronData == null
                ? ""
                : moment
                  .tz(getCronData.updatedAt, getProfile.timezone)
                  .format("YYYY-MM-DD hh:mm A");
            const adGruopListNextDate = nextDate + " 12:10 AM";
            cron["nextRun"] = adGruopListNextDate;
            cron["status"] = getCronData == null ? "" : getCronData.status;
            if (cron.isActive) {
              cron["nextRun"] = adGruopListNextDate;
            } else {
              cron["nextRun"] = "";
            }
          } else {
            return null;
          }
        }
        if (cron.cronName == "Keywords Listing") {
          permissionResult = await checkPermission(
            companyId,
            "Cron Job Scheduler",
            "Keywords Listing",
            true
          );
          if (permissionResult.hasPermission) {
            const getCronData = await cronJobHistorySchema
              .findOne({
                companyId: req.user.company,
                profileId,
                cronName: "Keywords Listing",
              })
              .sort({ updatedAt: -1 });
            cron["lastRun"] =
              getCronData == null
                ? ""
                : moment
                  .tz(getCronData.updatedAt, getProfile.timezone)
                  .format("YYYY-MM-DD hh:mm A");
            const keywordListNextDate = nextDate + " 12:20 AM";
            cron["nextRun"] = keywordListNextDate;
            cron["status"] = getCronData == null ? "" : getCronData.status;
            if (cron.isActive) {
              cron["nextRun"] = keywordListNextDate;
            } else {
              cron["nextRun"] = "";
            }
          } else {
            return null;
          }
        }
        if (cron.cronName == "Placement Report") {
          permissionResult = await checkPermission(
            companyId,
            "Cron Job Scheduler",
            "Placement Report",
            true
          );
          if (permissionResult.hasPermission) {
            const getCronData = await cronJobHistorySchema
              .findOne({
                companyId: req.user.company,
                profileId,
                cronName: "Placement Report",
              })
              .sort({ updatedAt: -1 });
            cron["lastRun"] =
              getCronData == null
                ? ""
                : moment
                  .tz(getCronData.updatedAt, getProfile.timezone)
                  .format("YYYY-MM-DD hh:mm A");
            const placementReportNextDate = nextDate + " 12:50 AM";
            cron["nextRun"] = placementReportNextDate;
            cron["status"] = getCronData == null ? "" : getCronData.status;
            if (cron.isActive) {
              cron["nextRun"] = placementReportNextDate;
            } else {
              cron["nextRun"] = "";
            }
          } else {
            return null;
          }
        }
        if (cron.cronName == "Products Listing") {
          permissionResult = await checkPermission(
            companyId,
            "Cron Job Scheduler",
            "Products Listing",
            true
          );
          if (permissionResult.hasPermission) {
            const getCronData = await cronJobHistorySchema
              .findOne({
                companyId: req.user.company,
                profileId,
                cronName: "Products Listing",
              })
              .sort({ updatedAt: -1 });
            cron["lastRun"] =
              getCronData == null
                ? ""
                : moment
                  .tz(getCronData.updatedAt, getProfile.timezone)
                  .format("YYYY-MM-DD hh:mm A");
            const productsListNextDate = nextDate + " 12:25 AM";
            cron["nextRun"] = productsListNextDate;
            cron["status"] = getCronData == null ? "" : getCronData.status;
            if (cron.isActive) {
              cron["nextRun"] = productsListNextDate;
            } else {
              cron["nextRun"] = "";
            }
          } else {
            return null;
          }
        }
        return cron;
      })
    );
    const filteredCronsWithoutNull = filteredCrons.filter(
      (cron) => cron !== null
    );
    const totalRecords = filteredCronsWithoutNull
      ? filteredCronsWithoutNull.length
      : 0;
    const startIndex = (pageNo - 1) * perPage;
    const endIndex = pageNo * perPage;
    const paginatedCrons = filteredCronsWithoutNull.slice(startIndex, endIndex);
    return res.status(200).send({
      isSuccess: true,
      message: "Cron Job listing successfully",
      currentPageNo: pageNo,
      totalRecords,
      totalPages: Math.ceil(totalRecords / perPage),
      data: paginatedCrons,
    });
  } catch (error) {
    return res.status(203).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.getAllCronJobHistory = async (req, res) => {
  const companyId = req.user.company;
  permissionResult = await checkPermission(
    companyId,
    "Cron Job History",
    "View Only",
    true
  );
  if (!permissionResult.hasPermission) {
    return res.status(203).send({
      isSuccess: false,
      message: permissionResult.message,
    });
  }
  let { profileId, pageNo, perPage, search, fromDate, toDate } = req.body;
  try {
    if (!profileId) {
      return res
        .status(203)
        .send({ isSuccess: false, message: "Profile id required!" });
    }
    pageNo = pageNo ? pageNo : 1;
    perPage = perPage ? perPage : 10;
    const filter = {
      companyId,
      profileId: Number(profileId),
    };
    if (search) {
      filter.cronName = { $regex: new RegExp(search, "i") };
    }
    if (fromDate && toDate) {
      filter.historyDate = { $gte: fromDate, $lte: toDate };
    }
    const getCronHistory = await cronJobHistorySchema
      .find(filter)
      .skip(perPage * pageNo - perPage)
      .limit(perPage)
      .sort({ updatedAt: -1 });
    const totalRecords = await cronJobHistorySchema.countDocuments(filter);
    return res.status(200).send({
      isSuccess: true,
      message: "Cron Job history listing successfully",
      currentPageNo: pageNo,
      totalRecords: totalRecords,
      totalPages: Math.ceil(totalRecords / perPage),
      data: getCronHistory,
    });
  } catch (error) {
    return res.status(203).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.changeStatus = async (req, res) => {
  const { cronId, isActive } = req.body;
  await cronJobSchema
    .findByIdAndUpdate(cronId, { isActive }, { new: true })
    .then((status) => {
      if (!status) {
        return res.status(203).send({
          message: "Invalid id!",
          isSuccess: false,
        });
      }
      return res.status(200).send({
        message: "Status updated successfully.",
        isSuccess: true,
      });
    })
    .catch((error) => {
      return res.status(203).send({
        error: error.message,
        message: "Something went wrong, please try again!",
        isSuccess: false,
      });
    });
};

exports.changeStatusByProfile = async (req, res) => {
  const companyId = req.user.company;
  const { cronId, isActive, profileId } = req.body;
  await cronJobSchedularSchema
    .findOneAndUpdate(
      { cronId: new ObjectId(cronId), profileId, companyId },
      {
        isActive,
      },
      {
        new: true,
      }
    )
    .then((status) => {
      if (!status) {
        return res.status(203).send({
          message: "Invalid id!",
          isSuccess: false,
        });
      }
      return res.status(200).send({
        message: "Status updated successfully.",
        isSuccess: true,
      });
    })
    .catch((error) => {
      return res.status(203).send({
        error: error.message,
        message: "Something went wrong, please try again!",
        isSuccess: false,
      });
    });
};

exports.cronMaster = async (req, res) => {
  try {
    const getCrons = await cronJobSchema.find();
    const getProfileId = await profileSchema.find({ isActive: true });
    await Promise.all(
      getProfileId.map(async (profile) => {
        await Promise.all(
          getCrons.map(async (cron) => {
            const beforeDate = moment
              .tz(profile.timezone)
              .subtract(1, "days")
              .format("YYYY-MM-DD");
            const currentDate = moment
              .tz(profile.timezone)
              .format("YYYY-MM-DD");
            if (cron.cronName == "Campaign Listing") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "Campaign Listing",
                historyDate: beforeDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Campaign Listing cron not run for date: ${beforeDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Campaign Listing cron run successfully for date: ${beforeDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "Campaign Report") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "Campaign Report",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Campaign Report cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Campaign Report cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "AdGroups Listing") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "AdGroups Listing",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} AdGroups Listing cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} AdGroups Listing cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "AdGroup Report") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "AdGroup Report",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} AdGroups Report cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} AdGroups Report cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "Keywords Listing") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "Keywords Listing",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Keywords Listing cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Keywords Listing cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "Keyword Report") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "Keyword Report",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Keyword Report cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Keywords Report cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "ProductAds Listing") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "ProductAds Listing",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} ProductAds Listing cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} ProductAds Listing cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "ProductAds Report") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "ProductAds Report",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} ProductAds Report cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} ProductAds Report cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "Placement Report") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "Placement Report",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Placement Report cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Placement Report cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
            if (cron.cronName == "Products Listing") {
              const getCronData = await cronJobHistorySchema.findOne({
                companyId: profile.companyId,
                profileId: profile.profileId,
                cronName: "Products Listing",
                historyDate: currentDate,
              });
              if (!getCronData) {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Products Listing cron not run for date: ${currentDate}`,
                  log_type: "info",
                });
              } else {
                write_logs({
                  message: `${profile.companyId} ${profile.profileId} Products Listing cron run successfully for date: ${currentDate}`,
                  log_type: "info",
                });
              }
            }
          })
        );
      })
    );
  } catch (error) {
    return res.status(203).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};

exports.getAllCronJobWithoutPagination = async (req, res) => {
  try {
    await cronJobSchema
      .find()
      .then(async (data) => {
        const totalRecords = await cronJobSchema.countDocuments();
        return res.status(200).send({
          isSuccess: true,
          message: "Cron Job listing successfully",
          totalRecords,
          data,
        });
      })
      .catch((error) => {
        return res.status(203).send({
          error: error.message,
          message: "Something went wrong, please try again!",
          isSuccess: false,
        });
      });
  } catch (error) {
    return res.status(203).send({
      error: error.message,
      message: "Something went wrong, please try again!",
      isSuccess: false,
    });
  }
};
