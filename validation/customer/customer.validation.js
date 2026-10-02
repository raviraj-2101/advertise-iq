const Joi = require("joi");

const customerValidation = async (req, res, next) => {
    const Schema = Joi.object({
        firstName: Joi.string()
            .regex(/^[A-Za-z ]*$/)
            .required()
            .messages({
                "string.pattern.base": `First name must contain only letters.`,
            }),
        lastName: Joi.string()
            .regex(/^[A-Za-z ]*$/)
            .required()
            .messages({
                "string.pattern.base": `Last name must contain only letters.`,
            }),
        email: Joi.string()
            .email({ minDomainSegments: 2 })
            .pattern(/\.[a-zA-Z]{2,}$/)
            .required(),
        mobileNumber: Joi.string()
            .regex(/^[0-9]{1,20}$/)
            .messages({ "string.pattern.base": `Phone number cannot exceed 20 digits.` })
            .required(),
        password: Joi.string()
            .trim()
            .messages({
                "string.base": `Password must be a string.`,
            }),
        isDelete: Joi.boolean()
            .default(false)
            .messages({
                "boolean.base": `isDelete must be a boolean.`,
            }),
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
    customerValidation
};