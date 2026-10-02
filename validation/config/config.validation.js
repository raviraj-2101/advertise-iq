const Joi = require("joi");

// function for add amazon credentials validation
const linkToAmazonValidation = async (req, res, next) => {
    const Schema = Joi.object({
        companyId: Joi.string()
            .required(),
        clientSecret: Joi.string().required(),
        clientId: Joi.string().required(),
        adsRefreshToken: Joi.string().required()
    });
    const { error } = Schema.validate(req.body);
    if (error) {
        return res.status(400).send({
            isSuccess: false,
            message: error.message,
        });
    } else {
        next();
    }
};
module.exports = {
    linkToAmazonValidation
};