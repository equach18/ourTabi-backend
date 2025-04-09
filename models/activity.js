"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { NotFoundError, BadRequestError } = require("../helpers/expressError");
const Vote = require("./vote");

/** Related functions for activities. */

class Activity {
  /** Create a new activity
   *
   * Returns { id, tripId, name, category, description, location, scheduledTime, createdBy, createdAt }
   **/

  static async create({
    tripId,
    name,
    category = "other",
    description,
    location,
    scheduledTime,
    createdBy,
  }) {
    const validCategories = [
      "food",
      "hiking",
      "tours",
      "shopping",
      "adventure",
      "outdoors",
      "other",
    ];

    if (!validCategories.includes(category)) {
      throw new BadRequestError(`Invalid category: ${category}`);
    }

    const result = await db.query(
      `INSERT INTO activity
         (trip_id, name, category, description, location, scheduled_time, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::TIMESTAMP AT TIME ZONE 'UTC', $7)
       RETURNING id, trip_id AS "tripId", name, category, description, location, 
                 scheduled_time AS "scheduledTime", created_by AS "createdBy", created_at AS "createdAt"`,
      [tripId, name, category, description, location, scheduledTime, createdBy]
    );

    return result.rows[0];
  }

  /** Find all activities for a trip, including votes
   *
   * Returns [{ id, tripId, name, category, description, location, scheduledTime, createdBy, createdAt, votes: [{ userId, voteValue }, ...] }, ...]
   */
  static async getActivitiesByTrip(tripId) {
    const result = await db.query(
      `SELECT a.id, 
            a.trip_id AS "tripId", 
            a.name, 
            a.category, 
            a.description, 
            a.location, 
            a.scheduled_time AT TIME ZONE 'UTC' AS "scheduledTime", 
            a.created_by AS "createdBy", 
            a.created_at AS "createdAt",
            json_agg(
              json_build_object(
                'userId', v.user_id, 
                'voteValue', v.vote_value
              )
            ) AS votes
     FROM activity AS a
     LEFT JOIN vote AS v ON a.id = v.activity_id
     WHERE a.trip_id = $1
     GROUP BY a.id
     ORDER BY a.scheduled_time ASC`,
      [tripId]
    );

    return result.rows.map((activity) => ({
      ...activity,
      votes: activity.votes[0].userId ? activity.votes : [], 
    }));
  }

  /** Get activity by id
   *
   * Returns { id, tripId, name, category, description, location, scheduledTime, createdBy, createdAt, votes: [{ userId, activityId, voteValue }, ...] }
   *
   * Throws NotFoundError if activity not found.
   **/

  static async get(id) {
    const result = await db.query(
      `SELECT id, trip_id AS "tripId", name, category, description, location, 
         scheduled_time AT TIME ZONE 'UTC' AS "scheduledTime", created_by AS "createdBy", created_at AS "createdAt"
         FROM activity
         WHERE id = $1`,
      [id]
    );

    const activity = result.rows[0];
    if (!activity) throw new NotFoundError(`No activity found with id: ${id}`);

    activity.votes = await Vote.getVotesByActivityId(id);

    return activity;
  }

  /** Update activity
   *
   * This is a "partial update" --- only changes provided fields.
   *
   * Data can include:
   *   { name, category, description, location, scheduledTime }
   *
   * Returns { id, tripId, name, category, description, location, scheduledTime, createdBy, createdAt }
   *
   * Throws NotFoundError if activity not found.
   **/

  static async update(id, data) {
    const validCategories = [
      "food",
      "hiking",
      "tours",
      "shopping",
      "adventure",
      "outdoors",
      "other",
    ];

    if (data.category && !validCategories.includes(data.category)) {
      throw new BadRequestError(`Invalid category: ${data.category}`);
    }

    const { setCols, values } = sqlForPartialUpdate(data, {
      scheduledTime: "scheduled_time",
    });

    const querySql = `UPDATE activity
                      SET ${setCols}
                      WHERE id = $${values.length + 1}
                      RETURNING id, trip_id AS "tripId", name, category, description, location, 
                        scheduled_time AT TIME ZONE 'UTC' AS "scheduledTime", created_by AS "createdBy", created_at AS "createdAt"`;

    const result = await db.query(querySql, [...values, id]);
    const activity = result.rows[0];

    if (!activity) throw new NotFoundError(`No activity found with id: ${id}`);

    return activity;
  }

  /** Delete an activity
   *
   * Returns { deleted: true }.
   *
   * Throws NotFoundError if activity not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE FROM activity
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (!result.rows.length) {
      throw new NotFoundError(`No activity found with id: ${id}`);
    }

    return { deleted: true };
  }
}

module.exports = Activity;
