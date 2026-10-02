const express = require("express");
const router = express.Router();
const multer = require('multer');

const { superAdminCompanyValidation } = require("../../validation/superAdmin/superAdmin.company.validation");
const { superAdminCreateCompany, updateSuperAdminCompany, getSuperAdminCompanyDetail } = require("../../controller/superAdmin/superAdminCompanyController");
const { verifyToken } = require("../../middleware/auth.middleware");
const { adminAuthorization } = require("../../middleware/admin.auth.middleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'upload/company/superAdmin'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({ storage: storage });

router.post('/createCompany', upload.single('profileImage'), superAdminCompanyValidation, superAdminCreateCompany);
router.get('/getCompanyDetail', verifyToken, adminAuthorization, getSuperAdminCompanyDetail);
router.put('/updateCompanyDetail', verifyToken, adminAuthorization, upload.single('profileImage'), superAdminCompanyValidation, updateSuperAdminCompany);

module.exports = router;
