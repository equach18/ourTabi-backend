"use strict";

const db = require("../db");
const TripMember = require("./tripMember");
const { NotFoundError, BadRequestError } = require("../helpers/expressError");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
  testTripIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** addMember */

describe("addMember", function () {
  test("works: add a user as a member", async function () {
    const result = await TripMember.addMember(testUserIds[1], testTripIds[0]);
    expect(result).toEqual({
      userId: testUserIds[1],
      tripId: testTripIds[0],
      role: "member",
      joinedAt: expect.any(Date),
    });
  });

  test("works: add a user as an owner", async function () {
    const result = await TripMember.addMember(
      testUserIds[2],
      testTripIds[1],
      "owner"
    );
    expect(result).toEqual({
      userId: testUserIds[2],
      tripId: testTripIds[1],
      role: "owner",
      joinedAt: expect.any(Date),
    });
  });

  test("fails: adding same user twice", async function () {
    await TripMember.addMember(testUserIds[1], testTripIds[0]);

    await expect(
      TripMember.addMember(testUserIds[1], testTripIds[0])
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: invalid role", async function () {
    await expect(
      TripMember.addMember(testUserIds[1], testTripIds[0], "invalidRole")
    ).rejects.toThrow(BadRequestError);
  });
});

/************************************** removeMember */

describe("removeMember", function () {
  test("works: remove a member from a trip", async function () {
    await TripMember.addMember(testUserIds[1], testTripIds[0]);
    const result = await TripMember.removeMember(
      testUserIds[1],
      testTripIds[0]
    );
    expect(result).toEqual({ removed: true });

    const check = await db.query(
      `SELECT * FROM trip_member WHERE user_id = $1 AND trip_id = $2`,
      [testUserIds[1], testTripIds[0]]
    );
    expect(check.rows.length).toEqual(0);
  });

  test("fails: removing a non-existing member", async function () {
    await expect(
      TripMember.removeMember(testUserIds[1], testTripIds[0])
    ).rejects.toThrow(NotFoundError);
  });
});

/************************************** getTripMembers */

describe("getTripMembers", function () {
  test("works: get all members of a trip", async function () {
    await TripMember.addMember(testUserIds[1], testTripIds[0]);
    await TripMember.addMember(testUserIds[2], testTripIds[0]);

    const members = await TripMember.getTripMembers(testTripIds[0]);
    expect(members).toEqual([
      {
        userId: testUserIds[1],
        username: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        email: expect.any(String),
        profilePic: null,
        role: "member",
        joinedAt: expect.any(Date),
      },
      {
        userId: testUserIds[2],
        username: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        email: expect.any(String),
        profilePic: null,
        role: "member",
        joinedAt: expect.any(Date),
      },
    ]);
  });

  test("works: returns empty array if no members", async function () {
    const members = await TripMember.getTripMembers(testTripIds[1]);
    expect(members).toEqual([]);
  });
});

/************************************** isMember */

describe("isMember", function () {
  test("works: user is a member", async function () {
    await TripMember.addMember(testUserIds[1], testTripIds[0]);
    const result = await TripMember.isMember(testUserIds[1], testTripIds[0]);
    expect(result).toEqual({
      userId: testUserIds[1],
      tripId: testTripIds[0],
      role: "member",
    });
  });

  test("works: user is not a member", async function () {
    const result = await TripMember.isMember(testUserIds[2], testTripIds[0]);
    expect(result).toBeNull();
  });

  test("fails: invalid tripId", async function () {
    await expect(TripMember.isMember(testUserIds[1], 0)).rejects.toThrow(
      NotFoundError
    );
  });

  test("fails: invalid userId", async function () {
    await expect(TripMember.isMember(0, testTripIds[0])).rejects.toThrow(
      NotFoundError
    );
  });
});
