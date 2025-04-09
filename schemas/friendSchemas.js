const Joi = require("joi");

const friendRequestSchema = Joi.object({
  user1Id: Joi.number().integer().required(),
  user2Id: Joi.number().integer().required(),
});

module.exports = { friendRequestSchema };
