const express = require("express");
const router = express();
const { write_logs } = require("../winston/masterCron/logger");
const {
  createCronJob,
  getAllCronJob,
  getAllCronJobHistory,
  changeStatus,
  cronMaster,
  changeStatusByProfile,
  getAllCronJobByProfile,
  getAllCronJobWithoutPagination,
} = require("../controller/cronJob.controller");
const cron = require("node-cron");
const { verifyToken } = require("../middleware/auth.middleware");
const { adminAuthorization } = require("../middleware/admin.auth.middleware");

router.post("/createCronJob", verifyToken, createCronJob);
router.post("/getAllCronJob", verifyToken, getAllCronJob);
router.post("/getAllCronJobHistory", verifyToken, getAllCronJobHistory);
router.post("/changeStatus", verifyToken, changeStatus);
router.post("/changeStatusByProfile", verifyToken, changeStatusByProfile);
router.post("/getAllCronJobByProfile", verifyToken, getAllCronJobByProfile);
router.get(
  "/getAllCronJobWithoutPagination",
  verifyToken,
  adminAuthorization,
  getAllCronJobWithoutPagination
);

// cron.schedule("30 20 * * *", async () => {
//   try {
//     write_logs({
//       message: `cronMaster`,
//       log_type: "info",
//     });
//     await cronMaster();
//   } catch (error) {
//     return write_logs({
//       message: `Main Catch Error: ${JSON.stringify(error)}`,
//       log_type: "error",
//     });
//   }
// });

module.exports = router;
