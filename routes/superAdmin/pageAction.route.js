const express = require("express");
const router = express.Router();
const {
  createPageAction,
} = require("../../controller/superAdmin/pageAction.controller");
const { verifyToken } = require("../../middleware/auth.middleware");
const { adminAuthorization } = require("../../middleware/admin.auth.middleware");

router.post(
  "/create",
  verifyToken,
  adminAuthorization,
  createPageAction
);

module.exports = router;
