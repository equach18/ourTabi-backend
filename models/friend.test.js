"use strict";

const db = require("../db");
const Friend = require("./friend");
const {
  NotFoundError,
  BadRequestError,
} = require("../helpers/expressError.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** sendFriendRequest */

describe("sendFriendRequest", function () {
  test("works: can send friend request", async function () {
    const friendRequest = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );

    expect(friendRequest).toEqual({
      id: friendRequest.id,
      senderId: testUserIds[0],
      recipientId: testUserIds[1],
      status: "pending",
    });

    const res = await db.query(
      `SELECT * FROM friend WHERE sender_id = $1 AND recipient_id = $2`,
      [testUserIds[0], testUserIds[1]]
    );
    expect(res.rows.length).toEqual(1);
  });

  test("fails: sending request to self", async function () {
    await expect(
      Friend.sendFriendRequest(testUserIds[0], testUserIds[0])
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: cannot send duplicate request", async function () {
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
    await expect(
      Friend.sendFriendRequest(testUserIds[0], testUserIds[1])
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: cannot send request if already friends", async function () {
    const request = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );
    await Friend.acceptFriendRequest(request.id, testUserIds[1]);

    await expect(
      Friend.sendFriendRequest(testUserIds[0], testUserIds[1])
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: cannot send request if reverse request already exists", async function () {
    await Friend.sendFriendRequest(testUserIds[1], testUserIds[0]); // u2 sent request first
    await expect(
      Friend.sendFriendRequest(testUserIds[0], testUserIds[0])
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: sending request to non-existent user", async function () {
    await expect(
      Friend.sendFriendRequest(testUserIds["u1"], 99999) // Fake user ID
    ).rejects.toThrow();
  });
});

/************************************** acceptFriendRequest */

describe("acceptFriendRequest", function () {
  test("works: recipient can accept a friend request", async function () {
    const request = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );
    const result = await Friend.acceptFriendRequest(request.id, testUserIds[1]);

    expect(result).toEqual({
      id: request.id,
      senderId: testUserIds[0],
      recipientId: testUserIds[1],
      status: "accepted",
    });

    const dbCheck = await db.query(`SELECT status FROM friend WHERE id = $1`, [
      request.id,
    ]);
    expect(dbCheck.rows[0].status).toEqual("accepted");
  });

  test("fails: cannot accept a non-pending request", async () => {
    const request = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );
    const result = await Friend.acceptFriendRequest(request.id, testUserIds[1]);

    await expect(
      Friend.acceptFriendRequest(result.id, testUserIds[1])
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: user is not the recipient", async () => {
    const request = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );

    await expect(
      Friend.acceptFriendRequest(request.id, testUserIds[0])
    ).rejects.toThrow(BadRequestError);
  });
});

/************************************** remove */

describe("remove", function () {
  test("works: remove friend request", async function () {
    const request = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );
    const result = await Friend.remove(request.id);
    expect(result).toEqual({ removed: true });

    // Verify it was actually removed
    const res = await db.query(`SELECT * FROM friend WHERE id = $1`, [
      request.id,
    ]);
    expect(res.rows.length).toEqual(0);
  });

  test("fails: friend id exists", async function () {
    await expect(Friend.remove(486475)).rejects.toThrow(NotFoundError);
  });
});

/************************************** getFriendsByUserId */

describe("getFriendsByUserId", function () {
  test("works: returns accepted friend in 'friends'", async function () {
    const request = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );
    await Friend.acceptFriendRequest(request.id, testUserIds[1]);

    const { friends, incomingRequests, sentRequests } =
      await Friend.getFriendsByUserId(testUserIds[0]);

    expect(friends).toEqual([
      {
        userId: testUserIds[1],
        friendId: request.id,
        username: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "u2@email.com",
        profilePic: null,
      },
    ]),
      expect(incomingRequests).toEqual([]);
    expect(sentRequests).toEqual([]);
  });

  test("works: returns sent requests", async function () {
    const req1 = await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
    const req2 = await Friend.sendFriendRequest(testUserIds[0], testUserIds[2]);

    const { friends, incomingRequests, sentRequests } =
      await Friend.getFriendsByUserId(testUserIds[0]);

    expect(sentRequests).toEqual([
      {
        userId: testUserIds[1],
        friendId: req1.id,
        username: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "u2@email.com",
        profilePic: null,
      },
      {
        userId: testUserIds[2],
        friendId: req2.id,
        username: "admin",
        firstName: "Admin",
        lastName: "User",
        email: "admin@email.com",
        profilePic: null,
      },
    ]);
    expect(friends).toEqual([]);
    expect(incomingRequests).toEqual([]);
  });

  test("works: returns incoming requests", async function () {
    const req = await Friend.sendFriendRequest(testUserIds[2], testUserIds[1]);

    const { friends, incomingRequests, sentRequests } =
      await Friend.getFriendsByUserId(testUserIds[1]);

    expect(incomingRequests).toEqual([
      {
        userId: testUserIds[2],
        friendId: req.id,
        username: "admin",
        firstName: "Admin",
        lastName: "User",
        email: "admin@email.com",
        profilePic: null,
      },
    ]);
    expect(friends).toEqual([]);
    expect(sentRequests).toEqual([]);
  });

  test("returns empty arrays when user has no friends or requests", async function () {
    const { friends, incomingRequests, sentRequests } =
      await Friend.getFriendsByUserId(testUserIds[0]);

    expect(friends).toEqual([]);
    expect(incomingRequests).toEqual([]);
    expect(sentRequests).toEqual([]);
  });
});

describe("areFriends", () => {
  test("works: true if friends", async () => {
    const request = await Friend.sendFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );
    await Friend.acceptFriendRequest(request.id, testUserIds[1]);
    const result = await Friend.areFriends(testUserIds[0], testUserIds[1]);
    expect(result).toBe(true);
  });

  test("works: false if not friends", async () => {
    const result = await Friend.areFriends(testUserIds[0], testUserIds[1]);
    expect(result).toBe(false);
  });

  test("returns false if friend request is still pending", async () => {
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);

    const result = await Friend.areFriends(testUserIds[0], testUserIds[1]);
    expect(result).toBe(false);
  });

  test("returns false if the users do not exist", async () => {
    const result = await Friend.areFriends(testUserIds[1], 3454);
    expect(result).toBe(false);
  });
});

describe("getById()", function () {
  let friendReq;

  beforeAll(async function () {
    friendReq = await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
  });

  test("works: retrieves friend request by ID", async function () {
    const result = await Friend.getById(friendReq.id);

    expect(result).toEqual({
      id: friendReq.id,
      senderId: testUserIds[0],
      recipientId: testUserIds[1],
      status: "pending",
    });
  });

  test("returns null if no record found", async function () {
    const result = await Friend.getById(46546);
    expect(result).toBeNull();
  });
});
