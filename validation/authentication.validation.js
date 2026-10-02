const Joi = require("joi");

const registerValidation = async (req, res, next) => {
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
    companyName: Joi.string().required(),
    mobileNumber: Joi.string()
      .regex(/^[0-9]{1,20}$/)
      .messages({ "string.pattern.base": `Phone number cannot exceed 20 digits.` })
      .required(),
    password: Joi.string()
      .trim()
      .required()
      .messages({
        "string.base": `Password must be a string.`,
      }),
    keepMeLoggedIn: Joi.boolean()
      .default(false)
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

const loginValidation = async (req, res, next) => {
  const Schema = Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2 })
      .pattern(/\.[a-zA-Z]{2,}$/)
      .required(),
    password: Joi.string().required().min(6),
    keepMeLoggedIn: Joi.boolean().default(false),
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
  registerValidation,
  loginValidation
};