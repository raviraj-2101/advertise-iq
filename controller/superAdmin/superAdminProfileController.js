const bcrypt = require("bcrypt");
const fs = require('fs');
const path = require('path');
const customerSchema = require("../../models/customer/customer.User.model");
const superAdminSchema = require("../../models/superAdmin/superAdmin.User.model");
const { errorResponse, successResponse } = require("../../middleware/response");

exports.getSuperAdminProfile = async (req, res) => {
    try {
        const userId = req.user._id
        const superAdminProfile = await superAdminSchema.findOne({ _id: userId }).select("_id firstName lastName email mobileNumber profileImage password language isAdmin");

        return successResponse(res, {
            message: "Super admin profile fetched successfully..",
            superAdminProfile,
        })
    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.updateSuperAdminProfile = async (req, res) => {
    try {
        const userId = req.user._id
        const body = req.body;
        const user = await superAdminSchema.findOne({ _id: userId });
        if (!user)
            return res.status(404).send({
                message: "Customer not found!",
                isSuccess: false
            })

        if (req.file?.filename || (body.profileImage === null || (body.profileImage && body.profileImage !== user?.profileImage))) {
            if (user?.profileImage) {
                const filePath = path.join('upload/profileImages/superAdmin', user?.profileImage)
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

        const existsEmail = await superAdminSchema.findOne({ email: req?.body?.email, _id: { $ne: userId } })
        const customerExistsEmail = await customerSchema.findOne({ email: req?.body?.email, _id: { $ne: userId } })

        if (existsEmail || customerExistsEmail)
            return res
                .status(409)
                .send({ message: "Email address is already use!", isSuccess: false });

        const updateUser = await superAdminSchema.findOneAndUpdate({ _id: userId }, body);
        if (updateUser) {
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

exports.changeAdminProfilePassword = async (req, res) => {
    try {
        const userId = req.user._id
        const body = req.body;

        const user = await superAdminSchema.findOne({ _id: userId });
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

        const updateUser = await superAdminSchema.findOneAndUpdate({ _id: userId }, body);
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