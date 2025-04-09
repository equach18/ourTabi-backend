"use strict";

const db = require("../db");
const Activity = require("../models/activity");
const { NotFoundError, BadRequestError } = require("../helpers/expressError");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testActivityIds,
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
    const newActivity = {
      tripId: testTripIds[0],
      name: "Visit Eiffel Tower",
      category: "tours",
      description: "A visit to the Eiffel Tower in Paris",
      location: "Paris, France",
      scheduledTime: new Date("2024-08-01T10:00:00Z"),
      createdBy: testUserIds[0],
    };

    const activity = await Activity.create(newActivity);

    expect(activity).toEqual({
      id: expect.any(Number),
      tripId: testTripIds[0],
      name: "Visit Eiffel Tower",
      category: "tours",
      description: "A visit to the Eiffel Tower in Paris",
      location: "Paris, France",
      scheduledTime: expect.any(Date),
      createdBy: testUserIds[0],
      createdAt: expect.any(Date),
    });

    const res = await db.query(
      "SELECT * FROM activity WHERE name = 'Visit Eiffel Tower'"
    );
    expect(res.rows.length).toEqual(1);
  });

  test("fails with invalid category", async function () {
    const newActivity = {
      tripId: testTripIds[0],
      name: "Visit Eiffel Tower",
      category: "not a category",
      description: "A visit to the Eiffel Tower in Paris",
      location: "Paris, France",
      scheduledTime: new Date("2024-08-01T10:00:00Z"),
      createdBy: testUserIds[0],
    };
    await expect(Activity.create(newActivity)).rejects.toThrow(BadRequestError);
  });
});

/************************************** getActivitiesByTrip */

describe("getActivitiesByTrip", function () {
  test("works", async function () {
    const activities = await Activity.getActivitiesByTrip(testTripIds[0]);
    expect(activities).toEqual(
      expect.arrayContaining([
        {
          id: expect.any(Number),
          tripId: testTripIds[0],
          name: expect.any(String),
          category: expect.any(String),
          description: expect.any(String),
          location: expect.any(String),
          scheduledTime: expect.any(Date),
          createdBy: expect.any(Number),
          createdAt: expect.any(Date),
          votes:[]
        },
      ])
    );
  });

  test("returns empty array if no activities exist", async function () {
    const activities = await Activity.getActivitiesByTrip(-1); // Non-existent trip ID
    expect(activities).toEqual([]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const activity = await Activity.get(testActivityIds[0]); // Fixed from testTripIds[0]
    expect(activity).toEqual({
      id: testActivityIds[0],
      tripId: testTripIds[0],
      name: expect.any(String),
      category: expect.any(String),
      description: expect.any(String),
      location: expect.any(String),
      scheduledTime: expect.any(Date),
      createdBy: expect.any(Number),
      createdAt: expect.any(Date),
      votes: []
    });
  });

  test("throws NotFoundError if activity does not exist", async function () {
    await expect(Activity.get(-1)).rejects.toThrow(NotFoundError);
  });
});

/************************************** update */

describe("update", function () {
  test("works", async function () {
    const updateData = {
      name: "Updated Activity Name",
      category: "food",
      description: "Updated description",
      location: "New Location",
    };
    const updatedActivity = await Activity.update(
      testActivityIds[0],
      updateData
    );
    expect(updatedActivity).toEqual({
      id: testActivityIds[0],
      tripId: testTripIds[0],
      name: "Updated Activity Name",
      category: "food",
      description: "Updated description",
      location: "New Location",
      scheduledTime: expect.any(Date),
      createdBy: testUserIds[0],
      createdAt: expect.any(Date),
    });
  });

  test("fails if invalid category", async function () {
    await expect(
      Activity.update(testActivityIds[0], { category: "invalid-category" })
    ).rejects.toThrow(BadRequestError);
  });

  test("throws NotFoundError if activity does not exist", async function () {
    const updateData = {
      name: "Updated Activity Name",
      category: "food",
      description: "Updated description",
      location: "New Location",
    };
    await expect(Activity.update(-1, updateData)).rejects.toThrow(
      NotFoundError
    );
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const res = await Activity.remove(testActivityIds[0]);
    expect(res).toEqual({ deleted: true });

    await expect(Activity.get(testActivityIds[0])).rejects.toThrow(
      NotFoundError
    );
  });

  test("throws NotFoundError if activity does not exist", async function () {
    await expect(Activity.remove(-1)).rejects.toThrow(NotFoundError);
  });
});
