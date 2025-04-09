"use strict";

const db = require("../db");
const {
  NotFoundError,
  BadRequestError,
} = require("../helpers/expressError.js");

/** Related functions for votes. */

class Vote {
  /** Cast a vote from user for an activity. Update vote if the user has already voted.
   *
   * Returns { userId, activityId, voteValue }
   *
   * Throws BadRequestError if vote value is not 1 or -1
   **/

  static async castVote(userId, activityId, voteValue) {
    if (![1, 0, -1].includes(voteValue)) {
      throw new BadRequestError(
        "Invalid vote value. Must be either 1 (upvote), -1 (downvote), or 0 (vote removal)."
      );
    }

    const existingVote = await db.query(
      `SELECT * FROM vote WHERE user_id = $1 AND activity_id = $2`,
      [userId, activityId]
    );

    // update if user has already voted. If not, add new vote.
    if (existingVote.rows.length > 0) {
      if (voteValue === 0) {
        // Remove vote if voteValue is 0
        await db.query(
          `DELETE FROM vote WHERE user_id = $1 AND activity_id = $2`,
          [userId, activityId]
        );
        return { userId, activityId, voteValue: 0 }; // Indicate vote removal
      } else {
        // Update vote if already exists
        const result = await db.query(
          `UPDATE vote
             SET vote_value = $1, created_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND activity_id = $3
             RETURNING user_id AS "userId", activity_id AS "activityId", vote_value AS "voteValue"`,
          [voteValue, userId, activityId]
        );
        return result.rows[0];
      }
    } else {
      // handle if no votes exist 
      if (voteValue === 0) {
        throw new BadRequestError("No existing vote to remove.");
      }
      const result = await db.query(
        `INSERT INTO vote (user_id, activity_id, vote_value)
           VALUES ($1, $2, $3)
           RETURNING user_id AS "userId", activity_id AS "activityId", vote_value AS "voteValue"`,
        [userId, activityId, voteValue]
      );
      return result.rows[0];
    }
  }

  /** Remove a vote.
   *
   * Returns undefined
   *
   * Throws BadRequestError if the vote does not exist.
   **/

  static async remove(userId, activityId) {
    const result = await db.query(
      `DELETE FROM vote
         WHERE user_id = $1 AND activity_id = $2
         RETURNING user_id`,
      [userId, activityId]
    );

    if (!result.rows.length) {
      throw new NotFoundError(
        `No vote found for user ${userId} on activity ${activityId}`
      );
    }
  }

  /** Get all votes for an activity
   *
   * Returns [{ userId, activityId, voteValue }, ...] or empty array if there are no votes
   **/

  static async getVotesByActivityId(activityId) {
    const result = await db.query(
      `SELECT user_id AS "userId",
                activity_id AS "activityId",
                vote_value AS "voteValue"
        FROM vote
        WHERE activity_id = $1`,
      [activityId]
    );

    return result.rows;
  }
  /** Get total upvotes and downvotes for an activity.
   *
   * Returns { upvotes: number, downvotes: number }
   */
  static async getVotesForActivity(activityId) {
    const result = await db.query(
      `SELECT
          SUM(CASE WHEN vote_value = 1 THEN 1 ELSE 0 END) AS upvotes,
          SUM(CASE WHEN vote_value = -1 THEN 1 ELSE 0 END) AS downvotes
       FROM vote
       WHERE activity_id = $1`,
      [activityId]
    );

    return {
      upvotes: Number(result.rows[0].upvotes) || 0,
      downvotes: Number(result.rows[0].downvotes) || 0,
    };
  }
}

module.exports = Vote;
