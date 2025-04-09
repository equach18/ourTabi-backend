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
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
    await Friend.acceptFriendRequest(testUserIds[0], testUserIds[1]);

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
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);

    const result = await Friend.acceptFriendRequest(
      testUserIds[0],
      testUserIds[1]
    );

    expect(result).toEqual({
      senderId: testUserIds[0],
      recipientId: testUserIds[1],
      status: "accepted",
    });

    const dbCheck = await db.query(
      `SELECT status FROM friend WHERE sender_id = $1 AND recipient_id = $2`,
      [testUserIds[0], testUserIds[1]]
    );
    expect(dbCheck.rows[0].status).toEqual("accepted");
  });

  test("fails: cannot accept a request that doesn't exist", async function () {
    await expect(
      Friend.acceptFriendRequest(testUserIds[0], testUserIds[2])
    ).rejects.toThrow(NotFoundError);
  });
});

/************************************** remove */

describe("remove", function () {
  test("works: remove friend request", async function () {
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
    const result = await Friend.remove(testUserIds[0], testUserIds[1]);
    expect(result).toEqual({ removed: true });

    // Verify it was actually removed
    const res = await db.query(
      `SELECT * FROM friend WHERE sender_id = $1 AND recipient_id = $2`,
      [testUserIds[0], testUserIds[1]]
    );
    expect(res.rows.length).toEqual(0);
  });

  test("fails: no relationship exists", async function () {
    await expect(Friend.remove(testUserIds[0], testUserIds[2])).rejects.toThrow(
      NotFoundError
    );
  });
});

/************************************** getFriendsByStatus */

describe("getFriendsByStatus", function () {
  test("works: get accepted friends", async function () {
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
    await Friend.acceptFriendRequest(testUserIds[0], testUserIds[1]);

    const friends = await Friend.getFriendsByStatus(testUserIds[0], "accepted");

    expect(friends).toEqual([
      {
        friendUsername: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "u2@email.com",
        profilePic: null,
        status: "accepted",
      },
    ]);
  });

  test("works: get pending (sent) requests", async function () {
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[2]);

    const pendingRequests = await Friend.getFriendsByStatus(
      testUserIds[0],
      "sent"
    );

    expect(pendingRequests).toEqual([
      {
        friendUsername: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "u2@email.com",
        profilePic: null,
        status: "pending",
      },
      {
        friendUsername: "admin",
        firstName: "Admin",
        lastName: "User",
        email: "admin@email.com",
        profilePic: null,
        status: "pending",
      },
    ]);
  });
  test("works: get pending requests", async function () {
    await Friend.sendFriendRequest(testUserIds[2], testUserIds[1]);

    const pendingRequests = await Friend.getFriendsByStatus(
      testUserIds[1],
      "pending"
    );

    expect(pendingRequests).toEqual([
      {
        friendUsername: "admin",
        firstName: "Admin",
        lastName: "User",
        email: "admin@email.com",
        profilePic: null,
        status: "pending",
      },
    ]);
  });
  test("returns empty array if no friends found", async function () {
    const friends = await Friend.getFriendsByStatus(testUserIds[0], "accepted");
    expect(friends).toEqual([]);
  });

  test("fails: invalid status", async function () {
    await expect(
      Friend.getFriendsByStatus(testUserIds[0], "blocked")
    ).rejects.toThrow(BadRequestError);
  });
});

describe("areFriends", () => {
  test("works: true if friends", async () => {
    await Friend.sendFriendRequest(testUserIds[0], testUserIds[1]);
    await Friend.acceptFriendRequest(testUserIds[0], testUserIds[1]);
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
