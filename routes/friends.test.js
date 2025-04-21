"use strict";

const request = require("supertest");
const db = require("../db.js");
const app = require("../app.js");
const Friend = require("../models/friend.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
  getFriendId,
  getU1Token,
  getU2Token,
  getAdminToken,
} = require("./_usersTestCommons.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /friends/:recipientId */

describe("POST /friends/:recipientId", function () {
  test("works: successfully sends a friend request", async function () {
    const resp = await request(app)
      .post(`/friends/${testUserIds["admin"]}`)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      friendRequest: {
        id: expect.any(Number),
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

  test("404 error: recipient id does not exist ", async function () {
    const resp = await request(app)
      .post(`/friends/32423`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("fails: cannot send friend request to self (400)", async function () {
    const resp = await request(app)
      .post(`/friends/${testUserIds["u1"]}`)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      "Friend request cannot be sent to yourself."
    );
  });

  test("400 error: cannot send request if already friends", async function () {
    // Try sending the request again
    const resp = await request(app)
      .post(`/friends/${testUserIds["u2"]}`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      `Friend request already sent or you are already friends.`
    );
  });

  test("400 error: cannot send request request already exists", async function () {
    // Make u1 and admin friends
    const req = await Friend.sendFriendRequest(
      testUserIds["u1"],
      testUserIds["admin"]
    );
    await Friend.acceptFriendRequest(req.id, testUserIds["admin"]);

    // Try sending a request again
    const resp = await request(app)
      .post(`/friends/${testUserIds["admin"]}`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      `Friend request already sent or you are already friends.`
    );
  });

  test("401 error: anonymous users cannot send requests", async function () {
    const resp = await request(app).post(`/friends/${testUserIds["u1"]}`);

    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** PATCH /friends/:friendId */
describe("PATCH /friends/:friendId", function () {
  test("works: successfully accepts a friend request", async function () {
    const friendReq = await Friend.sendFriendRequest(
      testUserIds["u2"],
      testUserIds["admin"]
    );

    const resp = await request(app)
      .patch(`/friends/${friendReq.id}`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      acceptedFriend: {
        id: friendReq.id,
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
      .patch(`/friends/435345`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.body).toEqual({
      error: {
        message: `No friend request found with id: 435345`,
        status: 404,
      },
    });
  });

  test("404 error: already friends, no pending request", async function () {
    const friendReq = await Friend.sendFriendRequest(
      testUserIds["u2"],
      testUserIds["admin"]
    );
    await Friend.acceptFriendRequest(friendReq.id, testUserIds["admin"]);

    const resp = await request(app)
      .patch(`/friends/${friendReq.id}`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.body).toEqual({
      error: {
        message: `Friend request is not pending.`,
        status: 400,
      },
    });
  });

  test("401 error: anonymous user cannot accept request", async function () {
    const friendRequest = await Friend.sendFriendRequest(
      testUserIds["u2"],
      testUserIds["admin"]
    );

    const resp = await request(app).patch(`/friends/${friendRequest.id}`);
    expect(resp.statusCode).toEqual(401);
  });
});

/** ******************************** DELETE friends/:friendId */

describe("DELETE friends/:friendId", function () {
  test("works: recipient can decline a friend request", async function () {
    const friendReq = await Friend.sendFriendRequest(
      testUserIds["u1"],
      testUserIds["admin"]
    );

    const resp = await request(app)
      .delete(`/friends/${friendReq.id}`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ removed: friendReq.id });

    // Verify in DB
    const res = await db.query(
      `SELECT * FROM friend WHERE sender_id = $1 AND recipient_id = $2`,
      [testUserIds["u1"], testUserIds["admin"]]
    );
    expect(res.rows.length).toEqual(0);
  });

  test("works: user can remove an existing friend", async function () {
    const resp = await request(app)
      .delete(`/friends/${getFriendId()}`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ removed: getFriendId() });
  });

  test("404 error: cannot remove non-existent friend request(id)", async function () {
    const resp = await request(app)
      .delete(`/friends/${getFriendId()}`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.body).toEqual({
      error: {
        message: `You do not have permission to modify this friend request.`,
        status: 401,
      },
    });
  });

  test("fails: cannot remove a request for a non-existent friend id", async function () {
    const resp = await request(app)
      .delete(`/friends/48937`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.body).toEqual({
      error: {
        message: `No friend request found with id: 48937`,
        status: 404,
      },
    });
  });
});
