const userSchemas = require("./userSchemas");
const tripSchemas = require("./tripSchemas");
const activitySchemas = require("./activitySchemas");
const voteSchemas = require("./voteSchemas");
const commentSchemas = require("./commentSchemas");
const friendSchemas = require("./friendSchemas");
const tripMemberSchemas = require("./tripMemberSchemas");

module.exports = {
  ...userSchemas,
  ...tripSchemas,
  ...activitySchemas,
  ...voteSchemas,
  ...commentSchemas,
  ...friendSchemas,
  ...tripMemberSchemas,
};
