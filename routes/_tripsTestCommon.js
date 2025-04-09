"use strict";
// General trip tests

const request = require("supertest");
const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");
const Trip = require("../models/trip");
const TripMember = require("../models/tripMember");
const Friend = require("../models/friend");
const Comment = require("../models/comment");
const Activity = require("../models/activity");
const Vote = require("../models/vote");
const { createToken } = require("../helpers/tokens");
let testUserIds = {};
let testTripIds = {};
let testCommentIds = {};
let testActivityIds = {};
let testVoteIds = {};
let u1Token, u2Token, u3Token;

async function commonBeforeAll() {
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM trip");
  await db.query("DELETE FROM trip_member");
  await db.query("DELETE FROM friend");
  await db.query("DELETE FROM comment");
  await db.query("DELETE FROM activity");
  await db.query("DELETE FROM vote");

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
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    password: "password3",
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

  u3Token = createToken({
    id: testUserIds["u3"],
    username: "u3",
    isAdmin: true,
  });

  //   create trips
  const t1 = {
    title: "Trip1",
    destination: "Somewhere1",
    radius: 30,
    startDate: "2025-06-01",
    endDate: "2025-06-10",
    isPrivate: false,
    creatorId: testUserIds["u1"],
  };
  const publicTrip = await Trip.create(t1);
  const t2 = {
    title: "Trip2",
    destination: "Somewhere2",
    radius: 33,
    startDate: "2025-08-01",
    endDate: "2025-08-10",
    isPrivate: true,
    creatorId: testUserIds["u2"],
  };
  const privateTrip = await Trip.create(t2);
  testTripIds.publicTripId = publicTrip.id;
  testTripIds.privateTripId = privateTrip.id;

  // Make u1 and u3 friends
  await Friend.sendFriendRequest(testUserIds["u2"], testUserIds["u3"]);
  await Friend.acceptFriendRequest(testUserIds["u2"], testUserIds["u3"]);

  // add u1 to u2's privateTrip
  await TripMember.addMember(testUserIds["u1"], testTripIds["privateTripId"]);

  //   add comment to private trip
  const c1 = await Comment.create({
    tripId: testTripIds["privateTripId"],
    userId: testUserIds["u1"],
    text: "Test comment 1",
  });
  testCommentIds.u1c1 = c1.id;

  // add activity to private trip
  const newActivity = {
    tripId: testTripIds["privateTripId"],
    name: "Visit Eiffel Tower",
    category: "tours",
    description: "A visit to the Eiffel Tower in Paris",
    location: "Paris, France",
    scheduledTime: new Date("2024-08-01T10:00:00Z"),
    createdBy: testUserIds["u1"],
  };

  const a1 = await Activity.create(newActivity);
  testActivityIds.a1 = a1.id;

  //   cast vote on activity
  const newVote = await Vote.castVote(testUserIds["u1"], testActivityIds["a1"], 1);
  testVoteIds.v1 = newVote.id;
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
  testTripIds,
  testCommentIds,
  testActivityIds,
  testVoteIds,
  getU1Token: () => u1Token,
  getU2Token: () => u2Token,
  getU3Token: () => u3Token,
};
