const Joi = require("joi");

const tripMemberSchema = Joi.object({
  friendId: Joi.number().integer().required(),
  tripId: Joi.number().integer().required(),
});

module.exports = { tripMemberSchema };
