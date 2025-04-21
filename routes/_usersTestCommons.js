"use strict";

const db = require("../db.js");
const User = require("../models/user.js");
const Friend = require("../models/friend.js");
const { createToken } = require("../helpers/tokens.js");

let testUserIds = {};

let u1Token;
let u2Token;
let adminToken;
let friendRequestId; 

async function commonBeforeAll() {
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM friend");

  // Register test users
  await User.register({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    email: "user1@user.com",
    password: "password1",
    isAdmin: false,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    password: "password2",
    isAdmin: false,
  });
  await User.register({
    username: "admin",
    firstName: "Admin",
    lastName: "User",
    email: "admin@user.com",
    password: "adminpass",
    isAdmin: true,
  });

  // Retrieve users with auto-generated IDs
  const users = await db.query(
    `SELECT id, username, is_admin AS "isAdmin" FROM users`
  );

  // Store user IDs in an object for easy access
  for (let user of users.rows) {
    testUserIds[user.username] = user.id;
  }

  //  Create tokens after testUserIds is populated
  u1Token = createToken({
    id: testUserIds["u1"],
    username: "u1",
    isAdmin: false,
  });

  u2Token = createToken({
    id: testUserIds["u2"],
    username: "u2",
    isAdmin: false,
  });

  adminToken = createToken({
    id: testUserIds["admin"],
    username: "admin",
    isAdmin: true,
  });

  const request = await Friend.sendFriendRequest(testUserIds["u1"], testUserIds["u2"]);
  await Friend.acceptFriendRequest(request.id, testUserIds["u2"]);

  friendRequestId = request.id
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
  getFriendId: () => friendRequestId,
  getU1Token: () => u1Token,
  getU2Token: () => u2Token,
  getAdminToken: () => adminToken,
};
