const jwt = require("jsonwebtoken");

const ensureAuthorized = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];
  if (
    !(typeof bearerHeader !== "undefined" && process.env.CUSTOMER_TOKEN_KEY) ||
    !bearerHeader
  ) {
    return res.status(401).json({
      message: "Auth token not found",
      isSuccess: false,
    });
  }
  const bearer = bearerHeader.split(" ");
  const bearerToken = bearer[1];
  jwt.verify(bearerToken, process.env.CUSTOMER_TOKEN_KEY, async function (err, decoded) {
    if (err) {
      return res.status(401).json({
        message: "Auth token not found",
        error: err,
        isSuccess: false,
      });
    } else {
      req.user = decoded;
      next();
    }
  });
};

module.exports = {
  ensureAuthorized,
};
