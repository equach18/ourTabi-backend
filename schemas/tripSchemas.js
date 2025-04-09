const Joi = require("joi");

const tripNewSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  destination: Joi.string().required(),
  radius: Joi.number().integer().min(0).required(),
  startDate: Joi.date().optional(),
  endDate: Joi.date()
    .greater(Joi.ref("startDate"))
    .when("startDate", { is: Joi.exist(), then: Joi.required() })
    .optional(),
  isPrivate: Joi.boolean().default(true),
});

const tripUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  destination: Joi.string(),
  radius: Joi.number().integer().min(0),
  startDate: Joi.date().optional(),
  endDate: Joi.date()
    .greater(Joi.ref("startDate"))
    .when("startDate", { is: Joi.exist(), then: Joi.required() })
    .optional(),
  isPrivate: Joi.boolean(),
}).min(1);

module.exports = { tripNewSchema, tripUpdateSchema };
