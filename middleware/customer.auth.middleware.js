const jwt = require("jsonwebtoken");
const customerSchema = require("../models/customer/customer.User.model");
const companySchema = require("../models/customer/customerCompany.model");

exports.companyAuthorization = async (req, res, next) => {
    const token =
        req.body?.token ||
        req.query?.token ||
        req.header?.["x-access-token"] ||
        req.header("authorization");
    if (!token) {
        return res
            .status(401)
            .send({ message: "Token is required", isSuccess: false });
    }
    const bearerToken = token?.split(" ")[1];
    try {
        jwt.verify(
            bearerToken,
            process.env.CUSTOMER_TOKEN_KEY,
            async (err, authData) => {
                if (err) {
                    return res.status(203).send({
                        err: err?.message,
                        message: "Invalid token",
                        isSuccess: false,
                    });
                }

                const client = await customerSchema.findOne({ _id: authData._id })
                const company = await companySchema.findOne({ _id: client?.company })

                if ((company?.isPlanActive && company?.isPaymentConfirmed && (!client?.isDelete))) {
                    req.user = authData;
                    next();
                } else {
                    return res.status(403).send({
                        message: "Something went wrong. Please contact your Administration or Support Team",
                        isSuccess: false,
                    });
                }
            }
        );
    } catch (error) {
        return res.status(500).message({
            error: error?.message,
            message: "Something went wrong, please try agian!",
            isSuccess: false,
        });
    }
};

