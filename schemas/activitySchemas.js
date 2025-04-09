const Joi = require("joi");

const validCategories = [
  "food",
  "hiking",
  "tours",
  "shopping",
  "adventure",
  "outdoors",
  "other",
];

const activityNewSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  category: Joi.string()
    .valid(...validCategories)
    .default("other"),
  description: Joi.string().max(500).allow(null, ""),
  location: Joi.string().max(255).allow(null, ""),
  scheduledTime: Joi.date().optional(),
});

const activityUpdateSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  category: Joi.string().valid(...validCategories),
  description: Joi.string().max(500).allow(null, ""),
  location: Joi.string().max(255).allow(null, ""),
  scheduledTime: Joi.date(),
}).min(1);

module.exports = { activityNewSchema, activityUpdateSchema };
