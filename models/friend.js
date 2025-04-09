"use strict";

const { number } = require("joi");
const db = require("../db");
const {
  NotFoundError,
  BadRequestError,
} = require("../helpers/expressError.js");

/** Related functions for friends. */

class Friend {
  /** Send a friend request
   *
   * Returns { senderId, recipientId, status: "pending" }
   *
   * Throws BadRequestError if the friend request already exists or ids are the same.
   **/

  static async sendFriendRequest(senderId, recipientId) {
    if (senderId === recipientId) {
      throw new BadRequestError("Friend request cannot be sent to yourself.");
    }

    const duplicateCheck = await db.query(
      `SELECT * FROM friend 
         WHERE (sender_id = $1 AND recipient_id = $2)
            OR (sender_id = $2 AND recipient_id = $1)`,
      [senderId, recipientId]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new BadRequestError(
        "Friend request already sent or you are already friends."
      );
    }

    const result = await db.query(
      `INSERT INTO friend (sender_id, recipient_id, status)
         VALUES ($1, $2, 'pending')
         RETURNING sender_id AS "senderId", recipient_id AS "recipientId", status`,
      [senderId, recipientId]
    );

    return result.rows[0];
  }

  /** Accept a friend request
   *
   * Returns { senderId, recipientId, status: "accepted" }
   *
   * Throws NotFoundError if the request does not exist
   **/

  static async acceptFriendRequest(senderId, recipientId) {
    const checkRequest = await db.query(
      `SELECT sender_id, recipient_id, status FROM friend
       WHERE ((sender_id = $1 AND recipient_id = $2) 
          OR (sender_id = $2 AND recipient_id = $1)) 
         AND status = 'pending'`,
      [senderId, recipientId]
    );

    if (!checkRequest.rows.length) {
      throw new NotFoundError(
        `No pending friend request between users: ${senderId} and ${recipientId}.`
      );
    }

    const request = checkRequest.rows[0];
    // Ensure only the recipient can accept
    if (Number(recipientId) !== Number(request.recipient_id)) {
      throw new BadRequestError(
        "Only the recipient can accept the friend request."
      );
    }

    // Accept the request
    const result = await db.query(
      `UPDATE friend
       SET status = 'accepted'
       WHERE sender_id = $1 AND recipient_id = $2
       RETURNING sender_id AS "senderId", recipient_id AS "recipientId", status`,
      [request.sender_id, request.recipient_id] 
    );

    return result.rows[0];
  }
  /** Deny friend request or remove friend
   *
   * Returns { removed: true }
   *
   * Throws NotFoundError if record between users do not exist
   **/

  static async remove(senderId, recipientId) {
    const result = await db.query(
      `DELETE FROM friend
         WHERE (sender_id = $1 AND recipient_id = $2)
            OR (sender_id = $2 AND recipient_id = $1)
         RETURNING sender_id`,
      [senderId, recipientId]
    );

    if (!result.rows.length) {
      throw new NotFoundError(
        `No relationship found between users: ${senderId} and ${recipientId}`
      );
    }

    return { removed: true };
  }

  /** Get user's friends by status
   *
   * Returns [{friendUsername, firstName, lastName, email, profilePic, status} ...] or empty array if no friends are found for user
   *
   * Throws BadRequestError if status is not 'accepted' or 'pending'
   **/

  static async getFriendsByStatus(userId, status) {
    status = status.toLowerCase();
    if (!["accepted", "pending", "sent"].includes(status)) {
      throw new BadRequestError(
        `Invalid status: ${status}. Must be 'accepted', 'pending', or 'sent'.`
      );
    }

    let result;

    if (status === "sent") {
      // Get friend requests the user has SENT but are still pending
      result = await db.query(
        `SELECT u.username AS "friendUsername", 
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email AS "email",
              u.profile_pic AS "profilePic",
              f.status
         FROM friend f
         JOIN users u ON u.id = f.recipient_id
         WHERE f.sender_id = $1
           AND f.status = 'pending'`,
        [userId]
      );
    } else if (status === "pending") {
      // Get friend requests the user has RECEIVED but have not accepted
      result = await db.query(
        `SELECT u.username AS "friendUsername", 
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email AS "email",
              u.profile_pic AS "profilePic",
              f.status
         FROM friend f
         JOIN users u ON u.id = f.sender_id
         WHERE f.recipient_id = $1
           AND f.status = 'pending'`,
        [userId]
      );
    } else {
      // Get accepted friends (default case)
      result = await db.query(
        `SELECT u.username AS "friendUsername", 
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email AS "email",
              u.profile_pic AS "profilePic",
              f.status
         FROM friend f
         JOIN users u ON 
            (f.sender_id = u.id OR f.recipient_id = u.id)
         WHERE (f.sender_id = $1 OR f.recipient_id = $1)
           AND u.id != $1
           AND f.status = 'accepted'`,
        [userId]
      );
    }

    return result.rows;
  }

  /** Check if two users are friends
   *
   * Returns true if users are friends (status = 'accepted'), otherwise false.
   */

  static async areFriends(userId1, userId2) {
    const result = await db.query(
      `SELECT 1 FROM friend
     WHERE ((sender_id = $1 AND recipient_id = $2)
        OR (sender_id = $2 AND recipient_id = $1))
       AND status = 'accepted'`,
      [userId1, userId2]
    );

    return result.rowCount > 0;
  }
}

module.exports = Friend;
