"use strict";

/** Backend Express app for OurTabi. */

const express = require("express");
const cors = require("cors");

const { NotFoundError } = require("./helpers/expressError");

const { authenticateJWT } = require("./middleware/auth");

const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(authenticateJWT);

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const tripRoutes = require("./routes/trips");
const friendRoutes = require("./routes/friends");

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/trips", tripRoutes);
app.use("/friends", friendRoutes);

/** Handle 404 errors -- matches everything */
app.use(function (req, res, next) {
  return next(new NotFoundError());
});

/** Generic error handler; anything unhandled goes here. */
app.use(function (err, req, res, next) {
  if (process.env.NODE_ENV !== "test") console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;

  return res.status(status).json({
    error: { message, status },
  });
});

module.exports = app;
