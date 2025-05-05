"use strict";

/** Routes for trips. */

const express = require("express");
const { ensureLoggedIn } = require("../middleware/auth");
const { validateSchema } = require("../middleware/validateSchema");
const {
  ensureTripExists,
  ensureTripOwner,
  ensureTripMember,
} = require("../middleware/tripMiddleware");
const Trip = require("../models/trip");
const TripMember = require("../models/tripMember");
const Comment = require("../models/comment");
const Activity = require("../models/activity");
const Vote = require("../models/vote");
const Friend = require("../models/friend");

const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../helpers/expressError");
const { tripNewSchema, tripUpdateSchema } = require("../schemas/tripSchemas");
const {
  activityNewSchema,
  activityUpdateSchema,
} = require("../schemas/activitySchemas");
const { voteSchema } = require("../schemas/voteSchemas");

const router = new express.Router();

/** POST /trips  => { trip }
 *
 * Creates a new trip and adds user as the owner for member_trip
 *
 * Request body: { title, destination, radius, startDate, endDate, isPrivate }
 * Returns: { id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId }
 *
 * Authorization required: Logged-in user
 */
router.post(
  "/",
  ensureLoggedIn,
  validateSchema(tripNewSchema),
  async function (req, res, next) {
    try {
      const newTrip = await Trip.create({
        ...req.body,
        creatorId: res.locals.user.id,
      });

      return res.status(201).json({ trip: newTrip });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /trips/:tripId  => { trip }
 *
 * Returns trip details.
 *
 * If `isPrivate = true`, only members can see it.
 *
 * Returns: { id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId, activities: [{ id, name, category, description, location, scheduledTime, createdBy }, ...],
 *   members: [{ id, userId, username, firstName, lastName, email, profilePic, role }, ...],
 *   comments: [{ id, userId, tripId, text, createdAt }, ...] }
 *
 * Authorization required: Logged in users - any for non-private trips, member-only for private trips.
 */
router.get(
  "/:tripId",
  ensureLoggedIn,
  ensureTripExists,
  async function (req, res, next) {
    try {
      const trip = await Trip.get(req.params.tripId);
      const member = await TripMember.isMember(res.locals.user.id, trip.id);

      if (trip.isPrivate && !member) {
        throw new ForbiddenError("Unauthorized to view this trip.");
      }
      return res.json({ trip });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /trips  => { trips: [{ id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId }, ...] }
 *
 * Retrieves all public trips, with optional filters.
 *
 * Optional query parameters: (case-insensitive, partial match)
 *  - title
 *  - destination
 *
 * Returns: [{ id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId }, ...]
 *
 * Authorization required: Logged-in user
 */
router.get("/", ensureLoggedIn, async function (req, res, next) {
  try {
    const { title, destination } = req.query;
    const trips = await Trip.findAll({ title, destination });
    return res.json({ trips });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /trips/:tripId  => { trip }
 *
 * Updates a trip.
 *
 * Request body: { title, destination, radius, startDate, endDate, isPrivate }
 * Returns: { id, title, destination, radius, startDate, endDate, isPrivate, createdAt, creatorId }
 *
 * Authorization required: Trip owner/member
 */
router.patch(
  "/:tripId",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripMember,
  validateSchema(tripUpdateSchema),
  async function (req, res, next) {
    try {
      const updatedTrip = await Trip.update(req.params.tripId, req.body);
      return res.json({ trip: updatedTrip });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /trips/:tripId  => { deleted: tripId }
 *
 * Deletes a trip (only owner can do this).
 *
 * Returns: { deleted: tripId }
 *
 * Authorization required: Trip owner
 */
router.delete(
  "/:tripId",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripOwner,
  async function (req, res, next) {
    try {
      await Trip.remove(req.params.tripId);
      return res.json({ deleted: req.params.tripId });
    } catch (err) {
      return next(err);
    }
  }
);

/************************************** Handles trip members  */

/** POST /trips/:tripId/members  => { member }
 *
 * Adds a member to a trip.
 *
 * Request body: { friendId }
 * Returns: { id, userId, tripId, role, joinedAt }
 *
 * Authorization required: Trip owner - can only add friends
 */
router.post(
  "/:tripId/members",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripOwner,
  async function (req, res, next) {
    try {
      const { friendId } = req.body;
      const { tripId } = req.params;
      const userId = res.locals.user.id;
      if (!friendId || typeof friendId !== "number") {
        throw new BadRequestError("Invalid or missing friendId.");
      }

      //  check if the owner is friends with the friendId
      const areFriends = await Friend.areFriends(userId, friendId);
      if (!areFriends) {
        throw new ForbiddenError(
          `You do not have friends with friendId: ${friendId}.`
        );
      }

      const newMember = await TripMember.addMember(friendId, tripId);
      return res.status(201).json({ member: newMember });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /trips/:tripId/members/:memberId  =>  { removed: true }
 *
 * Removes a member from a trip.
 *
 * Authorization required: Trip owner.
 */
router.delete(
  "/:tripId/members/:memberId",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripOwner,
  async function (req, res, next) {
    try {
      const memberId = Number(req.params.memberId);

      await TripMember.removeMember(memberId);

      return res.json({ removed: memberId });
    } catch (err) {
      return next(err);
    }
  }
);

/************************************** Handles comments within a trip  */

/**
 * POST /trips/:tripId/comments  => { comment }
 *
 * Adds a comment to a trip.
 *
 * Request body: {  text }
 * Returns: { id, tripId, userId, text, createdAt }
 *
 * Authorization required: Trip member
 */
router.post(
  "/:tripId/comments",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripMember,
  async function (req, res, next) {
    try {
      if (!req.body.text || req.body.text.trim() === "") {
        throw new BadRequestError("Comment text cannot be empty.");
      }
      const newComment = await Comment.create({
        tripId: req.params.tripId,
        userId: res.locals.user.id,
        text: req.body.text,
      });

      return res.status(201).json({ comment: newComment });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /trips/:tripId/comments/:commentId  => { deleted: commentId }
 *
 * Deletes a comment
 *
 * Returns: { deleted: commentId }
 *
 * Authorization required: Logged in, comment owner
 */
router.delete(
  "/:tripId/comments/:commentId",
  ensureLoggedIn,
  ensureTripMember,
  ensureTripExists,
  async function (req, res, next) {
    try {
      const { tripId, commentId } = req.params;
      const userId = res.locals.user.id;

      const comment = await Comment.get(commentId);

      // make sure the comment belongs to the correct trip
      if (comment.tripId !== Number(tripId)) {
        throw new ForbiddenError("Comment does not belong to this trip.");
      }

      // make sure the user is the owner of the comment
      if (comment.userId !== userId) {
        throw new ForbiddenError(
          "You are not authorized to delete this comment."
        );
      }

      await Comment.remove(commentId);
      return res.json({ deleted: commentId });
    } catch (err) {
      return next(err);
    }
  }
);

/************************************** Handles activities within a trip  */

/** POST /trips/:tripId/activities  => { activity }
 *
 * Creates a new activity within a trip
 *
 * Request body: { name, category, description, location, scheduledTime }
 * Returns: { id, tripId, name, category, description, location, scheduledTime, createdBy, createdAt }
 *
 * Authorization required: trip member
 */
router.post(
  "/:tripId/activities",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripMember,
  validateSchema(activityNewSchema),
  async function (req, res, next) {
    try {
      const newActivity = await Activity.create({
        tripId: req.params.tripId,
        name: req.body.name,
        category: req.body.category,
        description: req.body.description,
        location: req.body.location,
        scheduledTime: req.body.scheduledTime,
        createdBy: res.locals.user.id,
      });

      return res.status(201).json({ activity: newActivity });
    } catch (err) {
      return next(err);
    }
  }
);

/** GET /:tripId/activities  => { activity }
 *
 * Returns all activity details for a trip, including votes.
 *
 * Returns: [{ id, tripId, name, category, description, location, scheduledTime, createdBy, createdAt, votes: [{ userId, voteValue }, ...] }, ...]
 *
 * Authorization required: Public if trip is public, else trip member.
 */
router.get(
  "/:tripId/activities",
  ensureLoggedIn,
  async function (req, res, next) {
    try {
      const { tripId } = req.params;

      // Fetch trip details to check access permissions
      const trip = await Trip.get(tripId);

      // If trip is private, check if user is a member
      if (trip.isPrivate) {
        const member = await TripMember.isMember(res.locals.user.id, trip.id);
        if (!member) {
          throw new ForbiddenError("Unauthorized to view this activity.");
        }
      }

      // Fetch all activities for the trip
      const activities = await Activity.getActivitiesByTrip(tripId);
      return res.json({ activities });
    } catch (err) {
      return next(err);
    }
  }
);


/** PATCH /trips/:tripId/activities/:activityId   => { activity }
 *
 * Updates an activity.
 *
 * Request body: { name, category, description, location, scheduledTime }
 * Returns: { id, tripId, name, category, description, location, scheduledTime, createdBy, createdAt }
 *
 * Authorization required: Must be a trip member.
 */
router.patch(
  "/:tripId/activities/:activityId",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripMember,
  validateSchema(activityUpdateSchema),
  async function (req, res, next) {
    try {
      const activity = await Activity.get(req.params.activityId);

      if (activity.tripId !== Number(req.params.tripId)) {
        throw new ForbiddenError("Activity does not belong to this trip.");
      }
      const updatedActivity = await Activity.update(
        req.params.activityId,
        req.body
      );
      return res.json({ activity: updatedActivity });
    } catch (err) {
      return next(err);
    }
  }
);

/** DELETE /trips/:tripId/activities/:activityId   => { deleted: activityId }
 *
 * Deletes an activity.
 *
 * Returns: { deleted: activityId }
 *
 * Authorization required: trip member
 */
router.delete(
  "/:tripId/activities/:activityId",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripMember,
  async function (req, res, next) {
    try {
      const activity = await Activity.get(req.params.activityId);
      if (activity.tripId !== Number(req.params.tripId)) {
        throw new ForbiddenError("Activity does not belong to this trip.");
      }

      await Activity.remove(req.params.activityId);
      return res.json({ deleted: req.params.activityId });
    } catch (err) {
      return next(err);
    }
  }
);

/** POST /trips/:tripId/activities/:activityId/vote   => { vote }
 *
 * Casts or updates a vote on an activity.
 *
 * Request body: { voteValue }
 * Returns: { userId, activityId, voteValue }
 *
 * Authorization required: Must be a trip member.
 */
router.post(
  "/:tripId/activities/:activityId/vote",
  ensureLoggedIn,
  ensureTripExists,
  ensureTripMember,
  validateSchema(voteSchema),
  async function (req, res, next) {
    try {
      const activity = await Activity.get(req.params.activityId);
      if (activity.tripId !== Number(req.params.tripId)) {
        throw new ForbiddenError("Activity does not belong to this trip.");
      }

      const vote = await Vote.castVote(
        res.locals.user.id,
        req.params.activityId,
        req.body.voteValue
      );
      return res.json({ vote });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
