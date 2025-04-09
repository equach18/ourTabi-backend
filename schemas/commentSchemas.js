const Joi = require("joi");

const commentNewSchema = Joi.object({
  userId: Joi.number().integer().required(),
  activityId: Joi.number().integer().required(),
  text: Joi.string().min(1).max(500).required(),
});

module.exports = { commentNewSchema };
