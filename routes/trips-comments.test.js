"use strict";
// Tests for commenting on trips

const request = require("supertest");
const app = require("../app.js");
const db = require("../db.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testTripIds,
  testUserIds,
  testCommentIds,
  getU1Token,
  getU2Token,
  getU3Token,
} = require("./_tripsTestCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /trips/:tripId/comments */

describe("POST /trips/:tripId/comments", function () {
  test("works: trip owner can add a comment", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["privateTripId"]}/comments`)
      .send({ text: "test comment" })
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      comment: {
        id: expect.any(Number),
        tripId: testTripIds["privateTripId"],
        userId: testUserIds["u2"],
        text: "test comment",
        createdAt: expect.any(String),
      },
    });
  });
  test("works: trip member can add a comment", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["privateTripId"]}/comments`)
      .send({ text: "test comment" })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      comment: {
        id: expect.any(Number),
        tripId: testTripIds["privateTripId"],
        userId: testUserIds["u1"],
        text: "test comment",
        createdAt: expect.any(String),
      },
    });
  });

  test("fails for non-trip members", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/comments`)
      .send({ text: "Should not work" })
      .set("authorization", `Bearer ${getU3Token()}`);

    expect(resp.statusCode).toEqual(403);
  });

  test("400 error: when text is missing", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/comments`)
      .send({})
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("400 error:  when text is empty", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/comments`)
      .send({ text: "  " })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("404 error: when tripId is invalid", async function () {
    const resp = await request(app)
      .post(`/trips/584670/comments`)
      .send({ text: "test comment" })
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("401: anon users", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/comments`)
      .send({ text: "test comment" });

    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** DELETE /trips/:tripId/comments/:commentId */
describe("DELETE /trips/:tripId/comments/:commentId", function () {
  test("works: comment owner can delete their comment", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["privateTripId"]}/comments/${testCommentIds["u1c1"]}`
      )
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: `${testCommentIds["u1c1"]}` });

    // make sure comment was deleted from DB
    const check = await db.query(`SELECT * FROM comment WHERE id = $1`, [
      testCommentIds["u1c1"],
    ]);
    expect(check.rows.length).toEqual(0);
  });

  test("fails: non-owner cannot delete a comment", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["privateTripId"]}/comments/${testCommentIds["u1c1"]}`
      )
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(403);
  });

  test("fails: anonymous user cannot delete a comment", async function () {
    const resp = await request(app).delete(
      `/trips/${testTripIds["trip1"]}/comments/${testCommentIds["u1c1"]}`
    );

    expect(resp.statusCode).toEqual(401);
  });

  test("fails: cannot delete non-existent comment", async function () {
    const resp = await request(app)
      .delete(`/trips/${testTripIds["privateTripId"]}/comments/4563`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("fails: cannot delete comment that does not match trip", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["publicTripId"]}/comments/${testCommentIds["u1c1"]}`
      )
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(403);
  });
});
