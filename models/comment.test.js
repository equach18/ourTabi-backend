"use strict";

const db = require("../db");
const Comment = require("../models/comment");
const { NotFoundError, BadRequestError } = require("../helpers/expressError");

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
afterAll(async () => {
  await db.end();
});

/************************************** create */

describe("create", function () {
  test("works: creates a new comment", async function () {
    const comment = await Comment.create({
      userId: testUserIds[0],
      tripId: testTripIds[0],
      text: "This is a test comment!",
    });

    expect(comment).toEqual({
      id: expect.any(Number),
      userId: testUserIds[0],
      tripId: testTripIds[0],
      text: "This is a test comment!",
      createdAt: expect.any(Date),
    });

    const result = await db.query(`SELECT * FROM comment WHERE id = $1`, [
      comment.id,
    ]);
    expect(result.rows.length).toEqual(1);
  });

  test("fails: bad request when text is empty", async function () {
    await expect(
      Comment.create({
        userId: testUserIds[0],
        tripId: testTripIds[0],
        text: "",
      })
    ).rejects.toThrow(BadRequestError);
  });
});

/************************************** get */

describe("get", function () {
  test("works: gets comments by id", async function () {
    const c1 = await Comment.create({
      userId: testUserIds[0],
      tripId: testTripIds[0],
      text: "test comment",
    });

    const comment = await Comment.get(c1.id);
    expect(comment).toEqual({
      id: expect.any(Number),
      userId: testUserIds[0],
      tripId: testTripIds[0],
      text: "test comment",
      createdAt: expect.any(Date),
    });
  });

  test("throws NotFoundError if comment not found", async function () {
    await expect(Comment.get(999999)).rejects.toThrow(NotFoundError);
  });

  test("throws error if invalid input type", async function () {
    await expect(Comment.get("invalid")).rejects.toThrow();
    await expect(Comment.get(null)).rejects.toThrow();
  });
});

/************************************** getCommentsByTrip */

describe("getCommentsByTrip", function () {
  test("works: gets comments for an activity", async function () {
    await Comment.create({
      userId: testUserIds[0],
      tripId: testTripIds[0],
      text: "First comment",
    });

    await Comment.create({
      userId: testUserIds[1],
      tripId: testTripIds[0],
      text: "Second comment",
    });

    const comments = await Comment.getCommentsByTrip(testTripIds[0]);
    expect(comments.length).toEqual(2);

    expect(comments).toEqual([
      {
        id: expect.any(Number),
        userId: testUserIds[0],
        username: expect.any(String),
        tripId: testTripIds[0],
        text: "First comment",
        createdAt: expect.any(Date),
      },
      {
        id: expect.any(Number),
        userId: testUserIds[1],
        username: expect.any(String),
        tripId: testTripIds[0],
        text: "Second comment",
        createdAt: expect.any(Date),
      },
    ]);
  });

  test("works: returns empty array if no comments", async function () {
    const comments = await Comment.getCommentsByTrip(testTripIds[1]);
    expect(comments).toEqual([]);
  });
});

/************************************** remove */

describe("remove", function () {
  test("works: removes a comment", async function () {
    const comment = await Comment.create({
      userId: testUserIds[0],
      tripId: testTripIds[0],
      text: "To be deleted",
    });

    await Comment.remove(comment.id);

    const result = await db.query(`SELECT * FROM comment WHERE id = $1`, [
      comment.id,
    ]);
    expect(result.rows.length).toEqual(0);
  });

  test("fails: not found error if comment does not exist", async function () {
    await expect(Comment.remove(999999)).rejects.toThrow(NotFoundError);
  });
});
