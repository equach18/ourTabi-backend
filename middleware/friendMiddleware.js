// middleware/ensureFriendshipParticipant.js
const { NotFoundError, UnauthorizedError } = require("../helpers/expressError");
const Friend = require("../models/friend");

/** Middleware to ensure current user is part of the friendship (sender or recipient). 
 *  Sets `res.locals.friendship` to the found friendship.
 **/
async function ensureFriendRelationship(req, res, next) {
  try {
    const friendshipId = Number(req.params.friendId);
    const currentUserId = res.locals.user.id;

    const friendship = await Friend.getById(friendshipId);
    if (!friendship) {
      throw new NotFoundError(`No friend request found with id: ${friendshipId}`);
    }

    if (
      friendship.senderId !== currentUserId &&
      friendship.recipientId !== currentUserId
    ) {
      throw new UnauthorizedError(
        "You do not have permission to modify this friend request."
      );
    }

    res.locals.friendship = friendship;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {ensureFriendRelationship};