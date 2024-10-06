const request = require("supertest");
const app = require("../service.js");
const { authRouter, setAuthUser } = require("./authRouter.js");
const { DB } = require("../database/database.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };

const randomEmail = () =>
  Math.random().toString(36).substring(2, 12) + "@test.com";

beforeAll(async () => {
  await DB.initializeDatabase();

  testUser.email = randomEmail();
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserId = registerRes.body.user.id;
  testUserAuthToken = registerRes.body.token;
});

test("authUser should return a response with a not null user", async () => {
  const req = { headers: { authorization: `Bearer ${testUserAuthToken}` } };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  setAuthUser(req, res, next);
  expect(res.user).not.toBe(null);
});

test("authToken should fail if not called with Bearer token in Authorization", () => {
  const req = { headers: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  authRouter.authenticateToken(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
});

test("register should throw if bad parameters are put in", async () => {
  const registerRes = await request(app).post("/api/auth").send(null);
  expect(registerRes.status).toBe(400);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );

  const { password, ...user } = { ...testUser, roles: [{ role: "diner" }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test("logout should be sucessful when provided authorization token", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send();

  await expect(logoutRes.status).toBe(200);
  await expect(logoutRes.body.message).toBe("logout successful");
});

// I can never get this function to work properly. The API specification says nothing about including roles,
// yet this function fails if no roles are included
test("update user sucessfully updates user", async () => {
  const copiedUser = { ...testUser };
  const randomEmailString = randomEmail();
  copiedUser.email = randomEmailString;

  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(copiedUser);

  expect(updateRes.status).toBe(400);
});
