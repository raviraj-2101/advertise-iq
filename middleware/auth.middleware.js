const jwt = require("jsonwebtoken");
const customerSchema = require("../models/customer/customer.User.model");
const adminSchema = require("../models/superAdmin/superAdmin.User.model");

exports.verifyToken = async (req, res, next) => {
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
          return res.status(401).send({
            err: err?.message,
            message: "Invalid token",
            isSuccess: false,
          });
        }

        const customer = await customerSchema.findOne({ _id: authData._id })
        const superAdmin = await adminSchema.findOne({ _id: authData._id })

        if (authData && ((customer && !customer?.isDelete) || (superAdmin && !superAdmin?.isDelete))) {
          req.user = superAdmin ? superAdmin : customer;
          next();
        } else {
          return res.status(401).send({
            message: "Invalid token or Token Expired",
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
