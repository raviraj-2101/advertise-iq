const Joi = require("joi");

const customerProfileValidation = async (req, res, next) => {
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
            .messages({ "string.pattern.base": `Mobile number cannot exceed 20 digits.` })
            .required(),
        language: Joi.string()
            .required(),
        profileImage: Joi.string()
            .uri()
            .allow(null)
            .valid(null)
            .messages({
                "string.uri": `Profile image must be a valid URL.`,
            }),
        isAutoPayment: Joi.boolean()
            .messages({
                "boolean.base": `isDelete must be a boolean.`,
            }),
        subscriptionId: Joi.string()
            .trim()
            .optional()
            .messages({
                'string.uri': 'SubscriptionId Number must be a string.',
            }),
    });

    if (req.body.profileImage === 'null') {
        req.body.profileImage = JSON.parse(req.body.profileImage)
    }
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

const customerProfilePasswordValidation = async (req, res, next) => {
    const Schema = Joi.object({
        password: Joi.string()
            .trim()
            .required()
            .messages({
                "string.base": `Password must be a string.`,
            }),
        newPassword: Joi.string()
            .trim()
            .required()
            .messages({
                "string.base": `New password must be a string.`,
            })
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
    customerProfileValidation,
    customerProfilePasswordValidation
};