"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");

const {
  NotFoundError,
  BadRequestError,
} = require("../helpers/expressError.js");
const Activity = require("./activity");
const TripMember = require("./tripMember");
const Comment = require("./comment");

/** Related functions for trips. */

class Trip {
  /** Create a new trip
   *
   * Returns { id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId }
   *
   **/
  static async create({
    title,
    destination,
    radius,
    startDate,
    endDate,
    isPrivate,
    creatorId,
  }) {
    const result = await db.query(
      `INSERT INTO trip (title, destination, radius, start_date, end_date, is_private, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id,
                  title,
                  destination,
                  radius,
                  start_date AS "startDate",
                  end_date AS "endDate",
                  is_private AS "isPrivate",
                  created_at AS "createdAt",
                  creator_id AS "creatorId"`,
      [title, destination, radius, startDate, endDate, isPrivate, creatorId]
    );
    const trip = result.rows[0];
    await TripMember.addMember(trip.creatorId, trip.id, "owner")
    return trip;
  }

  /** Find all public trips, optionally filtering by destination or title
   *
   * Accepts optional search filters: {title, destination}
   *
   * Returns [{ id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId }, ...]
   *
   **/

  static async findAll(searchFilters = {}) {
    let query = `SELECT id, 
                      title, 
                      destination, 
                      radius, 
                      start_date AS "startDate", 
                      end_date AS "endDate", 
                      is_private AS "isPrivate", 
                      created_at AS "createdAt", 
                      creator_id AS "creatorId"
               FROM trip
               WHERE is_private = FALSE`;

    let whereExpressions = [];
    let queryValues = [];

    const { title, destination } = searchFilters;

    if (title) {
      queryValues.push(`%${title}%`);
      whereExpressions.push(`title ILIKE $${queryValues.length}`);
    }

    if (destination) {
      queryValues.push(`%${destination}%`);
      whereExpressions.push(`destination ILIKE $${queryValues.length}`);
    }

    if (whereExpressions.length > 0) {
      query += " AND " + whereExpressions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    const tripsRes = await db.query(query, queryValues);
    return tripsRes.rows;
  }

  /** Checks if the userId is the owner of the tripId
   *
   * Returns boolean
   *
   **/

  static async isOwner(userId, tripId) {
    const result = await db.query(
      `SELECT id FROM trip 
       WHERE id = $1 AND creator_id = $2`,
      [tripId, userId]
    );
  
    return result.rows.length > 0; 
  }

  /** Get trip by tripId
   *
   * Returns { id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId, activities: [{ id, name, category, description, location, scheduledTime, createdBy }, ...],
   *   members: [{ userId, username, firstName, lastName, email, profilePic, role, joinedAt }, ...],
   *   comments: [{ id, userId, tripId, text, createdAt }, ...] }
   *
   * Throws NotFoundError if trip is not found.
   **/
  static async get(tripId) {
    const result = await db.query(
      `SELECT id,
              title,
              destination,
              radius,
              start_date AS "startDate",
              end_date AS "endDate",
              is_private AS "isPrivate",
              created_at AS "createdAt",
              creator_id AS "creatorId"
       FROM trip
       WHERE id = $1`,
      [tripId]
    );

    const trip = result.rows[0];
    if (!trip) throw new NotFoundError(`No trip found with ID: ${tripId}`);
    trip.activities = await Activity.getActivitiesByTrip(trip.id, "accepted");
    trip.members = await TripMember.getTripMembers(trip.id);
    trip.comments = await Comment.getCommentsByTrip(trip.id);
    return trip;
  }
  /** Update a trip
   *
   * This is a "partial update" --- only changes provided fields.
   *
   * Data can include:
   *   { title, destination, radius, startDate, endDate, isPrivate }
   *
   * Returns { id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId }
   *
   * Throws NotFoundError if trip not found.
   **/
  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      startDate: "start_date",
      endDate: "end_date",
      isPrivate: "is_private",
    });

    const querySql = `UPDATE trip 
                      SET ${setCols} 
                      WHERE id = $${values.length + 1} 
                      RETURNING id, 
                                title, 
                                destination, 
                                radius, 
                                start_date AS "startDate", 
                                end_date AS "endDate",
                                is_private AS "isPrivate", 
                                created_at AS "createdAt", 
                                creator_id AS "creatorId"`;

    const result = await db.query(querySql, [...values, id]);
    const trip = result.rows[0];

    if (!trip) throw new NotFoundError(`No trip found with id: ${id}`);

    return trip;
  }

  /** Delete a trip
   *
   * Returns { deleted: true }.
   *
   * Throws NotFoundError if trip not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE FROM trip
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (!result.rows.length) {
      throw new NotFoundError(`No trip found with id: ${id}`);
    }
    return { deleted: true };
  }
}

module.exports = Trip;
