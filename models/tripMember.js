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
   * Returns { id, userId, tripId, role, joinedAt }
   *
   * Throws BadRequestError if user is already in the trip
   **/
  static async addMember(userId, tripId, role = "member") {
    if (!["owner", "member"].includes(role)) {
      throw new BadRequestError("Invalid role. Must be 'owner' or 'member'.");
    }

    const duplicateCheck = await db.query(
      `SELECT id FROM trip_member WHERE user_id = $1 AND trip_id = $2`,
      [userId, tripId]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new BadRequestError("User is already a member of this trip.");
    }

    const result = await db.query(
      `INSERT INTO trip_member (user_id, trip_id, role)
       VALUES ($1, $2, $3)
       RETURNING id, user_id AS "userId", trip_id AS "tripId", role`,
      [userId, tripId, role]
    );

    return result.rows[0];
  }

  /** Remove a user from a trip by (tripMember) id
   *
   * Returns { removed: true }
   *
   * Throws NotFoundError if user is not in the trip
   **/
  static async removeMember(tripMemberId) {
    const result = await db.query(
      `DELETE FROM trip_member 
       WHERE id = $1
       RETURNING id`,
      [tripMemberId]
    );

    if (!result.rows.length) {
      throw new NotFoundError(
        `No trip member found with trip member id: ${tripMemberId}`
      );
    }

    return { removed: true };
  }

  /** Get all members of a trip
   *
   * Returns [{ userId, username, firstName, lastName, email, profilePic, role }, ...]
   **/
  static async getTripMembers(tripId) {
    const result = await db.query(
      `SELECT tm.id,
              tm.user_id AS "userId",
              u.username,
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.profile_pic AS "profilePic",
              tm.role
       FROM trip_member tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = $1
       ORDER BY tm.joined_at ASC`,
      [tripId]
    );

    return result.rows;
  }

  /** Check if a user is a member of a trip
   *
   * Returns { id, userId, tripId, role } if found, otherwise null
   *
   **/
  static async isMember(userId, tripId) {
    const result = await db.query(
      `SELECT id, user_id AS "userId", trip_id AS "tripId", role
       FROM trip_member
       WHERE user_id = $1 AND trip_id = $2`,
      [userId, tripId]
    );
  
    return result.rows[0] || null;
  }
}

module.exports = TripMember;
