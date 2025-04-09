const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

/** Create a signed JWT for a user.
 * @param {Object} user - includes id and username.
 * @returns {string} - signed JWT token.
 */
function createToken(user) {
  if (!user || !user.id || !user.username || typeof user.isAdmin !== "boolean") {
    throw new Error("createToken: user object must have 'id', 'username', and 'isAdmin' as boolean");
  }

  let payload = {
    id: user.id, 
    username: user.username, 
    isAdmin: user.isAdmin,
  };

  return jwt.sign(payload, SECRET_KEY, { expiresIn: "2h" });
}

module.exports = { createToken };
