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
      id: expect.any(Number),
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
      id: expect.any(Number),
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
    const member = await TripMember.addMember(testUserIds[1], testTripIds[0]);

    const result = await TripMember.removeMember(member.id);
    expect(result).toEqual({ removed: true });

    const check = await db.query(`SELECT * FROM trip_member WHERE id = $1`, [
      member.id,
    ]);
    expect(check.rows.length).toBe(0);
  });

  test("fails: removing a non-existing trip member id", async function () {
    await expect(TripMember.removeMember(46545)).rejects.toThrow(NotFoundError);
  });
});

/************************************** getTripMembers */

describe("getTripMembers", function () {
  test("works: get all members of a trip", async function () {
    const m1 = await TripMember.addMember(testUserIds[1], testTripIds[0]);
    const m2 = await TripMember.addMember(testUserIds[2], testTripIds[0]);

    const members = await TripMember.getTripMembers(testTripIds[0]);
    expect(members).toEqual([
      {
        id: m1.id,
        userId: testUserIds[1],
        username: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        profilePic: null,
        role: "member",
      },
      {
        id: m2.id,
        userId: testUserIds[2],
        username: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        profilePic: null,
        role: "member",
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
    const member = await TripMember.addMember(testUserIds[1], testTripIds[0]);
    const result = await TripMember.isMember(testUserIds[1], testTripIds[0]);
    expect(result).toEqual({
      id: member.id,
      userId: testUserIds[1],
      tripId: testTripIds[0],
      role: "member",
    });
  });

  test("works: user is not a member", async function () {
    const result = await TripMember.isMember(testUserIds[2], testTripIds[0]);
    expect(result).toBeNull();
  });

  test("null on invalid tripId", async function () {
    const result = await TripMember.isMember(testUserIds[1], 4564);
    expect(result).toBeNull();
  });

  test("null on invalid userId", async function () {
    const result = await TripMember.isMember(45635, testTripIds[0]);
    expect(result).toBeNull();
  });
});
