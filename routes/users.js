"use strict";

/** Routes for users. */

const express = require("express");
const {
  ensureCorrectUserOrAdmin,
  ensureLoggedIn,
  ensureAdmin,
} = require("../middleware/auth");
const {
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} = require("../helpers/expressError");
const { validateSchema } = require("../middleware/validateSchema");
const User = require("../models/user");
const Friend = require("../models/friend");
const {
  userRegisterSchema,
  userUpdateSchema,
} = require("../schemas/userSchemas");
const { createToken } = require("../helpers/tokens");

const router = new express.Router();

/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { id, username, firstName, lastName, email, profilePic, bio, isAdmin }, token }
 *
 * Authorization required: admin
 **/
router.post(
  "/",
  ensureAdmin,
  validateSchema(userRegisterSchema),
  async function (req, res, next) {
    try {
      const newUser = await User.register({ ...req.body });
      const token = createToken(newUser);
      return res.status(201).json({ user: newUser, token });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /[username] => { user: {  id, username, firstName, lastName, email, isAdmin, bio, profilePic, trips: {[id, title, destination, startDate, endDate, isPrivate],...}, friends: {[...],...}, friendRequests: {[...], ...} } }
 * Returns detailed user info: { id, username, firstName, lastName, email, isAdmin, bio, profilePic, trips, friends, friendRequests }
 *
 * Authorization required: admin, is or friends with same-user-as-:username
 **/
router.get("/:username", ensureLoggedIn, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    const currentUser = res.locals.user;

    if (currentUser.isAdmin || currentUser.username === req.params.username) {
      return res.json({ user });
    }

    const isFriend = await Friend.areFriends(currentUser.id, user.id);

    if (!isFriend) {
      throw new ForbiddenError("You are not friends with this user.");
    }

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, email, isAdmin, bio, profilePic }
 *
 * Returns updated fields and correspondeing upated data 
 *
 * Authorization required: admin or same-user-as-:username
 **/
router.patch(
  "/:username",
  ensureCorrectUserOrAdmin,
  validateSchema(userUpdateSchema),
  async function (req, res, next) {
    try {
      const updatedUser = await User.update(req.params.username, req.body);
      return res.json({ user: updatedUser });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin or same-user-as-:username
 **/
router.delete(
  "/:username",
  ensureCorrectUserOrAdmin,
  async function (req, res, next) {
    try {
      await User.remove(req.params.username);
      return res.json({ deleted: req.params.username });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /users?query=username => { users: [{ id, username, firstName, lastName, profilePic }, ...] }
 *
 * Allows searching for users by username.
 *
 * Authorization required: logged-in user
 **/
router.get("/", ensureLoggedIn, async function (req, res, next) {
  try {
    const { query } = req.query;

    if (!query) {
      throw new BadRequestError("Search query is required.");
    }

    const users = await User.searchUsers(query);

    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

/************************************** Routes to handle friendship between users */

/**
 * POST /:username/friend-request  => { senderId, recipientId, status: "pending" }
 *
 * Sends a friend request to another user.
 *
 * Authorization required: Logged-in user
 */
router.post(
  "/:username/friend-request",
  ensureLoggedIn,
  async function (req, res, next) {
    try {
      const recipient = await User.get(req.params.username);

      if (!recipient)
        throw new NotFoundError(`User not found: ${req.params.username}`);

      const friendRequest = await Friend.sendFriendRequest(
        res.locals.user.id,
        recipient.id
      );
      return res.status(201).json({ friendRequest });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /:username/friend-request  => { senderId, recipientId, status: "accepted" }
 *
 * Accepts a friend request from another user.
 *
 * Authorization required: Logged-in user
 */
router.patch(
  "/:username/friend-request",
  ensureLoggedIn,
  async function (req, res, next) {
    try {
      const sender = await User.get(req.params.username);

      if (!sender)
        throw new NotFoundError(`User not found: ${req.params.username}`);

      const acceptedFriend = await Friend.acceptFriendRequest(
        sender.id,
        res.locals.user.id
      );
      return res.json({ acceptedFriend });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /:username/friend-request  => { removed: true }
 *
 * Removes a friend or declines a pending friend request.
 *
 * Authorization required: Logged-in user
 */
router.delete(
  "/:username/friend-request",
  ensureLoggedIn,
  async function (req, res, next) {
    try {
      const friend = await User.get(req.params.username);

      if (!friend)
        throw new NotFoundError(`User not found: ${req.params.username}`);

      await Friend.remove(res.locals.user.id, friend.id);
      return res.json({ removed: friend.id });
    } catch (err) {
      return next(err);
    }
  }
);
module.exports = router;
