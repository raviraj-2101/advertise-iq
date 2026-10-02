const mongoose = require("mongoose");
const {
  badRequestResponse,
  successResponse,
  errorResponse,
} = require("../middleware/response");
const bcrypt = require("bcrypt");
const { generateDynamicString } = require("../common/helper");
const customerCompanySchema = require("../models/customer/customerCompany.model");
const customerSchema = require("../models/customer/customer.User.model");
const superAdminSchema = require("../models/superAdmin/superAdmin.User.model");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const jwt = require("jsonwebtoken");

const clientUrl = process.env.CLIENT_URL;
const sendEmailId = process.env.email;
const host = process.env.host;
const gmailPassword = process.env.password;
const expiresTime = process.env.TOKEN_EXPIRE_TIME;
const secretKey = process.env.CUSTOMER_TOKEN_KEY;

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, mobileNumber, companyName } =
    req.body;
  try {
    const findEmail = await customerSchema.findOne({ email });
    const superAdmin = await superAdminSchema.findOne({ email });
    if (findEmail || superAdmin) {
      return res
        .status(409)
        .send({ message: "Email is already existing!", isSuccess: false });
    } else {
      if (companyName) {
        const getComapnyDetail = await customerCompanySchema.create({
          name: companyName,
        });
        const Password = await bcrypt.hash(password, 10);

        const referenceCode = generateDynamicString(
          firstName,
          lastName,
          mobileNumber
        );
        const newCustomer = await customerSchema({
          firstName,
          lastName,
          email,
          password: Password,
          mobileNumber,
          company: getComapnyDetail._id,
          status: true,
          referenceCode: referenceCode,
        });
        newCustomer.save();
        await customerCompanySchema.findOneAndUpdate(
          { _id: newCustomer.company },
          {
            owner: newCustomer._id
          },
          {
            new: true,
          }
        )
        const customerInfo = {
          _id: newCustomer._id,
          email: newCustomer.email,
          isAdmin: newCustomer.isAdmin,
        }

        var token = jwt.sign(customerInfo, secretKey, {
          expiresIn: "7d", // expires in 24 hours
        });
        const transporter = nodemailer.createTransport({
          host: host,
          port: 465,
          secure: true,
          auth: {
            user: sendEmailId,
            pass: gmailPassword,
          },
        });

        const emailBody = await ejs.renderFile(
          "./template/welcomeInvitationTemplate.ejs",
          { clientUrl, email, token, newCustomer: newCustomer },

        );

        const sendEmail = await transporter.sendMail({
          from: `"FINANZ" <${sendEmailId}>`,
          to: newCustomer.email,
          subject: `Welcome to Finanz!`,
          text: `Welcome to Finanz!`,
          html: emailBody,
        });

        if (sendEmail?.accepted) {
          return successResponse(res, {
            message: "Invitation send successfully. plase check your mail and verify your email.",
          })
        } else {
          return res.status(500).send({
            message: "Something went wrong, please try again!",
            isSuccess: false,
          });
        }
      } else {
        return badRequestResponse(res, {
          message: "Failed to create customer",
        });
      }
    }
  } catch (error) {
    return errorResponse(error, req, res);
  }
}

exports.login = async (req, res) => {
  const { password, email } = req.body
  try {
    const adminUser = await superAdminSchema.findOne({ email });
    const customerUser = await customerSchema.findOne({ email });
    if (!adminUser && !customerUser) {
      return res
        .status(404)
        .send({ message: "Email not found!", isSuccess: false });
    } else {
      if (adminUser?.isDelete || customerUser?.isDelete)
        return res.status(400).send({
          message:
            "Something went wrong, Your account is In-Active Please contact admin",
          isSuccess: false,
        });

      if (
        (adminUser && !adminUser?.isVerifyEmail) ||
        (customerUser && !customerUser?.isVerifyEmail)
      )
        return res.status(400).send({
          message: "Please check your mail and verify your email",
          isSuccess: false,
        });
      const isMatch = await bcrypt.compare(
        password,
        adminUser ? adminUser?.password : customerUser?.password
      );
      if (!isMatch) {
        return badRequestResponse(res, {
          message: "Authentication failed. Wrong password.",
        });
      }
      const tokenBody = {
        _id: adminUser ? adminUser?._id : customerUser?._id,
        email,
        firstName: adminUser ? adminUser?.firstName : customerUser?.firstName,
        lastName: adminUser ? adminUser?.lastName : customerUser?.lastName,
        isAdmin: adminUser ? adminUser?.isAdmin : customerUser?.isAdmin,
      };

      const authToken = jwt.sign(tokenBody, process.env.CUSTOMER_TOKEN_KEY, {
        expiresIn: expiresTime,
      });
      return successResponse(res, {
        message: "Login successfully.",
        authToken,
      });
    }
  } catch (error) {
    return errorResponse(error, req, res);
  }
}

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const decodeToken = jwt.verify(token, secretKey);

    const customer = await customerSchema.findOne({ email: decodeToken.email });

    if (!customer)
      return notFoundResponse(res, {
        message: "Email not found",
      });

    let updateduser = {};

    if (customer?.status && !customer.isDelete) {
      updateduser.isVerifyEmail = true;
    }

    const verifyUserEmail = await customerSchema.findOneAndUpdate(
      { _id: customer._id },
      updateduser,
      {
        new: true,
      }
    );

    if (verifyUserEmail) {
      return successResponse(res, {
        message: "Email verify successfully.",
      })
    } else {
      return res.status(400).send({
        message: "Something went wrong!",
        isSuccess: false,
      });
    }
  } catch (error) {
    return res.status(500).send({
      error: error.message,
      message: "Token is not valid!",
      isSuccess: false,
    });
  }
}

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const customer = await customerSchema.findOne({ email });
    const superAdmin = await superAdminSchema.findOne({ email });

    if (!customer && !superAdmin) {
      return notFoundResponse(res, {
        message: "Email not found",
      });
    }

    if (customer?.isDelete || superAdmin?.isDelete)
      return res.status(400).send({
        message:
          "Something went wrong, Your account is In-Active Please contact admin",
        isSuccess: false,
      });

    const token = jwt.sign(
      {
        _id: superAdmin ? superAdmin?._id : customer?._id,
        email,
        isAdmin: superAdmin ? superAdmin?.isAdmin : customer?.isAdmin,
      },
      process.env.CUSTOMER_TOKEN_KEY,
      { expiresIn: "7d" }
    );

    const transporter = nodemailer.createTransport({
      host: host,
      port: 465,
      secure: true,
      auth: {
        user: sendEmailId,
        pass: gmailPassword,
      },
    });

    const emailBody = await ejs.renderFile(
      "./template/resetPasswordTemplate.ejs",
      { clientUrl, token, user: superAdmin ? superAdmin : customer }
    );

    const sendEmail = await transporter.sendMail({
      from: `"FINANZ" <${sendEmailId}>`,
      to: email,
      subject: "Forgot Your Password",
      text: "We received a request to forgot your password.",
      html: emailBody,
    });

    if (sendEmail.accepted) {
      return successResponse(res, {
        message: "Verification link sent your email address",
      })
    } else {
      return res.status(500).send({
        message: "Something went wrong, please try again!",
        isSuccess: false,
      });
    }
  } catch (error) {
    return errorResponse(error, req, res);
  }
}

exports.changePassword = async (req, res) => {
  try {
    const { token } = req.params;
    let { newPassword } = req.body;
    const decodeToken = jwt.verify(token, process.env.CUSTOMER_TOKEN_KEY);
    const customer = await customerSchema.findOne({ _id: decodeToken._id });
    const superAdmin = await superAdminSchema.findOne({ _id: decodeToken._id });

    if (!customer && !superAdmin)
      return notFoundResponse(res, {
        message: "User not found",
      });

    password = await bcrypt.hash(newPassword, 10);

    const updateBody = {
      password,
    };

    if (
      (!superAdmin?.status && !superAdmin?.isDelete) ||
      (!customer?.status && !customer?.isDelete)
    ) {
      updateBody.status = true;
      updateBody.isVerifyEmail = true;
    }

    let updateduser;

    if (superAdmin) {
      updateduser = await superAdminSchema.findOneAndUpdate(
        { _id: superAdmin._id },
        updateBody,
        {
          new: true,
        }
      );
    } else {
      updateduser = await customerSchema.findOneAndUpdate(
        { _id: customer._id },
        updateBody,
        {
          new: true,
        }
      );
    }

    if (updateduser) {
      return successResponse(res, {
        message: "Password updated successfully.",
      })
    } else {
      return res.status(400).send({
        message: "Something went wrong!",
        isSuccess: false,
      });
    }
  } catch (error) {
    return errorResponse(error, req, res);
  }
}

exports.resendVerifyEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const customer = await customerSchema.findOne({ email: email });

    if (!customer)
      return res
        .status(404)
        .send({ message: "User not found!", isSuccess: false });

    const jwtToken = jwt.sign(
      { _id: customer._id, email: customer.email, isAdmin: customer.isAdmin },
      process.env.CUSTOMER_TOKEN_KEY,
      { expiresIn: "7d" }
    );

    const transporter = nodemailer.createTransport({
      host: host,
      port: 587,
      secure: false,
      auth: {
        user: sendEmailId,
        pass: process.env.password,
      },
    });


    const emailBody = await ejs.renderFile(
      "./template/welcomeInvitationTemplate.ejs",
      { clientUrl, email, token: jwtToken, newCustomer: customer }
    );

    const sendEmail = await transporter.sendMail({
      from: `"FINANZ" <${sendEmailId}>`,
      to: customer.email,
      subject: `Welcome to Finanz!`,
      text: `Welcome to Finanz!`,
      html: emailBody,
    });

    if (sendEmail.accepted) {
      return successResponse(res, {
        message: "Resend invitation successfully. please check your mail.",
      })
    } else {
      return res.status(500).send({
        message: "Something went wrong, please try again!",
        isSuccess: false,
      });
    }
  } catch (error) {
    return errorResponse(error, req, res);
  }
};