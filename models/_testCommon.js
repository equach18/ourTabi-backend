"use strict";

const bcrypt = require("bcryptjs");
const db = require("../db.js");
const { BCRYPT_WORK_FACTOR } = require("../config");

let testUserIds = [];
let testTripIds = [];
let testActivityIds = [];

async function commonBeforeAll() {
  await db.query("TRUNCATE users RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE friend RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE trip RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE activity RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE vote RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE comment RESTART IDENTITY CASCADE");
  await db.query("TRUNCATE trip_member RESTART IDENTITY CASCADE");

  // add users
  const userResults = await db.query(
    `
    INSERT INTO users  (username, password, first_name, last_name, email, profile_pic, bio, is_admin)
    VALUES 
      ('u1', $1, 'U1F', 'U1L', 'u1@email.com', NULL, 'Bio of U1', false),
      ('u2', $2, 'U2F', 'U2L', 'u2@email.com', NULL, 'Bio of U2', false),
      ('admin', $3, 'Admin', 'User', 'admin@email.com', NULL, 'Admin Bio', true)
    RETURNING id, username
    `,
    [
      await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
      await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
      await bcrypt.hash("adminpass", BCRYPT_WORK_FACTOR),
    ]
  );
  testUserIds.push(...userResults.rows.map((r) => r.id));

  // add trips
  const tripResults = await db.query(
    `
    INSERT INTO trip (title, destination, radius, start_date, end_date, is_private, creator_id)
    VALUES 
      ('Trip 1', 'New York', 10, '2025-06-01', '2025-06-07', false, $1),
      ('Trip 2', 'Los Angeles', 20, '2025-07-10', '2025-07-15', true, $2)
    RETURNING id, title
    `,
    [testUserIds[0], testUserIds[1]]
  );
  testTripIds.push(...tripResults.rows.map((r) => r.id));

  // add activities
  const activityResults = await db.query(
    `
    INSERT INTO activity (trip_id, name, category, description, location, scheduled_time, created_by)
    VALUES 
      ($1, 'Central Park Tour', 'outdoors', 'A walk in the park', 'New York, NY', '2025-06-02 10:00', $2)
    RETURNING id, name
    `,
    [testTripIds[0], testUserIds[0]]
  );
  testActivityIds.push(...activityResults.rows.map((r) => r.id));
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testUserIds,
  testTripIds,
  testActivityIds,
};
