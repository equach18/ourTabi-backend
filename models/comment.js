"use strict";

const db = require("../db");
const { NotFoundError, BadRequestError } = require("../helpers/expressError");

/** Related functions for comments. */

class Comment {
  /** Create a new comment
   *
   * Returns { id, userId, tripId, text, createdAt }
   **/
  static async create({ userId, tripId, text }) {
    if (!text) throw new BadRequestError("Comment text cannot be empty.");

    const result = await db.query(
      `INSERT INTO comment (user_id, trip_id, text)
       VALUES ($1, $2, $3)
       RETURNING id, user_id AS "userId", trip_id AS "tripId", text, created_at AS "createdAt"`,
      [userId, tripId, text]
    );

    return result.rows[0];
  }

  /** Get comment by id
   *
   * Returns { id, userId, tripId, text, createdAt }
   **/
  static async get(id) {
    const result = await db.query(
      `SELECT id,
              user_id AS "userId",
              trip_id AS "tripId",
              text,
              created_at AS "createdAt"
       FROM comment
       WHERE id = $1`,
      [id]
    );

    const comment = result.rows[0];

    if (!comment) {
      throw new NotFoundError(`No comment found with ID: ${id}`);
    }

    return comment;
  }

  /** Get all comments for a trip
   *
   * Returns [{ id, userId, tripId, text, createdAt }, ...] or empty array if no comments
   **/
  static async getCommentsByTrip(tripId) {
    const result = await db.query(
      `SELECT c.id, 
              c.user_id AS "userId", 
              u.username AS "username",
              c.trip_id AS "tripId", 
              c.text, 
              c.created_at AS "createdAt"
       FROM comment c
       JOIN users u ON c.user_id = u.id
       WHERE c.trip_id = $1
       ORDER BY c.created_at ASC`,
      [tripId]
    );

    return result.rows;
  }

  /** Delete a comment
   *
   * Returns { deleted: true }
   *
   * Throws NotFoundError if comment does not exist.
   **/
  static async remove(id) {
    const result = await db.query(
      `DELETE FROM comment
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (!result.rows.length) {
      throw new NotFoundError(`No comment found with id: ${id}`);
    }

    return { deleted: true };
  }
}

module.exports = Comment;
