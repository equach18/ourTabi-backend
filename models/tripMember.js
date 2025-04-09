"use strict";

const db = require("../db.js");
const {
  NotFoundError,
  BadRequestError,
} = require("../helpers/expressError.js");

/** Related functions for managing trip members */
class TripMember {
  /** Add a user to a trip
   *
   * Returns { userId, tripId, role, joinedAt }
   *
   * Throws BadRequestError if user is already in the trip
   **/
  static async addMember(userId, tripId, role = "member") {
    if (!["owner", "member"].includes(role)) {
      throw new BadRequestError("Invalid role. Must be 'owner' or 'member'.");
    }

    const duplicateCheck = await db.query(
      `SELECT * FROM trip_member WHERE user_id = $1 AND trip_id = $2`,
      [userId, tripId]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new BadRequestError("User is already a member of this trip.");
    }

    const result = await db.query(
      `INSERT INTO trip_member (user_id, trip_id, role)
         VALUES ($1, $2, $3)
         RETURNING user_id AS "userId", trip_id AS "tripId", role, joined_at AS "joinedAt"`,
      [userId, tripId, role]
    );

    return result.rows[0];
  }

  /** Remove a user from a trip
   *
   * Returns { removed: true }
   *
   * Throws NotFoundError if user is not in the trip
   **/
  static async removeMember(userId, tripId) {
    const result = await db.query(
      `DELETE FROM trip_member 
         WHERE user_id = $1 AND trip_id = $2
         RETURNING user_id`,
      [userId, tripId]
    );

    if (!result.rows.length) {
      throw new NotFoundError(
        `User ${userId} is not a member of trip ${tripId}`
      );
    }

    return { removed: true };
  }

  /** Get all members of a trip
   *
   * Returns [{ userId, username, firstName, lastName, email, profilePic, role, joinedAt }, ...]
   **/
  static async getTripMembers(tripId) {
    const result = await db.query(
      `SELECT u.id AS "userId", 
              u.username, 
              u.first_name AS "firstName", 
              u.last_name AS "lastName",
              u.email,
              u.profile_pic AS "profilePic",
              tm.role,
              tm.joined_at AS "joinedAt"
         FROM trip_member tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.trip_id = $1
         ORDER BY tm.joined_at ASC`,
      [tripId]
    );

    return result.rows;
  }

  /** Check if a user is a member of a trip
   *
   * Returns { userId, tripId, role } if found, otherwise null
   *
   * Throws NotFoundError if userId or tripId is invalid
   * Returns null if user exists but is not a member of the trip
   **/
  static async isMember(userId, tripId) {
    const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [
      userId,
    ]);
    if (!userCheck.rows.length) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    const tripCheck = await db.query(`SELECT id FROM trip WHERE id = $1`, [
      tripId,
    ]);
    if (!tripCheck.rows.length) {
      throw new NotFoundError(`Trip with ID ${tripId} not found.`);
    }
    const result = await db.query(
      `SELECT user_id AS "userId", trip_id AS "tripId", role
         FROM trip_member
         WHERE user_id = $1 AND trip_id = $2`,
      [userId, tripId]
    );

    return result.rows[0] || null;
  }
}

module.exports = TripMember;
