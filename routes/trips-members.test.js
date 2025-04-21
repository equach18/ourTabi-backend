"use strict";
// Tests for adding/removing members in a trip.

const request = require("supertest");
const app = require("../app.js");
const Friend = require("../models/friend.js");
const db = require("../db.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testTripIds,
  testUserIds,
  getU1Token,
  getU2Token,
  getU3Token,
  getTripMemberId,
} = require("./_tripsTestCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /trips/:tripId/members  */
describe("POST /trips/:tripId/members", function () {
  test("works: trip owner can add friends to trip", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["privateTripId"]}/members`)
      .send({ friendId: testUserIds["u3"] })
      .set("authorization", `Bearer ${getU2Token()}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      member: {
        userId: testUserIds["u3"],
        tripId: testTripIds["privateTripId"],
        role: "member",
        id: expect.any(Number),
      },
    });

    // Ensure user is added to trip_member
    const memberCheck = await db.query(
      `SELECT * FROM trip_member WHERE user_id = $1 AND trip_id = $2`,
      [testUserIds["u3"], testTripIds["privateTripId"]]
    );
    expect(memberCheck.rows.length).toEqual(1);
    expect(memberCheck.rows[0].role).toEqual("member");
  });

  test("403 if owner of trip tries to add non friend", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["privateTripId"]}/members`)
      .send({ friendId: testUserIds["u1"] })
      .set("authorization", `Bearer ${getU2Token()}`);
    expect(resp.body).toEqual({
      error: {
        message: `You do not have friends with friendId: ${testUserIds["u1"]}.`,
        status: 403,
      },
    });
  });

  test("403 if non owner of a trip tries to add a friend", async function () {
    // Make u1 and u2 friends
    const friendReq = await Friend.sendFriendRequest(
      testUserIds["u1"],
      testUserIds["u2"]
    );
    await Friend.acceptFriendRequest(friendReq.id, testUserIds["u2"]);
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/members`)
      .send({ friendId: testUserIds["u1"] })
      .set("authorization", `Bearer ${getU2Token()}`);
    expect(resp.body).toEqual({
      error: {
        message: `Only the trip owner can perform this action.`,
        status: 403,
      },
    });
  });
  test("400 if friendId is not a number", async function () {
    // Make u1 and u2 friends
    const friendReq = await Friend.sendFriendRequest(
      testUserIds["u1"],
      testUserIds["u2"]
    );
    await Friend.acceptFriendRequest(friendReq.id, testUserIds["u2"]);
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/members`)
      .send({ friendId: "bad friend id" })
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.body).toEqual({
      error: {
        message: `Invalid or missing friendId.`,
        status: 400,
      },
    });
  });
  test("401 if anon", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/members`)
      .send({ friendId: testUserIds["u2"] });
    expect(resp.body).toEqual({
      error: {
        message: "You must be logged in.",
        status: 401,
      },
    });
  });
});

/************************************** DELETE /trips/:tripId/members/:friendId  */
describe("DELETE /trips/:tripId/members/:friendId", function () {
  test("works: trip owner can remove a member", async function () {
    const tripMemberId = getTripMemberId();
    const resp = await request(app)
      .delete(`/trips/${testTripIds["privateTripId"]}/members/${tripMemberId}`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ removed: tripMemberId });

    // Ensure user is removed from trip_member
    const memberCheck = await db.query(
      `SELECT * FROM trip_member WHERE user_id = $1 AND trip_id = $2`,
      [testUserIds["u1"], testTripIds["privateTripId"]]
    );
    expect(memberCheck.rows.length).toEqual(0);
  });

  test("403 error: non-owner cannot remove a member", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["privateTripId"]}/members/${getTripMemberId()}`
      )
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(403);
    expect(resp.body).toEqual({
      error: {
        message: "Only the trip owner can perform this action.",
        status: 403,
      },
    });
  });

  test("404 error: cannot remove an invalid friend id", async function () {
    const resp = await request(app)
      .delete(`/trips/${testTripIds["publicTripId"]}/members/3453`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No trip member found with trip member id: 3453",
        status: 404,
      },
    });
  });

  test("404 error: cannot remove from a non-existent trip", async function () {
    const resp = await request(app)
      .delete(`/trips/46456/members/${getTripMemberId()}`)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No trip found with ID: 46456",
        status: 404,
      },
    });
  });

  test("401 error: unauthorized user", async function () {
    const resp = await request(app).delete(
      `/trips/${testTripIds["publicTripId"]}/members/${getTripMemberId()}`
    );

    expect(resp.statusCode).toEqual(401);
  });
});
