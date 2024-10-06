const request = require("supertest");
const app = require("../service.js");
const { DB } = require("../database/database.js");

beforeall(async () => {
  await DB.initializeDatabase();
});

test("test test", () => {
  expect(true).toBe(true);
});
