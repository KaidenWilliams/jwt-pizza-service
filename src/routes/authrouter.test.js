const request = require("supertest");
const app = require("../service");
const { authRouter, setAuthUser } = require("./authRouter.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test("authUser should return a response with a not null user", () => {
  const req = { headers: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  jest.mock("../database/database.js", () => ({
    DB: { isLoggedIn: jest.fn().mockResolvedValue(true) },
  }));

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

test("login", async () => {
  const loginRes = await loginUser();
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );

  const { password, ...user } = { ...testUser, roles: [{ role: "diner" }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test("logout should be sucessful when provided authorization token", async () => {
  const loginRes = await loginUser();
  const authToken = loginRes.body.token;

  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${authToken}`)
    .send();

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe("logout successful");
});

test("");

// Helper Functions
async function loginUser() {
  return await request(app).put("/api/auth").send(testUser);
}
