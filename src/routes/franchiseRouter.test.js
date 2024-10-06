const request = require("supertest");
const app = require("../service.js");
const { DB, Role } = require("../database/database.js");

let testUser,
  testUserId,
  testUserAuthToken,
  adminUser,
  adminUserId,
  adminUserAuthToken,
  testFranchiseId,
  testStoreId;

const randomEmail = () =>
  Math.random().toString(36).substring(2, 12) + "@test.com";

beforeAll(async () => {
  await DB.initializeDatabase();

  // Create a regular user
  testUser = {
    name: "pizza franchisee",
    email: randomEmail(),
    password: "testpass",
  };
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserId = registerRes.body.user.id;
  testUserAuthToken = registerRes.body.token;

  // Create an admin user
  adminUser = {
    name: "admin user",
    email: randomEmail(),
    password: "adminpass",
    roles: [{ role: "admin" }],
  };
  const adminRegisterRes = await request(app).post("/api/auth").send(adminUser);
  adminUserId = adminRegisterRes.body.user.id;
  adminUserAuthToken = adminRegisterRes.body.token;
});

test("GET /api/franchise should list all franchises", async () => {
  const response = await request(app).get("/api/franchise");
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});

test("GET /api/franchise/:userId should list user's franchises", async () => {
  const response = await request(app)
    .get(`/api/franchise/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});

test("POST /api/franchise should create a new franchise (admin only)", async () => {
  const franchiseData = {
    name: "TestFranchise",
    admins: [{ email: testUser.email }],
  };
  const response = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(franchiseData);
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("id");
  testFranchiseId = response.body.id;
});

test("POST /api/franchise should fail for non-admin users", async () => {
  const franchiseData = {
    name: "TestFranchise",
    admins: [{ email: testUser.email }],
  };
  const response = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(franchiseData);
  expect(response.status).toBe(403);
});

test("DELETE /api/franchise/:franchiseId should delete a franchise (admin only)", async () => {
  const response = await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  expect(response.status).toBe(200);
  expect(response.body.message).toBe("franchise deleted");
});

test("DELETE /api/franchise/:franchiseId should fail for non-admin users", async () => {
  const response = await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(response.status).toBe(403);
});

test("POST /api/franchise/:franchiseId/store should create a new store", async () => {
  // First, create a new franchise for testing
  const franchiseData = {
    name: "TestFranchise",
    admins: [{ email: testUser.email }],
  };
  const franchiseResponse = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(franchiseData);
  testFranchiseId = franchiseResponse.body.id;

  const storeData = { name: "TestStore" };
  const response = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(storeData);
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("id");
  testStoreId = response.body.id;
});

test("DELETE /api/franchise/:franchiseId/store/:storeId should delete a store", async () => {
  const response = await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(response.status).toBe(200);
  expect(response.body.message).toBe("store deleted");
});

test("DELETE /api/franchise/:franchiseId/store/:storeId should fail for non-franchise admins", async () => {
  const nonAdminUser = {
    name: "non-admin",
    email: randomEmail(),
    password: "pass",
  };
  const nonAdminRegisterRes = await request(app)
    .post("/api/auth")
    .send(nonAdminUser);
  const nonAdminToken = nonAdminRegisterRes.body.token;

  const response = await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
    .set("Authorization", `Bearer ${nonAdminToken}`);
  expect(response.status).toBe(403);
});
