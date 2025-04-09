const Joi = require("joi");

const userRegisterSchema = Joi.object({
  username: Joi.string().min(2).max(25).required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  profilePic: Joi.string().uri().allow(null, ""),
  bio: Joi.string().max(500).allow(null, ""),
  isAdmin: Joi.boolean().default(false),
});

const userAuthSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const userUpdateSchema = Joi.object({
  firstName: Joi.string(),
  lastName: Joi.string(),
  email: Joi.string().email(),
  profilePic: Joi.string().uri().allow(null, ""),
  bio: Joi.string().max(500).allow(null, ""),
}).min(1); // At least one field must be provided

module.exports = { userRegisterSchema, userAuthSchema, userUpdateSchema };
