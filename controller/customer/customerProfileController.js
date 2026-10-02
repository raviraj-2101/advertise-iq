const bcrypt = require("bcrypt");
const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const customerSchema = require("../../models/customer/customer.User.model");
const superAdminSchema = require("../../models/superAdmin/superAdmin.User.model");
const billingSchema = require("./../../models/superAdmin/billing.model");
const { errorResponse, successResponse } = require("../../middleware/response");

exports.getCustomerProfile = async (req, res) => {
    try {
        const userId = req.user._id

        let customerProfile = await customerSchema.findOne({ _id: userId }).select("_id firstName lastName email mobileNumber profileImage password language company isAdmin isAutoPayment customerId");
        const lastBillingPlan = await billingSchema.findOne({ userId: userId, isConfirmed: true }).sort({ createdAt: -1 });

        let customerProfileData = customerProfile

        if (lastBillingPlan && lastBillingPlan.subscriptionNumber) {
            customerProfileData = { ...customerProfileData?._doc, subscriptionId: lastBillingPlan.subscriptionNumber }
        }

        return successResponse(res, {
            message: "Customer profile fetched successfully..",
            customerProfile: customerProfileData,
        })
    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.updateCustomerProfile = async (req, res) => {
    try {
        const userId = req.user._id
        const body = req.body;

        const user = await customerSchema.findOne({ _id: userId });
        if (!user)
            return res.status(404).send({
                message: "Customer not found!",
                isSuccess: false
            })

        if (req.file?.filename || (body.profileImage === null || (body.profileImage && body.profileImage !== user?.profileImage))) {
            if (user?.profileImage) {
                const filePath = path.join('upload/profileImages/customer', user?.profileImage)
                fs.unlink(filePath, (error) => {
                    if (error) {
                        console.error(`Error deleting file: ${filePath}`, error)
                    }
                })
            }
        }

        if (body) {
            req.body.profileImage = req.file ? req.file?.filename : body.profileImage !== null ? body.profileImage : body.profileImage === null ? null : user?.profileImage
        }

        const existsEmail = await customerSchema.findOne({ email: req?.body?.email, _id: { $ne: userId } })
        const superAdminExistsEmail = await superAdminSchema.findOne({ email: req?.body?.email, _id: { $ne: userId } })

        if (existsEmail || superAdminExistsEmail)
            return res
                .status(409)
                .send({ message: "Email address is already use!", isSuccess: false });

        const updateUser = await customerSchema.findOneAndUpdate({ _id: userId }, body);
        if (updateUser) {

            const pauseCollection = JSON.parse(body?.isAutoPayment) ? {
                pause_collection: null,
                expand: ['latest_invoice.payment_intent']
            } : {
                pause_collection: {
                    behavior: 'mark_uncollectible',  // You can use 'void' or 'mark_uncollectible'
                },
                collection_method: "send_invoice",
                days_until_due: 7
            }

            if (updateUser?.isAutoPayment !== JSON.parse(body?.isAutoPayment) && req.body?.subscriptionId) {
                await stripe.subscriptions.update(req.body?.subscriptionId, pauseCollection);
            }

            return successResponse(res, {
                message: "Generally profile setting update successfully",

            })
        } else {
            return res.status(400).send({
                message: "Something went wrong!",
                isSuccess: false
            })
        }

    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.changeCustomerProfilePassword = async (req, res) => {
    try {
        const userId = req.user._id
        const body = req.body;

        const user = await customerSchema.findOne({ _id: userId });
        if (!user)
            return res.status(404).send({
                message: "Customer not found!",
                isSuccess: false
            })

        if (body.password) {
            const isMatchNewPassword = await bcrypt.compare(body.newPassword, user.password);
            const isMatch = await bcrypt.compare(body.password, user.password);

            if (isMatchNewPassword) {
                return res.status(400).send({ message: 'New password cannot be the same as the old password.' });
            }
            if (isMatch) {
                const passwordToUse = await bcrypt.hash(body.newPassword, 10);
                body.password = passwordToUse
            } else {
                return res
                    .status(409)
                    .send({ message: "Current password is incorrect.", isSuccess: false });
            }
        }

        const updateUser = await customerSchema.findOneAndUpdate({ _id: userId }, body);
        if (updateUser) {
            return successResponse(res, {
                message: "Password changed successfully",
            })
        } else {
            return res.status(400).send({
                message: "Something went wrong!",
                isSuccess: false
            })
        }


    } catch (error) {
        return errorResponse(error, req, res);
    }
}