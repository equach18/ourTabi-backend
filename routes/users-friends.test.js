"use strict";

const request = require("supertest");
const db = require("../db.js");
const app = require("../app.js");
const Friend = require("../models/friend");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
  getU1Token,
  getU2Token,
  getAdminToken,
} = require("./_usersTestCommons.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users/:username/friend-request */

describe("POST /users/:username/friend-request", function () {
  test("works: successfully sends a friend request", async function () {
    const resp = await request(app)
      .post(`/users/admin/friend-request`)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      friendRequest: {
        senderId: testUserIds["u1"],
        recipientId: testUserIds["admin"],
        status: "pending",
      },
    });

    // Check if the friend request is stored in the DB
    const check = await db.query(
      `SELECT * FROM friend WHERE sender_id = $1 AND recipient_id = $2`,
      [testUserIds["u1"], testUserIds["admin"]]
    );
    expect(check.rows.length).toEqual(1);
    expect(check.rows[0].status).toEqual("pending");
  });

  test("404 error: user does not exist ", async function () {
    const resp = await request(app)
      .post(`/users/badUsername/friend-request`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("fails: cannot send friend request to self (400)", async function () {
    const resp = await request(app)
      .post(`/users/u1/friend-request`)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      "Friend request cannot be sent to yourself."
    );
  });

  test("400 error: cannot send request if already friends", async function () {
    // Try sending the request again
    const resp = await request(app)
      .post(`/users/u2/friend-request`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      "Friend request already sent or you are already friends."
    );
  });

  test("400 error: cannot send request request already exists", async function () {
    // Make u1 and u3 friends
    await Friend.sendFriendRequest(testUserIds["u1"], testUserIds["admin"]);
    await Friend.acceptFriendRequest(testUserIds["u1"], testUserIds["admin"]);

    // Try sending a request again
    const resp = await request(app)
      .post(`/users/admin/friend-request`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      "Friend request already sent or you are already friends."
    );
  });

  test("401 error: anonymous users cannot send requests", async function () {
    const resp = await request(app).post(`/users/u1/friend-request`);

    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** PATCH /users/:username/friend-request */
describe("PATCH /users/:username/friend-request", function () {
  test("works: successfully accepts a friend request", async function () {
    await Friend.sendFriendRequest(testUserIds["u2"], testUserIds["admin"]);

    const resp = await request(app)
      .patch(`/users/u2/friend-request`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      acceptedFriend: {
        senderId: testUserIds["u2"],
        recipientId: testUserIds["admin"],
        status: "accepted",
      },
    });

    const check = await db.query(
      `SELECT status FROM friend WHERE sender_id = $1 AND recipient_id = $2`,
      [testUserIds["u2"], testUserIds["admin"]]
    );
    expect(check.rows[0].status).toEqual("accepted");
  });

  test("404 error: request does not exist", async function () {
    const resp = await request(app)
      .patch(`/users/admin/friend-request`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.body).toEqual({
      error: {
        message: `No pending friend request between users: ${testUserIds["admin"]} and ${testUserIds["u1"]}.`,
        status: 404,
      },
    });
  });

  test("404 error: already friends, no pending request", async function () {
    await Friend.sendFriendRequest(testUserIds["u2"], testUserIds["admin"]);
    await Friend.acceptFriendRequest(testUserIds["u2"], testUserIds["admin"]);

    const resp = await request(app)
      .patch(`/users/u2/friend-request`)
      .set("authorization", `Bearer ${getAdminToken()}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("401 error: anonymous users cannot accept requests", async function () {
    const resp = await request(app).patch(`/users/u2/friend-request`);
    expect(resp.statusCode).toEqual(401);
  });
});

/** ******************************** DELETE users/:username/friend-request */

describe("DELETE users/:username/friend-request", function () {
  test("works: recipient can decline a friend request", async function () {
    await Friend.sendFriendRequest(testUserIds["u1"], testUserIds["admin"]);

    const resp = await request(app)
      .delete(`/users/u1/friend-request`) 
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ removed: testUserIds["u1"] });

    // Verify in DB (no record should exist)
    const res = await db.query(
      `SELECT * FROM friend WHERE sender_id = $1 AND recipient_id = $2`,
      [testUserIds["u1"], testUserIds["admin"]]
    );
    expect(res.rows.length).toEqual(0);
  });

  test("works: user can remove an existing friend", async function () {
    const resp = await request(app)
      .delete(`/users/u1/friend-request`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ removed: testUserIds["u1"] });

  });

  test("404 error: cannot remove non-existent friend request", async function () {
    const resp = await request(app)
      .delete(`/users/u1/friend-request`) // u2 tries to remove a request that never existed
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("fails: cannot remove a request for a non-existent user", async function () {
    const resp = await request(app)
      .delete(`/users/anon/friend-request`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });
});
