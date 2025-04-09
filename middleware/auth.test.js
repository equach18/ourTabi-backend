"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../helpers/expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureCorrectUserOrAdmin,
} = require("./auth");

const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign(
  { id: 22, username: "test", isAdmin: false },
  SECRET_KEY
);
const badJwt = jwt.sign({ id: 38, username: "test", isAdmin: false }, "wrong");

describe("authenticateJWT", function () {
  test("works: via header", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    const next = jest.fn();
    authenticateJWT(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.locals.user).toEqual({
      id: 22,
      iat: expect.any(Number),
      username: "test",
      isAdmin: false,
    });
  });

  test("works: no header", function () {
    expect.assertions(2);
    const req = {};
    const res = { locals: {} };
    const next = jest.fn();
    authenticateJWT(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    const next = jest.fn();
    authenticateJWT(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.locals).toEqual({});
  });
});

describe("ensureLoggedIn", function () {
  test("works", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = jest.fn();
    ensureLoggedIn(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test("unauth if no login", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = jest.fn();
    ensureLoggedIn(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});

describe("ensureAdmin", function () {
  test("works", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    const next = jest.fn();
    ensureAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test("unauth if not admin", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    const next = jest.fn();
    ensureAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  test("unauth if no user", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = jest.fn();
    ensureAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
describe("ensureCorrectUserOrAdmin", function () {
  test("works for admin, even though not the same user", function () {
    expect.assertions(1);
    const req = { params: { username: "user1" } };
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    const next = jest.fn();
    ensureCorrectUserOrAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test("Works: user is correct but not an admin", function () {
    const req = { params: { username: "user1" } };
    const res = { locals: { user: { username: "user1", isAdmin: false } } };
    const next = jest.fn();
    ensureCorrectUserOrAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test("unauth if not admin or correct user", function () {
    expect.assertions(1);
    const req = { params: { username: "user1" } };
    const res = { locals: { user: { username: "user2", isAdmin: false } } };
    const next = jest.fn();
    ensureCorrectUserOrAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  test("unauth if no user", function () {
    expect.assertions(1);
    const req = { params: { username: "user1" } };
    const res = { locals: {} };
    const next = jest.fn();
    ensureCorrectUserOrAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
