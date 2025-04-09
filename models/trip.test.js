"use strict";

const db = require("../db");
const { NotFoundError, BadRequestError } = require("../helpers/expressError");

const Trip = require("./trip.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testTripIds,
  testUserIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */
describe("create", function () {
  test("works", async function () {
    const newTrip = {
      title: "New Trip",
      destination: "New York",
      radius: 30,
      startDate: "2025-06-01",
      endDate: "2025-06-10",
      isPrivate: false,
      creatorId: testUserIds[0],
    };
    const trip = await Trip.create(newTrip);
    expect(trip).toEqual({
      id: expect.any(Number),
      title: "New Trip",
      destination: "New York",
      radius: 30,
      startDate: expect.any(Date),
      endDate: expect.any(Date),
      isPrivate: false,
      createdAt: expect.any(Date),
      creatorId: testUserIds[0],
    });

    // check that the creator is added as a trip owner in trip_member table
    const res = await db.query(
      `SELECT user_id, trip_id, role
       FROM trip_member
       WHERE user_id = $1 AND trip_id = $2`,
      [testUserIds[0], trip.id]
    );

    expect(res.rows.length).toEqual(1);
    expect(res.rows[0]).toEqual({
      user_id: testUserIds[0],
      trip_id: trip.id,
      role: "owner",
    });
  });

  test("bad request if missing required fields", async function () {
    await expect(
      Trip.create({ title: "Missing Data", creatorId: testUserIds[0] })
    ).rejects.toThrow();
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: finds all public trips", async function () {
    const trips = await Trip.findAll();
    expect(trips.length).toBeGreaterThan(0);

    trips.forEach((trip) => {
      expect(trip.isPrivate).toBe(false);
      expect(trip).toEqual({
        id: expect.any(Number),
        title: expect.any(String),
        destination: expect.any(String),
        radius: expect.any(Number),
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        isPrivate: false,
        createdAt: expect.any(Date),
        creatorId: expect.any(Number),
      });
    });
  });

  test("does not return private trips", async function () {
    const trips = await Trip.findAll();
    const privateTrip = trips.find((t) => t.isPrivate === true);

    expect(privateTrip).toBeUndefined();
  });

  test("returns empty array if no public trips exist", async function () {
    await db.query("DELETE FROM trip WHERE is_private = FALSE");
    const trips = await Trip.findAll();
    expect(trips).toEqual([]);
  });

  test("works: search by title", async function () {
    const trips = await Trip.findAll({ title: "Trip 1" });

    // Ensure that at least one trip matches the title
    expect(trips.length).toBeGreaterThan(0);
    trips.forEach((trip) => {
      expect(trip.title).toEqual("Trip 1");
    });
  });

  test("works: search by destination", async function () {
    const trips = await Trip.findAll({ destination: "New York" });

    expect(trips.length).toBeGreaterThan(0);
    trips.forEach((trip) => {
      expect(trip.destination).toEqual("New York");
    });
  });

  test("works: filters trips by title AND destination", async function () {
    const trips = await Trip.findAll({
      title: "trip",
      destination: "New York",
    });

    expect(trips.length).toBeGreaterThan(0);
    trips.forEach((trip) => {
      expect(trip.title.toLowerCase()).toContain("trip");
      expect(trip.destination.toLowerCase()).toContain("new york");
      expect(trip.isPrivate).toBe(false);
    });
  });

  test("returns empty array if no matching trips", async function () {
    const trips = await Trip.findAll({
      title: "NonExistent",
      destination: "Nowhere",
    });
    expect(trips).toEqual([]);
  });
});

/************************************** isOwner */

describe("isOwner", function () {
  test("works: returns true for owner", async function () {
    const isOwner = await Trip.isOwner(testUserIds[0], testTripIds[0]);
    expect(isOwner).toBe(true);
  });

  test("works: returns false for non-owner", async function () {
    const isOwner = await Trip.isOwner(testUserIds[0], testTripIds[1]);
    expect(isOwner).toBe(false);
  });

  test("returns false if the userId does not exist", async function () {
    const isOwner = await Trip.isOwner(345345, testTripIds[1]);
    expect(isOwner).toBe(false);
  });
  test("returns false if the tripId does not exist", async function () {
    const isOwner = await Trip.isOwner(testUserIds[0], 5646);
    expect(isOwner).toBe(false);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const trip = await Trip.get(testTripIds[0]);
    expect(trip).toEqual({
      id: testTripIds[0],
      title: "Trip 1",
      destination: "New York",
      radius: 10,
      startDate: expect.any(Date),
      endDate: expect.any(Date),
      isPrivate: false,
      createdAt: expect.any(Date),
      creatorId: testUserIds[0],
      members: [],
      activities: expect.any(Array),
      comments: [],
    });
  });

  test("not found if no such trip", async function () {
    await expect(Trip.get(9999)).rejects.toThrow(NotFoundError);
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "Updated Trip",
    destination: "Updated Destination",
    radius: 100,
  };

  test("works", async function () {
    const trip = await Trip.update(testTripIds[0], updateData);
    expect(trip).toEqual({
      id: testTripIds[0],
      title: "Updated Trip",
      destination: "Updated Destination",
      radius: 100,
      startDate: expect.any(Date),
      endDate: expect.any(Date),
      isPrivate: false,
      createdAt: expect.any(Date),
      creatorId: testUserIds[0],
    });
  });

  test("not found if no such trip", async function () {
    await expect(Trip.update(9999, updateData)).rejects.toThrow(NotFoundError);
  });

  test("bad request if no data", async function () {
    await expect(Trip.update(testTripIds[0], {})).rejects.toThrow();
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Trip.remove(testTripIds[0]);
    const res = await db.query("SELECT * FROM trip WHERE id=$1", [
      testTripIds[0],
    ]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such trip", async function () {
    await expect(Trip.remove(9999)).rejects.toThrow(NotFoundError);
  });
});
