"use strict";
// tests for activities within trips

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
  testActivityIds,
  testVoteIds,
  getU1Token,
  getU2Token,
  getU3Token,
} = require("./_tripsTestCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** GET /trips/:tripId/activities */
describe("GET /:tripId/activities", () => {
  test("works: gets activities for a public trip", async () => {
    const res = await request(app)
      .get(`/trips/${testTripIds["publicTripId"]}/activities`)
      .set("Authorization", `Bearer ${getU3Token()}`);

    expect(res.statusCode).toBe(200);
    console.log("DEBUG RESPONSE BODY:", res.body);
    expect(res.body.activities).toEqual([]);
  });

  test("Allows access to activities for a private trip (if member)", async () => {
    const res = await request(app)
      .get(`/trips/${testTripIds["privateTripId"]}/activities`)
      .set("Authorization", `Bearer ${getU1Token()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.activities).toEqual([
      {
        id: expect.any(Number),
        tripId: testTripIds["privateTripId"],
        name: "Visit Eiffel Tower",
        category: "tours",
        description: "A visit to the Eiffel Tower in Paris",
        location: "Paris, France",
        scheduledTime: expect.any(String),
        createdBy: testUserIds["u1"],
        createdAt: expect.any(String),
        votes: expect.any(Array),
      },
    ]);
  });

  test("fails: 403 for private trip if not a member", async () => {
    const res = await request(app)
      .get(`/trips/${testTripIds["privateTripId"]}/activities`)
      .set("Authorization", `Bearer ${getU3Token()}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toBe("Unauthorized to view this activity.");
  });

  test("fails: 404 for non-existent trip", async () => {
    const res = await request(app)
      .get(`/trips/99999/activities`)
      .set("Authorization", `Bearer ${getU1Token()}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toMatch(/No trip found/i);
  });

  test("fails: 401 if not authenticated", async () => {
    const res = await request(app).get(
      `/trips/${testTripIds["publicTripId"]}/activities`
    );

    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toBe("You must be logged in.");
  });
});

/************************************** POST /trips/:tripId/activities */
describe("POST /trips/:tripId/activities", function () {
  const testActivity = {
    name: "test activity",
    category: "tours",
    description: "test description",
    location: "somewhere, France",
    scheduledTime: "2024-01-01T10:00:00Z",
  };

  test("works: trip owner can add an activity", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/activities`)
      .send(testActivity)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      activity: {
        id: expect.any(Number),
        tripId: testTripIds["publicTripId"],
        name: "test activity",
        category: "tours",
        description: "test description",
        location: "somewhere, France",
        scheduledTime: "2024-01-01T10:00:00.000Z",
        createdBy: testUserIds["u1"],
        createdAt: expect.any(String),
      },
    });
  });
  test("works: trip member can add an activity", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["privateTripId"]}/activities`)
      .send(testActivity)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      activity: {
        id: expect.any(Number),
        tripId: testTripIds["privateTripId"],
        name: "test activity",
        category: "tours",
        description: "test description",
        location: "somewhere, France",
        scheduledTime: "2024-01-01T10:00:00.000Z",
        createdBy: testUserIds["u1"],
        createdAt: expect.any(String),
      },
    });
  });

  test("fails: non-member cannot add an activity", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/activities`)
      .send(testActivity)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(403);
  });

  test("fails: anonymous user cannot add an activity", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/activities`)
      .send(testActivity);

    expect(resp.statusCode).toEqual(401);
  });

  test("fails: missing required fields", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds.publicTripId}/activities`)
      .send({
        description: "Missing  fields test",
      })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("fails: invalid category", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds["publicTripId"]}/activities`)
      .send({
        ...testActivity,
        category: "invalid-category",
      })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("fails: trip does not exist", async function () {
    const resp = await request(app)
      .post(`/trips/43543/activities`) // Non-existent trip ID
      .send(testActivity)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /trips/:tripId/activities/:activityId */

describe("PATCH /trips/:tripId/activities/:activityId", function () {
  const updatedActivity = {
    name: "Updated Activity",
    category: "adventure",
    description: "Updated description",
    location: "Updated location",
    scheduledTime: "2024-08-01T12:00:00Z",
  };

  test("works: activity owner can update", async function () {
    const resp = await request(app)
      .patch(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}`
      )
      .send(updatedActivity)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      activity: {
        id: testActivityIds.a1,
        tripId: testTripIds.privateTripId,
        name: "Updated Activity",
        category: "adventure",
        description: "Updated description",
        location: "Updated location",
        scheduledTime: "2024-08-01T12:00:00.000Z",
        createdBy: testUserIds.u1,
        createdAt: expect.any(String),
      },
    });
  });
  test("works: trip member can update", async function () {
    const resp = await request(app)
      .patch(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}`
      )
      .send(updatedActivity)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      activity: {
        id: testActivityIds.a1,
        tripId: testTripIds.privateTripId,
        name: "Updated Activity",
        category: "adventure",
        description: "Updated description",
        location: "Updated location",
        scheduledTime: "2024-08-01T12:00:00.000Z",
        createdBy: testUserIds.u1,
        createdAt: expect.any(String),
      },
    });
  });

  test("fails: non trip member canont update activity", async function () {
    const resp = await request(app)
      .patch(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}`
      )
      .send(updatedActivity)
      .set("authorization", `Bearer ${getU3Token()}`);

    expect(resp.statusCode).toEqual(403);
  });

  test("fails: activity does not belong to the trip", async function () {
    const resp = await request(app)
      .patch(
        `/trips/${testTripIds.publicTripId}/activities/${testActivityIds.a1}`
      )
      .send(updatedActivity)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(403);
  });

  test("fails: unauthenticated user", async function () {
    const resp = await request(app)
      .patch(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}`
      )
      .send(updatedActivity);

    expect(resp.statusCode).toEqual(401);
  });

  test("fails: non-existent activity", async function () {
    const resp = await request(app)
      .patch(`/trips/${testTripIds.publicTripId}/activities/999999`)
      .send(updatedActivity)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("fails: non-existent trip", async function () {
    const resp = await request(app)
      .patch(`/trips/4345/activities/${testActivityIds.a1}`)
      .send(updatedActivity)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("fails: invalid category", async function () {
    const resp = await request(app)
      .patch(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}`
      )
      .send({
        ...updatedActivity,
        category: "invalid-category",
      })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("fails: missing required fields", async function () {
    const resp = await request(app)
      .patch(
        `/trips/${testTripIds.publicTripId}/activities/${testActivityIds.a1}`
      )
      .send({}) // No fields provided
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /trips/:tripId/activities/:activityId */
describe("DELETE /trips/:tripId/activities/:activityId", function () {
  test("works: activity owner can delete their activity", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["privateTripId"]}/activities/${testActivityIds["a1"]}`
      )
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: `${testActivityIds["a1"]}` });

    // Make sure the activity was removed from the DB
    const check = await db.query(`SELECT * FROM activity WHERE id = $1`, [
      testActivityIds["a1"],
    ]);
    expect(check.rows.length).toEqual(0);
  });

  test("fails: trip member can delete activity", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["privateTripId"]}/activities/${testActivityIds["a1"]}`
      )
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: `${testActivityIds["a1"]}` });
  });

  test("fails: anonymous user cannot delete an activity", async function () {
    const resp = await request(app).delete(
      `/trips/${testTripIds["privateTripId"]}/activities/${testActivityIds["a1"]}`
    );
    expect(resp.statusCode).toEqual(401);
  });

  test("fails: user cannot delete an activity from a trip you are not a member of", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["privateTripId"]}/activities/${testActivityIds["a1"]}`
      )
      .set("authorization", `Bearer ${getU3Token()}`);

    expect(resp.statusCode).toEqual(403);
  });

  test("fails: cannot delete a non-existent activity", async function () {
    const resp = await request(app)
      .delete(`/trips/${testTripIds["publicTripId"]}/activities/1345`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("fails: activity does not belong to the given trip", async function () {
    const resp = await request(app)
      .delete(
        `/trips/${testTripIds["publicTripId"]}/activities/${testActivityIds["a1"]}`
      )
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(403);
  });
});

/************************************** POST /trips/:tripId/activities/:activityId/vote */
describe("POST /trips/:tripId/activities/:activityId/vote", function () {
  test("works: trip member can vote on an activity", async function () {
    const resp = await request(app)
      .post(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}/vote`
      )
      .send({ voteValue: 1 })
      .set("authorization", `Bearer ${getU2Token()}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      vote: {
        userId: testUserIds.u2,
        activityId: testActivityIds.a1,
        voteValue: 1,
      },
    });

    // Ensure vote exists in DB
    const checkVote = await db.query(
      `SELECT vote_value FROM vote WHERE user_id = $1 AND activity_id = $2`,
      [testUserIds.u2, testActivityIds.a1]
    );
    expect(checkVote.rows[0].vote_value).toEqual(1);
  });

  test("works: user can change vote", async function () {
    await request(app)
      .post(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}/vote`
      )
      .send({ voteValue: -1 })
      .set("authorization", `Bearer ${getU2Token()}`);

    const checkVote = await db.query(
      `SELECT vote_value FROM vote WHERE user_id = $1 AND activity_id = $2`,
      [testUserIds["u2"], testActivityIds.a1]
    );
    expect(checkVote.rows[0].vote_value).toEqual(-1);
  });

  test("works: user can remove existing vote", async function () {
    await request(app)
      .post(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}/vote`
      )
      .send({ voteValue: 0 })
      .set("authorization", `Bearer ${getU2Token()}`);

    const checkVote = await db.query(
      `SELECT * FROM vote WHERE user_id = $1 AND activity_id = $2`,
      [testUserIds["u2"], testActivityIds.a1]
    );
    expect(checkVote.rows.length).toEqual(0); // Vote should be removed
  });
  test("400:  user can only remove own's vote", async function () {
    const resp = await request(app)
      .post(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}/vote`
      )
      .send({ voteValue: 0 })
      .set("authorization", `Bearer ${getU2Token()}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("403: user not in trip cannot vote", async function () {
    const resp = await request(app)
      .post(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}/vote`
      )
      .send({ voteValue: 1 })
      .set("authorization", `Bearer ${getU3Token()}`);

    expect(resp.statusCode).toEqual(403);
  });

  test("400: invalid vote value", async function () {
    const resp = await request(app)
      .post(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}/vote`
      )
      .send({ voteValue: 5 })
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(400);
  });

  test("404: voting on non-existent activity", async function () {
    const resp = await request(app)
      .post(`/trips/${testTripIds.privateTripId}/activities/2348/vote`)
      .send({ voteValue: 1 })
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(404);
  });

  test("401: anonymous users cannot vote", async function () {
    const resp = await request(app)
      .post(
        `/trips/${testTripIds.privateTripId}/activities/${testActivityIds.a1}/vote`
      )
      .send({ voteValue: 1 });

    expect(resp.statusCode).toEqual(401);
  });
});
