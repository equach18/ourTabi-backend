const Joi = require("joi");

const voteSchema = Joi.object({
  voteValue: Joi.number().valid(1, 0, -1).required(),
});

module.exports = { voteSchema };
