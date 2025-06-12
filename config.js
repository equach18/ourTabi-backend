"use strict";

/** Shared config for application; can be required many places. */

require("dotenv").config();
require("colors");

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

const PORT = +process.env.PORT || 3001;

// Use dev database, testing database, or via env var, production database
function getDatabaseUri() {
  return process.env.NODE_ENV === "test"
    ? "postgresql:///ourtabi_test"
    : process.env.DATABASE_URL || "postgresql:///ourtabi";
}

// Reduce bcrypt work factor for speed for testing
const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

// Make sure that envs are set in production mode
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  console.error("FATAL ERROR: DATABASE_URL is not set in production!".red);
  process.exit(1);
}


module.exports = {
  SECRET_KEY,
  PORT,
  BCRYPT_WORK_FACTOR,
  getDatabaseUri,
};
