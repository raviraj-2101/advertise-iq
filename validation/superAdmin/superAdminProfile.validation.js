const Joi = require("joi");

const superAdminProfileValidation = async (req, res, next) => {
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
        language: Joi.string()
            .required(),
        profileImage: Joi.string()
            .uri()
            .allow(null)
            .valid(null)
            .messages({
                "string.uri": `Profile image must be a valid URL.`,
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

const superAdminProfilePasswordValidation = async (req, res, next) => {
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
    superAdminProfileValidation,
    superAdminProfilePasswordValidation
};