"use strict";

const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../helpers/expressError");
const db = require("../db.js");
const User = require("./user.js");
const bcrypt = require("bcryptjs");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** register */

describe("register", function () {
  test("works: successfully registers new user", async function () {
    const newUser = await User.register({
      username: "newUser",
      firstName: "New",
      lastName: "User",
      email: "newuser@email.com",
      password: "password123",
      isAdmin: false,
    });

    expect(newUser).toEqual({
      id: expect.any(Number),
      username: "newUser",
      firstName: "New",
      lastName: "User",
      email: "newuser@email.com",
      isAdmin: false,
    });

    // Verify the user was inserted into the database
    const result = await db.query(
      "SELECT * FROM users WHERE username = 'newUser'"
    );
    expect(result.rows.length).toEqual(1);
    expect(result.rows[0].username).toEqual("newUser");

    // Verify password is hashed
    const isValid = await bcrypt.compare(
      "password123",
      result.rows[0].password
    );
    expect(isValid).toBe(true);
  });

  test("fails: duplicate username", async function () {
    await expect(
      User.register({
        username: "u1", // Username already exists from test seed data
        firstName: "Another",
        lastName: "User",
        email: "another@email.com",
        password: "password123",
        isAdmin: false,
      })
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: duplicate email", async function () {
    await expect(
      User.register({
        username: "uniqueUsername",
        firstName: "Another",
        lastName: "User",
        email: "u1@email.com", // Email already exists from test seed data
        password: "password123",
        isAdmin: false,
      })
    ).rejects.toThrow(BadRequestError);
  });

  test("fails: missing required fields", async function () {
    await expect(
      User.register({
        username: "incompleteUser",
        password: "password123",
      })
    ).rejects.toThrow(); // Should throw an error because required fields are missing
  });
});

/************************************** authenticate */

describe("authenticate", function () {
  test("works: valid credentials", async function () {
    const user = await User.authenticate("u1", "password1");
    expect(user).toEqual({
      id: expect.any(Number),
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
    });
  });

  test("unauth if no such user", async function () {
    await expect(User.authenticate("nope", "password")).rejects.toThrow(
      UnauthorizedError
    );
  });

  test("unauth if wrong password", async function () {
    await expect(User.authenticate("u1", "wrongpassword")).rejects.toThrow(
      UnauthorizedError
    );
  });
});

/************************************** get */

describe("get", function () {
  test("works: retrieve existing user", async function () {
    let user = await User.get("u1");
    expect(user).toEqual({
      id: expect.any(Number),
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
      bio: "Bio of U1",
      profilePic: null,
      trips: expect.any(Array),
      friends: [],
      incomingRequests: [],
      sentRequests: [],
    });
  });

  test("not found if user does not exist", async function () {
    await expect(User.get("nope")).rejects.toThrow(NotFoundError);
  });
});

/************************************** update */

describe("update", function () {
  test("works: update single field", async function () {
    let user = await User.update("u1", { firstName: "UpdatedF" });
    expect(user).toEqual({
      id: testUserIds[0],
      username: "u1",
      firstName: "UpdatedF",
      lastName: "U1L",
      email: "u1@email.com",
      bio: "Bio of U1",
      profilePic: null,
    });
  });

  test("works: update multiple fields", async function () {
    let user = await User.update("u1", {
      firstName: "NewFirst",
      lastName: "NewLast",
      bio: "Updated Bio",
      profilePic: "http://newimage.com/pic.jpg",
    });

    expect(user).toEqual({
      id: testUserIds[0],
      username: "u1",
      firstName: "NewFirst",
      lastName: "NewLast",
      email: "u1@email.com",
      bio: "Updated Bio",
      profilePic: "http://newimage.com/pic.jpg",
    });
  });

  test("not found if user does not exist", async function () {
    await expect(User.update("nope", { firstName: "test" })).rejects.toThrow(
      NotFoundError
    );
  });

  test("bad request if no data provided", async function () {
    await expect(User.update("u1", {})).rejects.toThrow(BadRequestError);
  });
});

/************************************** remove */

describe("remove", function () {
  test("works: delete user", async function () {
    await User.remove("u1");
    const res = await db.query("SELECT * FROM users WHERE username='u1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if user does not exist", async function () {
    await expect(User.remove("nope")).rejects.toThrow(NotFoundError);
  });
});

// /************************************** findAll */

// describe("findAll", function () {
//   test("works: retrieves all users", async function () {
//     const users = await User.findAll();

//     expect(users).toEqual(
//       expect.arrayContaining([
//         {
//           id: testUserIds[0],
//           username: "u1",
//           firstName: "U1F",
//           lastName: "U1L",
//           email: "u1@email.com",
//           isAdmin: false,
//         },
//         {
//           id: testUserIds[1],
//           username: "u2",
//           firstName: "U2F",
//           lastName: "U2L",
//           email: "u2@email.com",
//           isAdmin: false,
//         },
//         {
//           id: testUserIds[2],
//           username: "admin",
//           firstName: "Admin",
//           lastName: "User",
//           email: "admin@email.com",
//           isAdmin: true,
//         },
//       ])
//     );
//   });
// });

/************************************** searchUsers */

describe("searchUsers", function () {
  test("works: finds users by partial username match", async function () {
    const users = await User.searchUsers("u");

    expect(users).toEqual(
      expect.arrayContaining([
        {
          id: testUserIds[0],
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          profilePic: null,
          email: "u1@email.com"
        },
        {
          id: testUserIds[1],
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          profilePic: null,
          email: "u2@email.com"
        },
      ])
    );
  });

  test("works: finds specific user by exact username match", async function () {
    const users = await User.searchUsers("u1");

    expect(users).toEqual([
      {
        id: testUserIds[0],
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        profilePic: null,
        email: "u1@email.com"
      },
    ]);
  });

  test("returns empty array if no match", async function () {
    const users = await User.searchUsers("xyz123");
    expect(users).toEqual([]);
  });

  test("returns all users if empty query string provided", async function () {
    const users = await User.searchUsers("");
    expect(users.length).toBeGreaterThanOrEqual(3); // At least 3 users exist in seed data
  });
});
