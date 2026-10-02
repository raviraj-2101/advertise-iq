const Joi = require("joi");

const customerCompanyValidation = async (req, res, next) => {

    if (req.body?.geschaftsfuhrer && req.body?.geschaftsfuhrer?.length !== 0) {
        req.body.geschaftsfuhrer = JSON.parse(req.body?.geschaftsfuhrer)
    }
    const Schema = Joi.object({
        name: Joi.string().required(),
        legalForm: Joi.string()
            .trim()
            .optional(),
        email: Joi.string()
            .email({ minDomainSegments: 2 })
            .pattern(/\.[a-zA-Z]{2,}$/)
            .trim()
            .optional()
            .messages({
                'string.email': 'Please provide a valid email address.',
            }),
        website: Joi.string()
            .trim()
            .optional()
            .messages({
                'string.uri': 'Please provide a valid website URL.',
            }),

        inhaber: Joi.string()
            .trim()
            .optional()
            .messages({
                'string.uri': 'Please provide a valid website URL.',
            }),
        geschaftsfuhrer1: Joi.string()
            .trim()
            .optional()
            .messages({
                'string.email': 'Please provide a valid geschaftsfuhrer.',
            }),

        hrbNumber: Joi.string()
            .trim()
            .messages({
                "string.base": `HRB Number must be a string.`,
            }),

        geschaftsfuhrer: Joi.array().optional().messages(
            {
                'array.base': '"geschaeftsfuehrer" should be an array',
            }
        ),
        mobileNumber: Joi.string()
            .regex(/^[0-9]{1,20}$/)
            .optional()
            .messages({ "string.pattern.base": `Phone number cannot exceed 20 digits` }),
        country: Joi.string()
            .trim()
            .optional(),
        faxNumber: req.body.faxNumber ? Joi.string()
            .optional()
            .custom((value, helpers) => {
                if (req.body.faxNumber) {
                    return value;
                } else {
                    if (!/[0-9]/.test(value) || !/[\W_]/.test(value)) {
                        return helpers.message('Fax number can only contain a number or a special character.');
                    }
                    return value;
                }
            }) : "",
        amtgericht: Joi.string().trim().optional(),
        taxNumber: Joi.string().trim().optional()
            .messages({
                'string.base': 'Tax Number must be a string.',
            }),
        vatIdentificationNumber: Joi.string().trim().optional()
            .messages({
                'string.base': 'VAT Identification Number must be a string.',
            }),

        address: Joi.object({
            streetNo: Joi.string().trim().optional(),
            city: Joi.string().trim().optional(),
            pincode: Joi.number().integer().optional(),
        }).optional(),
        bankInformation: Joi.object({
            bank: Joi.string().trim().optional(),
            iban: Joi.string()
                .trim()
                .pattern(/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/)
                .optional()
                .messages({
                    'string.base': 'IBAN must be a string.',
                    'string.pattern.base': 'IBAN should be a valid IBAN format.',
                }),
            bic: Joi.string()
                .trim()
                .optional()
                .pattern(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}$/)
                .messages({
                    'string.base': 'BIC must be a string.',
                    'string.pattern.base': 'BIC should be a valid BIC format.',
                }),
        }).optional(),
        profileImage: Joi.string()
            .uri()
            .allow(null)
            .optional()
            .messages({
                "string.uri": `Profile image must be a valid URL.`,
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
    customerCompanyValidation
};