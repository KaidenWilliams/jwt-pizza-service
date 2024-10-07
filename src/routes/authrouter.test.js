const request = require("supertest");
const app = require("../service.js");
const { authRouter } = require("./authRouter.js");
const { DB, Role } = require("../database/database.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
let registerRes;

const randomEmail = () =>
  Math.random().toString(36).substring(2, 12) + "@test.com";

const randomName = () => Math.random().toString(36).substring(2, 12);

async function createUser(roleType) {
  let user = { password: "toomanysecrets", roles: [{ role: roleType }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  const userToSendToDB = JSON.parse(JSON.stringify(user));
  await DB.addUser(userToSendToDB);
  return user;
}

async function loginUser(user) {
  const loginRes = await request(app).put("/api/auth").send(user);

  return loginRes;
}

beforeAll(async () => {
  await DB.initializeDatabase();

  testUser.email = randomEmail();
  registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test("authUser should return a response with a not null user", async () => {
  const req = { headers: { authorization: `Bearer ${testUserAuthToken}` } };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  const { setAuthUser } = require("./authRouter.js");

  await setAuthUser(req, res, next);
  expect(res.user).not.toBe(null);
});

test("authUser should return null response with a null user", async () => {
  const req = {
    headers: { authorization: `Bearer ${testUserAuthToken}` },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();

  const mockIsLoggedIn = jest.fn();

  jest.mock("../database/database.js", () => ({
    DB: {
      isLoggedIn: mockIsLoggedIn,
    },
  }));

  mockIsLoggedIn.mockResolvedValueOnce(true);

  jest.doMock("../config.js", () => ({
    jwtSecret: "plsthrowerror",
  }));

  jest.resetModules();

  const { setAuthUser } = require("./authRouter.js");

  await setAuthUser(req, res, next);
  expect(req.user).toBe(null);

  jest.restoreAllMocks();
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

  const { password: _, ...user } = { ...testUser, roles: [{ role: "diner" }] }; // eslint-disable-line no-unused-vars
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

test("update user sucessfully updates user with correct id", async () => {
  const ADMIN_USER = await createUser(Role.Admin);
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserToken = myTestUser.body.token;
  const myTestUserId = myTestUser.body.user.id;

  const myTestUserEmail = randomEmail();
  const myTestUserPassword = ADMIN_USER.password + "hi";

  const updateRequest = {
    email: myTestUserEmail,
    password: myTestUserPassword,
  };

  const updateRes = await request(app)
    .put(`/api/auth/${myTestUserId}`)
    .set("Authorization", `Bearer ${myTestUserToken}`)
    .send(updateRequest);

  expect(updateRes.status).toBe(200);

  await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${myTestUserToken}`)
    .send();
});

test("update user does not succesfully updates user", async () => {
  const ADMIN_USER = await createUser(Role.Diner);
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserToken = myTestUser.body.token;
  const myTestUserId = myTestUser.body.user.id + "1";

  const myTestUserEmail = randomEmail();
  const myTestUserPassword = ADMIN_USER.password + "hi";

  const updateRequest = {
    email: myTestUserEmail,
    password: myTestUserPassword,
  };

  const updateRes = await request(app)
    .put(`/api/auth/${myTestUserId}`)
    .set("Authorization", `Bearer ${myTestUserToken}`)
    .send(updateRequest);

  expect(updateRes.status).toBe(403);

  await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${myTestUserToken}`)
    .send();
});
