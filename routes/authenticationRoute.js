const express = require("express");
const router = express.Router();

const { registerValidation, loginValidation } = require("../validation/authentication.validation");
const { login, register, forgetPassword, changePassword, verifyEmail, resendVerifyEmail } = require("../controller/authenticationController");

router.post("/login", loginValidation, login);

router.post("/register", registerValidation, register);

router.post("/forget-password", forgetPassword);

router.post("/change-password/:token", changePassword);

router.get('/verify-email/:token', verifyEmail);

router.post('/resendVerifyEmail/:email', resendVerifyEmail);

module.exports = router;
