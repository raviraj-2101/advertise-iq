const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const { write_logs } = require("../../winston/updateToken/logger");
const { verifyToken } = require("../../middleware/auth.middleware");
const validation = require("../../validation/config/config.validation.js");
const { generateAccessToken, listProfiles, updateProfile, getAmazonProfile, linkToAmazon, cronUpdateToken } = require("../../controller/configs/configAds.controller");

//generate access token from amazon
router.post("/generateAccessToken", verifyToken, generateAccessToken);

//get All Profile 
router.post("/listProfiles", verifyToken, listProfiles);

//update Profile status
router.post("/updateProfile", verifyToken, updateProfile);

//get profiles from amazon and store to db
router.post("/getAmazonProfile", verifyToken, getAmazonProfile);

//add amazon credentials to config table
router.post("/linkToAmazon", validation.linkToAmazonValidation, verifyToken, linkToAmazon);


//crons for generate and update access token
cron.schedule(
  "*/20 * * * *",
  async () => {
    console.log("====== CRON UPDATE TOKEN =======", new Date().toTimeString());
    write_logs({
      message: "Cron call => cronAdsUpdateToken",
      log_type: "info",
    });
    cronUpdateToken();
  },
  {
    timezone: "America/Los_Angeles",
  }
);

module.exports = router;
