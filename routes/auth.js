"use strict";

/** Routes for authentication. */

const express = require("express");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const {
  userAuthSchema,
  userRegisterSchema,
} = require("../schemas/userSchemas");
const { validateSchema } = require("../middleware/validateSchema");

const router = new express.Router();

/** POST /auth/token:  { username, password } => { token }
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post(
  "/token",
  validateSchema(userAuthSchema),
  async function (req, res, next) {
    try {
      const { username, password } = req.body;
      const user = await User.authenticate(username, password);

      const token = createToken(user);
      return res.json({ token });
    } catch (err) {
      return next(err);
    }
  }
);

/** POST /auth/register:   { username, password, firstName, lastName, email } => { token }
 *
 *
 * Returns JWT token which can be used to authenticate further requests.
 *
 * Authorization required: none
 */

router.post(
  "/register",
  validateSchema(userRegisterSchema),
  async function (req, res, next) {
    try {
      const newUser = await User.register({ ...req.body, isAdmin: false });

      const token = createToken(newUser);
      return res.status(201).json({ token });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
