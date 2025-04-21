"use strict";
// General trip tests

const request = require("supertest");
const app = require("../app.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testTripIds,
  testUserIds,
  getU1Token,
  getU2Token,
  getU3Token
} = require("./_tripsTestCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);
/************************************** POST /trips */
describe("POST /trips", function () {
  test("works for logged in user", async function () {
    const resp = await request(app)
      .post("/trips")
      .send({
        title: "New Trip",
        destination: "New York",
        radius: 30,
        startDate: "2025-06-01",
        endDate: "2025-06-10",
        isPrivate: false,
      })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      trip: {
        id: expect.any(Number),
        title: "New Trip",
        destination: "New York",
        radius: 30,
        startDate: "2025-06-01T05:00:00.000Z",
        endDate: "2025-06-10T05:00:00.000Z",
        isPrivate: false,
        createdAt: expect.any(String),
        creatorId: testUserIds["u1"],
      },
    });
  });

  test("401 error for anonymous users", async function () {
    const resp = await request(app).post("/trips").send({
      title: "New Trip",
      destination: "New York",
      radius: 30,
      startDate: "2025-06-01",
      endDate: "2025-06-10",
      isPrivate: false,
    });
    expect(resp.statusCode).toEqual(401);
  });
  test("400 error if missing required fields", async function () {
    const resp = await request(app)
      .post("/trips")
      .send({
        title: "New Trip",
        radius: 30,
      })
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(400);
  });
  test("400 error if endDate is before startDate", async function () {
    const resp = await request(app)
      .post("/trips")
      .send({
        title: "Weird Trip",
        destination: "Tokyo",
        radius: 15,
        startDate: "2025-06-10",
        endDate: "2025-06-01",
        isPrivate: false,
      })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /trips/:tripId */

describe("GET /trips/:tripId", function () {
  test("works: own user's private trip", async function () {
    const resp = await request(app)
      .get(`/trips/${testTripIds["privateTripId"]}`)
      .set("authorization", `Bearer ${getU2Token()}`);
    expect(resp.body).toEqual({
      trip: {
        title: "Trip2",
        destination: "Somewhere2",
        radius: 33,
        startDate: "2025-08-01T05:00:00.000Z",
        endDate: "2025-08-10T05:00:00.000Z",
        isPrivate: true,
        creatorId: testUserIds["u2"],
        activities: expect.any(Array),
        comments: expect.any(Array),
        createdAt: expect.any(String),
        members: expect.any(Array),
        id: expect.any(Number),
      },
    });
  });
  test("works: non member viewing a public trip", async function () {
    const resp = await request(app)
      .get(`/trips/${testTripIds["publicTripId"]}`)
      .set("authorization", `Bearer ${getU3Token()}`);
    expect(resp.body).toEqual({
      trip: {
        title: "Trip1",
        destination: "Somewhere1",
        radius: 30,
        startDate: "2025-06-01T05:00:00.000Z",
        endDate: "2025-06-10T05:00:00.000Z",
        isPrivate: false,
        creatorId: testUserIds["u1"],
        activities: expect.any(Array),
        comments: [],
        createdAt: expect.any(String),
        members: expect.any(Array),
        id: expect.any(Number),
      },
    });
  });

  test("works: member can view trip", async function () {
    const resp = await request(app)
      .get(`/trips/${testTripIds["privateTripId"]}`)
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.body).toEqual({
      trip: {
        title: "Trip2",
        destination: "Somewhere2",
        radius: 33,
        startDate: "2025-08-01T05:00:00.000Z",
        endDate: "2025-08-10T05:00:00.000Z",
        isPrivate: true,
        creatorId: testUserIds["u2"],
        activities: expect.any(Array),
        comments: expect.any(Array),
        createdAt: expect.any(String),
        members: expect.any(Array),
        id: expect.any(Number),
      },
    });
  });

  test("403 error for private trips for non-member", async function () {
    const resp = await request(app)
      .get(`/trips/${testTripIds["privateTripId"]}`)
      .set("authorization", `Bearer ${getU3Token()}`);

    expect(resp.statusCode).toEqual(403);
    expect(resp.body).toEqual({
      error: { message: "Unauthorized to view this trip.", status: 403 },
    });
  });

  test("401 - fails for anonymous users", async function () {
    const resp = await request(app).get(
      `/trips/${testTripIds["publicTripId"]}`
    );

    expect(resp.statusCode).toEqual(401);
  });
  test("404 - fails for invalid trip ID", async function () {
    const resp = await request(app)
      .get(`/trips/99999`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });
});
/************************************** GET /trips */
describe("GET /trips", function () {
  test("works for logged-in users: gets all public trips", async function () {
    const resp = await request(app)
      .get(`/trips`)
      .set("authorization", `Bearer ${getU2Token()}`);
    expect(resp.body.trips).toEqual([
      {
        title: "Trip1",
        destination: "Somewhere1",
        radius: 30,
        startDate: "2025-06-01T05:00:00.000Z",
        endDate: "2025-06-10T05:00:00.000Z",
        isPrivate: false,
        creatorId: testUserIds["u1"],
        createdAt: expect.any(String),
        id: expect.any(Number),
      },
    ]);
  });
  test("works with title filter", async function () {
    const resp = await request(app)
      .get(`/trips?title=trip`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.trips).toEqual([
      {
        title: "Trip1",
        destination: "Somewhere1",
        radius: 30,
        startDate: "2025-06-01T05:00:00.000Z",
        endDate: "2025-06-10T05:00:00.000Z",
        isPrivate: false,
        creatorId: testUserIds["u1"],
        createdAt: expect.any(String),
        id: expect.any(Number),
      },
    ]);
  });
  test("works with destination filter", async function () {
    const resp = await request(app)
      .get(`/trips?destination=somewhere`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.trips).toEqual([
      {
        title: "Trip1",
        destination: "Somewhere1",
        radius: 30,
        startDate: "2025-06-01T05:00:00.000Z",
        endDate: "2025-06-10T05:00:00.000Z",
        isPrivate: false,
        creatorId: testUserIds["u1"],
        createdAt: expect.any(String),
        id: expect.any(Number),
      },
    ]);
  });

  test("returns empty array if no trips match filters", async function () {
    const resp = await request(app)
      .get(`/trips?title=Nonexistent`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body.trips).toEqual([]);
  });
  test("401-fails for anonymous users", async function () {
    const resp = await request(app).get(`/trips`);

    expect(resp.body).toEqual({
      error: { message: "You must be logged in.", status: 401 },
    });
  });
});

/************************************** PATCH /trips/:tripId */
describe("PATCH /trips/:tripId", function () {
  test("works for trip owner", async function () {
    const resp = await request(app)
      .patch(`/trips/${testTripIds["publicTripId"]}`)
      .send({ title: "Updated Trip" })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      trip: {
        id: testTripIds["publicTripId"],
        title: "Updated Trip",
        destination: "Somewhere1",
        radius: 30,
        startDate: "2025-06-01T05:00:00.000Z",
        endDate: "2025-06-10T05:00:00.000Z",
        isPrivate: false,
        createdAt: expect.any(String),
        creatorId: testUserIds["u1"],
      },
    });
  });
  test("works for member of trip", async function () {
    const resp = await request(app)
      .patch(`/trips/${testTripIds["privateTripId"]}`)
      .send({ title: "Updated Trip" })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      trip: {
        id: testTripIds["privateTripId"],
        title: "Updated Trip",
        destination: "Somewhere2",
        radius: 33,
        startDate: "2025-08-01T05:00:00.000Z",
        endDate: "2025-08-10T05:00:00.000Z",
        isPrivate: true,
        createdAt: expect.any(String),
        creatorId: testUserIds["u2"],
      },
    });
  });
  test("403 - fails for non-member user", async function () {
    const resp = await request(app)
      .patch(`/trips/${testTripIds["publicTripId"]}`)
      .send({ title: "Unauthorized Update" })
      .set("authorization", `Bearer ${getU3Token()}`);

    expect(resp.statusCode).toEqual(403);
  });
  test("401 - fails for anonymous users", async function () {
    const resp = await request(app)
      .patch(`/trips/${testTripIds["publicTripId"]}`)
      .send({ title: "Anonymous Update" });

    expect(resp.statusCode).toEqual(401);
  });

  test("400 - invalid fields are provided", async function () {
    const resp = await request(app)
      .patch(`/trips/${testTripIds["publicTripId"]}`)
      .send({ invalidField: "bad" })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });
  test("404 - non-existent trip", async function () {
    const resp = await request(app)
      .patch(`/trips/934599`)
      .send({ title: "Non-existent Trip" })
      .set("authorization", `Bearer ${getU1Token()}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("400 - if endDate is before startDate", async function () {
    const resp = await request(app)
      .patch(`/trips/${testTripIds["publicTripId"]}`)
      .send({ startDate: "2025-06-15", endDate: "2025-06-10" })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /trips/:tripId */

describe("DELETE /trips/:tripId", function () {
  test("works for trip owner", async function () {
    const resp = await request(app)
      .delete(`/trips/${testTripIds["publicTripId"]}`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: `${testTripIds["publicTripId"]}` });

    // make sure that trip does not exist anymore
    const checkResp = await request(app)
      .get(`/trips/${testTripIds["publicTripId"]}`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(checkResp.statusCode).toEqual(404);
  });
  test("403 for non-member user", async function () {
    const resp = await request(app)
      .delete(`/trips/${testTripIds["publicTripId"]}`)
      .set("authorization", `Bearer ${getU3Token()}`);

    expect(resp.statusCode).toEqual(403);
  });
  test("403 for non-owner trip member", async function () {
    const resp = await request(app)
      .delete(`/trips/${testTripIds["publicTripId"]}`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(403);
  });
  test("401 for anonymous users", async function () {
    const resp = await request(app).delete(
      `/trips/${testTripIds["publicTripId"]}`
    );

    expect(resp.statusCode).toEqual(401);
  });
  test("404 for non-existent trip", async function () {
    const resp = await request(app)
      .delete(`/trips/93856`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(404);
  });
});
