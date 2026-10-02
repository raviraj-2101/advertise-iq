const express = require("express");
const router = express.Router();
const multer = require('multer');

const { getCustomerProfile, updateCustomerProfile, updateCustomerLanguage, changeCustomerProfilePassword } = require("../../controller/customer/customerProfileController");
const { verifyToken } = require("../../middleware/auth.middleware");
const { customerProfileValidation, customerProfilePasswordValidation } = require("../../validation/customer/customerProfile.validation");

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'upload/profileImages/customer'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({ storage: storage });

router.get("/getCustomerProfile", verifyToken, getCustomerProfile);
router.put('/updateCustomerProfile', verifyToken, upload.single('profileImage'), customerProfileValidation, updateCustomerProfile);
router.put('/changeCustomerProfilePassword', verifyToken, customerProfilePasswordValidation, changeCustomerProfilePassword);

module.exports = router;
