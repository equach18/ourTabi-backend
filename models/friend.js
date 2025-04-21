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
   * Returns { id, senderId, recipientId, status: "pending" }
   *
   * Throws BadRequestError if the friend request already exists or ids are the same.
   **/

  static async sendFriendRequest(senderId, recipientId) {
    if (senderId === recipientId) {
      throw new BadRequestError("Friend request cannot be sent to yourself.");
    }

    const duplicateCheck = await db.query(
      `SELECT id FROM friend 
         WHERE (sender_id = $1 AND recipient_id = $2)
            OR (sender_id = $2 AND recipient_id = $1)`,
      [senderId, recipientId]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new BadRequestError(
        "Friend request already sent or you are already friends."
      );
    }

    const recipientCheck = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [recipientId]
    );
    if (!recipientCheck.rows.length) {
      throw new NotFoundError(
        `Recipient with id ${recipientId} does not exist.`
      );
    }

    const result = await db.query(
      `INSERT INTO friend (sender_id, recipient_id, status)
         VALUES ($1, $2, 'pending')
         RETURNING id, sender_id AS "senderId", recipient_id AS "recipientId", status`,
      [senderId, recipientId]
    );

    return result.rows[0];
  }

  /** Accept a friend request
   *
   * Returns { id, senderId, recipientId, status: "accepted" }
   *
   * Throws NotFoundError if the friendship id does not exist
   **/

  static async acceptFriendRequest(friendshipId, currentUserId) {
    const checkRes = await db.query(
      `SELECT id, sender_id, recipient_id, status
       FROM friend
       WHERE id = $1`,
      [friendshipId]
    );

    const request = checkRes.rows[0];

    // Make sure that the status is pending
    if (request.status !== "pending") {
      throw new BadRequestError("Friend request is not pending.");
    }

    // Only recipient can accept
    if (Number(currentUserId) !== Number(request.recipient_id)) {
      throw new BadRequestError(
        "Only the recipient can accept this friend request."
      );
    }

    const result = await db.query(
      `UPDATE friend
     SET status = 'accepted'
     WHERE id = $1
     RETURNING id, sender_id AS "senderId", recipient_id AS "recipientId", status`,
      [friendshipId]
    );

    return result.rows[0];
  }
  
  /** Deny friend request or remove friend
   *
   * Returns { removed: true }
   *
   * Throws NotFoundError if friendship id does not exist
   **/

  static async remove(friendshipId) {
    const result = await db.query(
      `DELETE FROM friend
       WHERE id = $1
       RETURNING id`,
      [friendshipId]
    );

    if (!result.rows.length) {
      throw new NotFoundError(`No friendship found with id: ${friendshipId}`);
    }

    return { removed: true };
  }

  /** Get user's friends by user id
   *
   * Returns {friends: [id, username, first_name, last_name, email, profile_pic]], sentRequests[...], incomingRequests:[...]}
   *
   **/

  static async getFriendsByUserId(userId) {
    const friendsRes = await db.query(
      `SELECT f.id,
              u.username AS "username",
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email,
              u.profile_pic AS "profilePic"
       FROM friend f
       JOIN users u ON u.id = CASE 
                                WHEN f.sender_id = $1 THEN f.recipient_id 
                                ELSE f.sender_id 
                              END
       WHERE (f.sender_id = $1 OR f.recipient_id = $1)
         AND f.status = 'accepted'`,
      [userId]
    );

    const incomingRes = await db.query(
      `SELECT f.id,
              u.username AS "username",
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email,
              u.profile_pic AS "profilePic"
       FROM friend f
       JOIN users u ON u.id = f.sender_id
       WHERE f.recipient_id = $1
         AND f.status = 'pending'`,
      [userId]
    );

    const sentRes = await db.query(
      `SELECT f.id,
              u.username AS "username",
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              u.email,
              u.profile_pic AS "profilePic"
       FROM friend f
       JOIN users u ON u.id = f.recipient_id
       WHERE f.sender_id = $1
         AND f.status = 'pending'`,
      [userId]
    );

    return {
      friends: friendsRes.rows,
      incomingRequests: incomingRes.rows,
      sentRequests: sentRes.rows,
    };
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

  /**
   * Get the senderId, recipientId, and status by friend id 
   * 
   * Returns {senderId, recipientId, status} or null if no relationship exists
   */
  static async getById(friendId) {
    const result = await db.query(
      `SELECT id, sender_id AS "senderId", recipient_id AS "recipientId", status
       FROM friend
       WHERE id = $1`,
      [friendId]
    );
  
    return result.rows[0] || null;
  }
}

module.exports = Friend;
