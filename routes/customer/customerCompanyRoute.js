const express = require("express");
const router = express.Router();
const multer = require('multer');

const { customerCompanyValidation } = require("../../validation/customer/customer.company.validation");
const { createCustomerCompany, companyList, getCustomerCompanyDetail, updateCustomerCompany } = require("../../controller/customer/customerCompanyController");
const { verifyToken } = require("../../middleware/auth.middleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'upload/company/customer'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({ storage: storage });

router.post('/createCompany', upload.single('profileImage'), customerCompanyValidation, createCustomerCompany);
router.get('/getCompanyList', verifyToken, companyList);
router.get('/getCustomerCompanyDetail', verifyToken, getCustomerCompanyDetail);
router.put('/updateCustomerCompany', verifyToken, upload.single('profileImage'), customerCompanyValidation, updateCustomerCompany);

module.exports = router;
