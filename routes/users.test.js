"use strict";

const request = require("supertest");
const db = require("../db.js");
const app = require("../app.js");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getU1Token,
  getU2Token,
  getAdminToken,
} = require("./_usersTestCommons.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("works for admins: create admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        password: "password-new",
        email: "new@email.com",
        isAdmin: true,
      })
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-new",
        email: "new@email.com",
        isAdmin: true,
      },
      token: expect.any(String),
    });
  });

  test("works for admins: create non-admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new2",
        firstName: "First-new2",
        lastName: "Last-new2",
        password: "password-new2",
        email: "new2@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "u-new2",
        firstName: "First-new2",
        lastName: "Last-new2",
        email: "new2@email.com",
        isAdmin: false,
      },
      token: expect.any(String),
    });
  });

  test("fails for non-admin users", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "hacker",
        firstName: "Not",
        lastName: "Allowed",
        password: "badpassword",
        email: "hacker@example.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(401);
  });
  test("fails for anonymous users", async function () {
    const resp = await request(app).post("/users").send({
      username: "guest",
      firstName: "Guest",
      lastName: "User",
      password: "guestpass",
      email: "guest@example.com",
      isAdmin: false,
    });

    expect(resp.statusCode).toEqual(401);
  });
  test("fails with bad request if missing required fields", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "incomplete",
      })
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(400);
  });
  test("fails with bad request if username is too short", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "a",
        firstName: "Short",
        lastName: "Name",
        password: "password123",
        email: "shortname@example.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("works for admin: can get any user", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        bio: null,
        profilePic: null,
        trips: expect.any(Array),
        friends: [
          {
            friendId: expect.any(Number),
            userId: expect.any(Number),
            username: "u2",
            firstName: "U2F",
            lastName: "U2L",
            email: "user2@user.com",
            profilePic: null,
          },
        ],
        incomingRequests: [],
        sentRequests: [],
      },
    });
  });

  test("works for same user: can get their own information", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        bio: null,
        profilePic: null,
        trips: expect.any(Array),
        friends: expect.any(Array),
        incomingRequests: expect.any(Array),
        sentRequests: expect.any(Array),
      },
    });
  });

  test("fails for non-admin and not of same user: cannot access user (401 Unauthorized)", async function () {
    const resp = await request(app)
      .get(`/users/admin`)
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "You do not have permission to access this page.",
        status: 401,
      },
    });
  });

  test("fails for anonymous users: cannot access profile (401 Unauthorized)", async function () {
    const resp = await request(app).get(`/users/u1`);

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "You do not have permission to access this page.",
        status: 401,
      },
    });
  });

  test("fails for non-existent user (404 Not Found)", async function () {
    const resp = await request(app)
      .get(`/users/nope`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No user found: nope",
        status: 404,
      },
    });
  });
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", function () {
  test("works for admin: can update any user", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: "Updated" })
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "u1",
        firstName: "Updated",
        lastName: "U1L",
        email: "user1@user.com",
        bio: null,
        profilePic: null,
      },
    });
  });

  test("works for same user: can update their own profile", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ lastName: "Updated" })
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        id: expect.any(Number),
        username: "u1",
        firstName: "U1F",
        lastName: "Updated",
        email: "user1@user.com",
        bio: null,
        profilePic: null,
      },
    });
  });

  test("fails for non-admin users updating others", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: "Hacker" })
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "You do not have permission to access this page.",
        status: 401,
      },
    });
  });

  test("fails with 401 if unauthenticated", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: "Anonymous" });

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "You do not have permission to access this page.",
        status: 401,
      },
    });
  });

  test("fails with 404 if user does not exist", async function () {
    const resp = await request(app)
      .patch(`/users/nope`)
      .send({ firstName: "DoesNotExist" })
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No user: nope",
        status: 404,
      },
    });
  });

  test("fails with 400 if invalid data is provided", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({ firstName: 42 }) // Invalid type
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for admin: can delete any user", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: "u1" });

    // Verify user was deleted from the database
    const userRes = await db.query("SELECT * FROM users WHERE username = 'u1'");
    expect(userRes.rows.length).toEqual(0);
  });

  test("works for same user: can delete own account", async function () {
    const resp = await request(app)
      .delete(`/users/u2`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ deleted: "u2" });

    // Verify user was deleted from the database
    const userRes = await db.query("SELECT * FROM users WHERE username = 'u2'");
    expect(userRes.rows.length).toEqual(0);
  });

  test("fails for non-admin user trying to delete another user", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${getU2Token()}`);

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "You do not have permission to access this page.",
        status: 401,
      },
    });
  });

  test("fails for anonymous user (401 Unauthorized)", async function () {
    const resp = await request(app).delete(`/users/u1`);

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "You do not have permission to access this page.",
        status: 401,
      },
    });
  });

  test("fails for non-existent user (404 Not Found)", async function () {
    const resp = await request(app)
      .delete(`/users/nope`)
      .set("authorization", `Bearer ${getAdminToken()}`);

    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: { message: "No user: nope", status: 404 },
    });
  });
});

/************************************** GET /users/ */

describe("GET /users/", function () {
  test("works for logged-in users: can search for users", async function () {
    const resp = await request(app)
      .get("/users?query=u")
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      users: expect.arrayContaining([
        {
          id: expect.any(Number),
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          profilePic: null,
          email: "user1@user.com"
        },
        {
          id: expect.any(Number),
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          profilePic: null,
          email: "user2@user.com"
        },
      ]),
    });
  });

  test("fails with bad request if query is missing", async function () {
    const resp = await request(app)
      .get("/users")
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      error: { message: "Search query is required.", status: 400 },
    });
  });

  test("returns empty array if no users match", async function () {
    const resp = await request(app)
      .get("/users?query=nonexistent")
      .set("authorization", `Bearer ${getU1Token()}`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      users: [],
    });
  });

  test("fails for anonymous users (401 Unauthorized)", async function () {
    const resp = await request(app).get("/users?query=u");

    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: { message: "You must be logged in.", status: 401 },
    });
  });
});
