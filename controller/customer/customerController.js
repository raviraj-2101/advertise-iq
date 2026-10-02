const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const ejs = require('ejs');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const customerSchema = require("../../models/customer/customer.User.model");
const superAdminSchema = require("../../models/superAdmin/superAdmin.User.model");
const { generateDynamicString } = require("../../common/helper");
const { errorResponse, successResponse } = require("../../middleware/response");

const clientUrl = process.env.CLIENT_URL;
const sendEmailId = process.env.email;
const password = process.env.password;
const host = process.env.host;


exports.createCustomer = async (req, res) => {
    try {
        const userId = req.user._id;

        const { firstName, lastName, email, mobileNumber } = req.body;

        const user = await customerSchema.findOne({ email });
        const superAdmin = await superAdminSchema.findOne({ email });
        if (user || superAdmin) {
            return res
                .status(409)
                .send({ message: "Email is already existing!", isSuccess: false });
        } else {

            const requestedUser = await customerSchema.aggregate(
                [
                    {
                        $match: {
                            _id: new ObjectId(userId)
                        }
                    },
                    {
                        $lookup: {
                            from: "customer_companies",
                            localField: "company",
                            foreignField: "_id",
                            as: "company",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        name: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            company: {
                                $first: "$company"
                            }
                        }
                    }
                ]
            )

            const passwordToUse = await bcrypt.hash(process.env.USER_PASSWORD, 10);
            const referenceCode = generateDynamicString(firstName, lastName, mobileNumber)

            const createUser = await customerSchema.create(
                {
                    firstName,
                    lastName,
                    email,
                    mobileNumber,
                    createdBy: req?.user?._id ? req?.user?._id : null,
                    password: passwordToUse,
                    company: requestedUser[0]?.company?._id,
                    isAdmin: requestedUser[0]?.isAdmin,
                    referenceCode: referenceCode
                }
            )

            const token = jwt.sign(
                { _id: createUser._id, email: createUser.email, isAdmin: createUser.isAdmin },
                process.env.CUSTOMER_TOKEN_KEY,
                { expiresIn: "7d" }
            );

            const transporter = nodemailer.createTransport({
                host: host,
                port: 587,
                secure: false,
                auth: {
                    user: sendEmailId,
                    pass: password
                },
            });

            const emailBody = await ejs.renderFile('./template/invitationTemplate.ejs', { clientUrl, token, createUser });

            const sendEmail = await transporter.sendMail({
                from: `"FINANZ" <${sendEmailId}>`,
                to: createUser.email,
                subject: `${requestedUser[0]?.firstName} ${requestedUser[0]?.lastName} invited you to join us on the finanz`,
                text: `${requestedUser[0]?.firstName} ${requestedUser[0]?.lastName} invited you to join us on the finanz`,
                html: emailBody,
            });

            if (sendEmail.accepted) {
                return successResponse(res, {
                    message: "Send Customer invitation successfully.",
                })
            } else {
                return res.status(500).send({
                    message: "Something went wrong, please try again!",
                    isSuccess: false,
                });
            }
        }

    } catch (error) {
        return errorResponse(error, req, res);
    }
};

exports.listCustomer = async (req, res) => {
    try {
        let { perPage, pageNo } = req.body;
        const userId = req.user._id

        pageNo = pageNo ? pageNo : 1;
        perPage = perPage ? perPage : 25;

        const userDetail = await customerSchema.findOne({ _id: userId })

        const userList = await customerSchema.aggregate([
            {
                $match: {
                    company: userDetail.company
                }
            },
            {
                $facet: {
                    totalRecords: [
                        { $count: "count" }
                    ],
                    userList: [
                        {
                            $skip: (pageNo - 1) * perPage,
                        },
                        {
                            $limit: perPage,
                        },
                        {
                            $project: {
                                __v: 0,
                                password: 0,
                                keepMeLoggedIn: 0
                            }
                        },
                        {
                            $sort: {
                                createdAt: -1
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    totalRecords: { $arrayElemAt: ["$totalRecords.count", 0] },
                    userList: 1
                }
            }
        ]);
        return successResponse(res, {
            message: "Customers fetched successfully..",
            userList: userList[0],
            totalRecord: userList.length,
        })
    } catch (error) {
        return errorResponse(error, req, res);
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const userId = req.params.id

        const userDetail = await customerSchema.findOne({ _id: userId }).select("_id firstName lastName email mobileNumber companyName");
        return successResponse(res, {
            message: "Customer detail fetched successfully..",
            userDetail,
        })
    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.updateCustomer = async (req, res) => {
    try {
        const body = req.body;
        const id = req.params.id;

        if (id) {
            const user = await customerSchema.findOne({ _id: id });
            if (!user)
                return res.status(404).send({
                    message: "Customer not found!",
                    isSuccess: false
                })

            const existsEmail = await customerSchema.findOne({ email: req?.body?.email, _id: { $ne: id } })
            const superAdminExist = await superAdminSchema.findOne({ email: req?.body?.email, _id: { $ne: id } });

            if (existsEmail || superAdminExist)
                return res
                    .status(409)
                    .send({ message: "Email address is already use!", isSuccess: false });

            const updateUser = await customerSchema.findOneAndUpdate({ _id: id }, body);
            if (updateUser) {
                return successResponse(res, {
                    message: "Customer update successfully",
                })
            } else {
                return res.status(400).send({
                    message: "Something went wrong!",
                    isSuccess: false
                })
            }
        } else {
            return res.status(404).send({
                message: "Customer not found!",
                isSuccess: false
            })
        }
    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.deleteCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        const { isDelete } = req.body;
        if (id) {
            const deleteUser = await customerSchema.findOneAndUpdate(
                { _id: id },
                {
                    $set: {
                        isDelete: isDelete,
                        status: !isDelete
                    }
                },
                {
                    new: true
                }
            );
            if (deleteUser) {
                return successResponse(res, {
                    message: "Customer delete successfully",
                })
            } else {
                return res.status(400).send({
                    message: "Something went wrong!",
                    isSuccess: false
                })
            }
        } else {
            return res.status(404).send({
                message: "Customer not found!",
                isSuccess: false
            })
        }
    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.resendCustomerInvitation = async (req, res) => {
    try {
        const { email } = req.params;
        const userId = req.user._id;

        const customer = await customerSchema.findOne({ email: email });
        const requestedUser = await customerSchema.findOne({ _id: userId });

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
                pass: process.env.password
            },
        });

        const emailBody = await ejs.renderFile('./template/invitationTemplate.ejs', { clientUrl, token: jwtToken, createUser: customer });

        const sendEmail = await transporter.sendMail({
            from: `"FINANZ" <${sendEmailId}>`,
            to: email,
            subject: `${requestedUser?.firstName} ${requestedUser?.lastName} invited you to join us on the finanz`,
            text: `${requestedUser?.firstName} ${requestedUser?.lastName} invited you to join us on the finanz`,
            html: emailBody,
        });

        if (sendEmail.accepted) {
            return successResponse(res, {
                message: "Resend invitation successfully. please check your mail."
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