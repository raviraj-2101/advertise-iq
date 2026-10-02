const customerCompanySchema = require("../../models/customer/customerCompany.model");
const customerSchema = require("../../models/customer/customer.User.model");
const { errorResponse, successResponse } = require("../../middleware/response");

exports.createCustomerCompany = async (req, res) => {
    try {
        const body = req.body;

        if (req.file?.filename || (body.profileImage)) {
            if (body?.profileImage) {
                const filePath = path.join('upload/company/customer', body?.profileImage)

                fs.unlink(filePath, (error) => {
                    if (error) {
                        console.error(`Error deleting file: ${filePath}`, error)
                    }
                })
            }
        }

        if (body) {
            body.profileImage = req.file ? req.file?.filename : body.profileImage !== null ? body.profileImage : null
        }
        const companyDetail = await customerCompanySchema.create(body)
        if (companyDetail) {
            return successResponse(res, {
                message: "Company Created successfully.",
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

exports.companyList = async (req, res) => {
    try {
        const companyList = await customerCompanySchema.find().select('_id name')
        return successResponse(res, {
            message: "Company list fetched successfully.",
            companyList
        })

    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.getCustomerCompanyDetail = async (req, res) => {
    try {
        const userId = req.user._id

        const customerProfile = await customerSchema.findOne({ _id: userId });
        const customerCompany = await customerCompanySchema.findOne({ _id: customerProfile?.company });

        if (!customerCompany)
            return res.status(404).send({ message: "Company not found!", isSuccess: false })
        return successResponse(res, {
            message: "Super admin company fetched successfully..",
            customerCompany,
        })
    } catch (error) {
        return errorResponse(error, req, res);
    }
}

exports.updateCustomerCompany = async (req, res) => {
    if (req.body?.geschaftsfuhrer && req.body?.geschaftsfuhrer.length > 0) {
        // If it's a JSON string, parse it
        if (typeof req.body?.geschaftsfuhrer === 'string') {
            req.body.geschaftsfuhrer = JSON.parse(req.body.geschaftsfuhrer);
        }
    } else {
        req.body.geschaftsfuhrer = []; // Set to an empty array if no data is provided
    }
    try {
        const userId = req.user._id;
        const body = req.body;
        const user = await customerSchema.findOne({ _id: userId });
        const getCompanyDetail = await customerCompanySchema.findOne({ _id: user.company })
        if (!user)
            return res.status(404).send({
                message: "Customer admin not found!",
                isSuccess: false
            })

        if (req.file?.filename || (body.profileImage && body.profileImage !== getCompanyDetail?.profileImage)) {
            if (getCompanyDetail?.profileImage) {
                const filePath = path.join('upload/company/customer', getCompanyDetail?.profileImage)

                fs.unlink(filePath, (error) => {
                    if (error) {
                        console.error(`Error deleting file: ${filePath}`, error)
                    }
                })
            }
        }

        if (body) {
            req.body.profileImage = req.file ? req.file?.filename : body.profileImage !== null ? body.profileImage : body.profileImage === null ? null : getCompanyDetail?.profileImage
        }
        if (body.legalForm === "Einzelunternehmen" || body.legalForm === "GbR") {
            body.hrbNumber = null;
            body.geschaftsfuhrer1 = null;
            body.geschaftsfuhrer = []
        } else {
            body.inhaber = null
        }
        const updateUser = await customerCompanySchema.findOneAndUpdate({ _id: getCompanyDetail._id }, body);
        if (updateUser) {
            return successResponse(res, {
                message: "Company details update successfully",
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