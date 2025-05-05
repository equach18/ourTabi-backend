"use strict";

/** Routes for friends. */

const express = require("express");
const { ensureLoggedIn } = require("../middleware/auth");
const { ensureFriendRelationship } = require("../middleware/friendMiddleware");
const Friend = require("../models/friend");

const router = new express.Router();

/**
 * POST /friends/:recipientId => { id, senderId, recipientId, status: "pending" }
 *
 * Sends a friend request to another user.
 *
 * Authorization required: Logged-in user
 */
router.post("/:recipientId", ensureLoggedIn, async function (req, res, next) {
  try {
    const recipientId = Number(req.params.recipientId);
    const friendRequest = await Friend.sendFriendRequest(
      res.locals.user.id,
      recipientId
    );
    return res.status(201).json({ friendRequest });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /friends/:friendId  => { id, senderId, recipientId, status: "accepted" }
 *
 * Accepts a friend request using the friendship ID.
 *
 * Authorization required: Logged-in user
 */
router.patch(
  "/:friendId",
  ensureLoggedIn,
  ensureFriendRelationship,
  async function (req, res, next) {
    try {
      const friendId = Number(req.params.friendId);

      const acceptedFriend = await Friend.acceptFriendRequest(
        friendId,
        res.locals.user.id
      );

      return res.json({ acceptedFriend });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /friends/:friendId  => { removed: true }
 *
 * Removes a friend or declines a pending friend request.
 *
 * Authorization required: Logged-in user
 */
router.delete("/:friendId", ensureLoggedIn, ensureFriendRelationship, async function (req, res, next) {
  try {
    const friendId = Number(req.params.friendId);
    await Friend.remove(friendId);
    return res.json({ removed: friendId });
  } catch (err) {
    return next(err);
  }
});
module.exports = router;
