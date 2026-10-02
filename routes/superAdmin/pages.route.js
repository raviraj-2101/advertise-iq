const express = require("express");
const router = express.Router();
const {
  createPage,
  updatePage,
  listAllPage,
  deletePage,
  listAllPageWithoutPagination,
  getPageById,
  listRemainingPages,
} = require("../../controller/superAdmin/pages.controller");
const validation = require("../../validation/superAdmin/pages.validation");
const { verifyToken } = require("../../middleware/auth.middleware");
const { adminAuthorization } = require("../../middleware/admin.auth.middleware");

router.post(
  "/create",
  verifyToken,
  adminAuthorization,
  validation.createPageValidator,
  createPage
);
router.post(
  "/update/:pageId",
  verifyToken,
  adminAuthorization,
  validation.createPageValidator,
  updatePage
);
router.post("/listAll", verifyToken, adminAuthorization, listAllPage);
router.delete("/delete/:pageId", verifyToken, adminAuthorization, deletePage);
router.get(
  "/listAllPageWithoutPagination",
  verifyToken,
  adminAuthorization,
  listAllPageWithoutPagination
);

router.post("/getPageById", verifyToken, adminAuthorization, getPageById);

router.post(
  "/listRemainingPages",
  verifyToken,
  adminAuthorization,
  listRemainingPages
);

module.exports = router;
