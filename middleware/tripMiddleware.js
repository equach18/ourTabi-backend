const { NotFoundError, ForbiddenError } = require("../helpers/expressError");
const Trip = require("../models/trip");
const TripMember = require("../models/tripMember");

/** Middleware: Ensures the trip exists before continuing */
async function ensureTripExists(req, res, next) {
  try {
    const trip = await Trip.get(req.params.tripId);
    if (!trip)
      throw new NotFoundError(
        `Trip with ID ${req.params.tripId} does not exist.`
      );
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Ensures the logged-in user is the trip owner */
async function ensureTripOwner(req, res, next) {
  try {
    const userId = res.locals.user.id;
    const tripId = req.params.tripId;

    const owner = await Trip.isOwner(userId, tripId);
    if (!owner)
      throw new ForbiddenError("Only the trip owner can perform this action.");

    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware: Ensures the logged-in user is a trip member */
async function ensureTripMember(req, res, next) {
  try {
    const userId = res.locals.user.id;
    const tripId = req.params.tripId;

    const member = await TripMember.isMember(userId, tripId);
    if (!member)
      throw new ForbiddenError(
        "You must be a member of this trip to perform this action"
      );

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { ensureTripExists, ensureTripOwner, ensureTripMember };
