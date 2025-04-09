"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../helpers/expressError");

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals.user (this will include the username, id, and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  res.locals.user = undefined;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
  } catch (err) {
    return next();
  }

  return next();
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  if (!res.locals.user) {
    return next(new UnauthorizedError("You must be logged in."));
  }
  return next();
}

/** Middleware to use when the user must be an admin.
 *
 * If not, raises Unauthorized.
 */
function ensureAdmin(req, res, next) {
  if (!res.locals.user || !res.locals.user.isAdmin) {
    return next(new UnauthorizedError("You must be an admin."));
  }
  return next();
}

/** Middleware to use when the user must be that user or an admin.
 *
 * If not, raise unauthorized error
 */
function ensureCorrectUserOrAdmin(req, res, next) {
  const user = res.locals.user;
  const isCorrectUser = user?.username === req.params.username;
  const isAdmin = user?.isAdmin;

  if (!user || (!isCorrectUser && !isAdmin)) {
    return next(
      new UnauthorizedError("You do not have permission to access this page.")
    );
  }

  return next();
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureCorrectUserOrAdmin,
};
