const jwt = require("jsonwebtoken");

exports.adminAuthorization = async (req, res, next) => {
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

                if (authData?.isAdmin) {
                    req.user = authData;
                    next();
                } else {
                    return res.status(403).send({
                        message: 'Access denied.',
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

