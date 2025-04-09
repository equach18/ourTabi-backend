const { BadRequestError } = require("../helpers/expressError");

function validateSchema(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((e) => e.message);
      return next(new BadRequestError(errors.join(", ")));
    }

    next();
  };
}

module.exports = { validateSchema };
