"use strict";

const { NotFoundError, BadRequestError } = require("../helpers/expressError");
const db = require("../db.js");
const Vote = require("./vote.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
  testActivityIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** castVote */

describe("castVote", function () {
  test("works: new vote value of 1", async function () {
    const vote = await Vote.castVote(testUserIds[0], testActivityIds[0], 1);
    expect(vote).toEqual({
      userId: testUserIds[0],
      activityId: testActivityIds[0],
      voteValue: 1,
    });

    const res = await db.query(
      "SELECT * FROM vote WHERE user_id = $1 AND activity_id = $2",
      [testUserIds[0], testActivityIds[0]]
    );
    expect(res.rows.length).toEqual(1);
    expect(res.rows[0].vote_value).toEqual(1);
  });

  test("works: update existing vote to -1", async function () {
    await Vote.castVote(testUserIds[0], testActivityIds[0], 1);
    const updatedVote = await Vote.castVote(
      testUserIds[0],
      testActivityIds[0],
      -1
    );

    expect(updatedVote).toEqual({
      userId: testUserIds[0],
      activityId: testActivityIds[0],
      voteValue: -1,
    });

    const res = await db.query(
      "SELECT * FROM vote WHERE user_id = $1 AND activity_id = $2",
      [testUserIds[0], testActivityIds[0]]
    );
    expect(res.rows.length).toEqual(1);
    expect(res.rows[0].vote_value).toEqual(-1);
  });
  test("works: update existing vote to 0", async function () {
    await Vote.castVote(testUserIds[0], testActivityIds[0], 1);
    const updatedVote = await Vote.castVote(
      testUserIds[0],
      testActivityIds[0],
      0
    );

    expect(updatedVote).toEqual({
      userId: testUserIds[0],
      activityId: testActivityIds[0],
      voteValue: 0,
    });

    const res = await db.query(
      "SELECT * FROM vote WHERE user_id = $1 AND activity_id = $2",
      [testUserIds[0], testActivityIds[0]]
    );
    expect(res.rows.length).toEqual(0);
  });

  test("throws BadRequestError if invalid vote value", async function () {
    await expect(
      Vote.castVote(testUserIds[0], testActivityIds[0], 5)
    ).rejects.toThrow(BadRequestError);
  });
  test("throws BadRequestError when user tries to remove vote that does not exist", async function () {
    await expect(
      Vote.castVote(testUserIds[0], testActivityIds[0], 0)
    ).rejects.toThrow(BadRequestError);
  });
});

/************************************** remove */

describe("remove", function () {
  test("works: remove existing vote", async function () {
    await Vote.castVote(testUserIds[0], testActivityIds[0], 1);
    await Vote.remove(testUserIds[0], testActivityIds[0]);

    const res = await db.query(
      "SELECT * FROM vote WHERE user_id = $1 AND activity_id = $2",
      [testUserIds[0], testActivityIds[0]]
    );
    expect(res.rows.length).toEqual(0);
  });

  test("throws NotFoundError if vote does not exist", async function () {
    await expect(
      Vote.remove(testUserIds[0], testActivityIds[0])
    ).rejects.toThrow(NotFoundError);
  });
});

/************************************** getVotesByActivityId */

describe("getVotesByActivityId", function () {
  test("works: get votes for activity", async function () {
    await Vote.castVote(testUserIds[0], testActivityIds[0], 1);
    await Vote.castVote(testUserIds[1], testActivityIds[0], -1);

    const votes = await Vote.getVotesByActivityId(testActivityIds[0]);
    expect(votes).toEqual([
      { userId: testUserIds[0], activityId: testActivityIds[0], voteValue: 1 },
      { userId: testUserIds[1], activityId: testActivityIds[0], voteValue: -1 },
    ]);
  });

  test("returns empty array if no votes for activity", async function () {
    const votes = await Vote.getVotesByActivityId(testActivityIds[1]);
    expect(votes).toEqual([]);
  });
});

/************************************** getVotesForActivity */

describe("getVotesForActivity", function () {
  test("works: get total vote counts for an activity", async function () {
    await Vote.castVote(testUserIds[0], testActivityIds[0], 1); // Upvote
    await Vote.castVote(testUserIds[1], testActivityIds[0], -1); // Downvote
    await Vote.castVote(testUserIds[2], testActivityIds[0], 1); // Upvote

    const voteCounts = await Vote.getVotesForActivity(testActivityIds[0]);
    expect(voteCounts).toEqual({ upvotes: 2, downvotes: 1 });
  });

  test("returns zero counts if no votes exist for activity", async function () {
    const voteCounts = await Vote.getVotesForActivity(testActivityIds[1]);
    expect(voteCounts).toEqual({ upvotes: 0, downvotes: 0 });
  });
});
