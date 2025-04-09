const jwt = require("jsonwebtoken");
const { createToken } = require("./tokens");
const { SECRET_KEY } = require("../config");

describe("createToken", function () {
  test("works: valid user (non-admin) token", function () {
    const token = createToken({ id: 88, username: "testUser", isAdmin: false });
    const payload = jwt.verify(token, SECRET_KEY);
    expect(payload).toEqual({
      id: 88,
      username: "testUser",
      isAdmin: false,
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
  });
  test("works: valid user (admin) token", function () {
    const token = createToken({ id: 45, username: "testUser2", isAdmin: true });
    const payload = jwt.verify(token, SECRET_KEY);
    expect(payload).toEqual({
      id: 45,
      username: "testUser2",
      isAdmin: true,
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
  });

  test("throws error if missing id", function () {
    expect(() => createToken({ username: "testuser" })).toThrowError(
      "createToken: user object must have 'id', 'username', and 'isAdmin' as boolean"
    );
  });

  test("throws error if missing username", function () {
    expect(() => createToken({ id: 123 })).toThrowError(
      "createToken: user object must have 'id', 'username', and 'isAdmin' as boolean"
    );
  });
  test("throws error if isAdmin is not a boolean", function () {
    expect(() =>
      createToken({ id: 346, username: "badUser", isAdmin: "yes" })
    ).toThrowError(
      "createToken: user object must have 'id', 'username', and 'isAdmin' as boolean"
    );
  });
});
