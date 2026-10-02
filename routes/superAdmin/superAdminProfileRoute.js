const express = require("express");
const router = express.Router();
const multer = require('multer');

const { verifyToken } = require("../../middleware/auth.middleware");
const { getSuperAdminProfile, updateSuperAdminProfile, updateSuperAdminLanguage, changeAdminProfilePassword } = require("../../controller/superAdmin/superAdminProfileController");
const { superAdminProfileValidation, superAdminProfilePasswordValidation } = require("../../validation/superAdmin/superAdminProfile.validation");
const { adminAuthorization } = require("../../middleware/admin.auth.middleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'upload/profileImages/superAdmin'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({ storage: storage });

router.get("/getSuperAdminProfile", verifyToken, adminAuthorization, getSuperAdminProfile);
router.put('/updateSuperAdminProfile', verifyToken, adminAuthorization, upload.single('profileImage'), superAdminProfileValidation, updateSuperAdminProfile);
router.put('/changeAdminProfilePassword', verifyToken, adminAuthorization, superAdminProfilePasswordValidation, changeAdminProfilePassword);

module.exports = router;
