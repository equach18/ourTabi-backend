"use strict";

const db = require("../db");
const bcrypt = require("bcryptjs");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../helpers/expressError.js");
const Friend = require("./friend");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
  /** authenticate user with username, password.
   *
   * Returns { id, username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT id,
              username,
              password,
              first_name AS "firstName",
              last_name AS "lastName",
              email,
              is_admin AS "isAdmin"
        FROM users
        WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** Register user with data.
   *
   * Returns { id, username, firstName, lastName, email, isAdmin }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register({
    username,
    password,
    firstName,
    lastName,
    email,
    isAdmin = false,
  }) {
    const duplicateCheck = await db.query(
      `SELECT id FROM users WHERE username = $1 OR email = $2`,
      [username, email]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new BadRequestError(`Username or email already exists.`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
      [username, hashedPassword, firstName, lastName, email, isAdmin]
    );

    return result.rows[0];
  }

  /** Find all users.
   *
   * Returns [{ id, username, first_name, last_name, email, is_admin }, ...]
   **/

  static async findAll() {
    const result = await db.query(
      `SELECT id,
              username,
              first_name AS "firstName",
              last_name AS "lastName",
              email,
              is_admin AS "isAdmin"
        FROM users
        ORDER BY username`
    );

    return result.rows;
  }

  /** Given a username, return data about user including their trips.
   *
   * Returns {  id, username, firstName, lastName, email, isAdmin, bio, profilePic, trips: [id, title, destination, startDate, endDate, isPrivate], friends: [...], friendRequests: [...] }
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    // fetch user data
    const userRes = await db.query(
      `SELECT id, 
              username,
              first_name AS "firstName",
              last_name AS "lastName",
              email,
              is_admin AS "isAdmin",
              bio,
              profile_pic AS "profilePic"
        FROM users
        WHERE username = $1`,
      [username]
    );

    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user found: ${username}`);

    const tripsRes = await db.query(
      `SELECT t.id,
              t.title,
              t.destination,
              t.radius,
              t.start_date AS "startDate",
              t.end_date AS "endDate",
              t.is_private AS "isPrivate",
              t.created_at AS "createdAt",
              t.creator_id AS "creatorId",
              tm.role
       FROM trip_member tm
       JOIN trip t ON t.id = tm.trip_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [user.id]
    );

    user.trips = tripsRes.rows;
    user.friends = await Friend.getFriendsByStatus(user.id, "accepted");
    user.friendRequests = await Friend.getFriendsByStatus(user.id, "pending");

    return user;
  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, email, isAdmin, bio, profilePic }
   *
   * Returns { id, username, firstName, lastName, email, isAdmin, bio, profilePic }
   *
   * Throws NotFoundError if not found.
   *
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(data, {
      firstName: "first_name",
      lastName: "last_name",
      email: "email",
      bio: "bio",
      profilePic: "profile_pic",
    });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING id,
                                username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                bio,
                                profile_pic AS "profilePic"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    return user;
  }

  /** Delete given user from database.
   *
   * returns undefined.
   *
   * Throws NotFoundError if user is not found
   * */

  static async remove(username) {
    let result = await db.query(
      `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
      [username]
    );
    if (!result.rows[0]) throw new NotFoundError(`No user: ${username}`);
  }

  /** Search users by partial username match
   *
   * Returns [{ id, username, firstName, lastName, profilePic }, ...]
   *
   */

  static async searchUsers(query) {
    const result = await db.query(
      `SELECT id, 
                username, 
                first_name AS "firstName", 
                last_name AS "lastName", 
                profile_pic AS "profilePic"
         FROM users
         WHERE username ILIKE $1
         ORDER BY username`,
      [`%${query}%`]
    );

    return result.rows;
  }
}

module.exports = User;
