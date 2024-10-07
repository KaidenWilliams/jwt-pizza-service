const request = require("supertest");
const app = require("../service.js");
const { DB, Role } = require("../database/database.js");

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
  const res = await request(app).put("/api/auth").send(user);
  return res;
}

async function logoutUser(authToken) {
  const res = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${authToken}`)
    .send();
  return res;
}

function putTokenInBearer(authToken) {
  return `Bearer ${authToken}`;
}

let ADMIN_USER;
let DINER_USER;

beforeAll(async () => {
  await DB.initializeDatabase();

  ADMIN_USER = await createUser(Role.Admin);
  DINER_USER = await createUser(Role.Diner);
});

test("get franchises should list no franchises if none are added", async () => {
  const response = await request(app).get("/api/franchise");
  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(0);
});

test("get user franchises should list no franchises if none are added", async () => {
  const myTestUser = await request(app).put("/api/auth").send(ADMIN_USER);
  const myTestUserId = myTestUser.body.user.id;
  const myTestUserToken = myTestUser.body.token;

  const response = await request(app)
    .get(`/api/franchise/${myTestUserId}`)
    .set("Authorization", putTokenInBearer(myTestUserToken));

  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(0);

  await logoutUser(myTestUserToken);
});

test("post should create a new franchise if user is admin", async () => {
  // method: 'POST',
  // path: '/api/franchise',
  // requiresAuth: true,
  // description: 'Create a new franchise',
  // example: `curl -X POST localhost:3000/api/franchise -H 'Content-Type: application/json' -H
  // 'Authorization: Bearer tttttt' -d '{"name": "pizzaPocket", "admins": [{"email": "f@jwt.com"}]}'`,

  // const franchise = {"name": "testFranchise", "admins": [{"email": ""}] }
  // await request(app).post("/api/franchise").set("Authorization", `Bearer ${testUserAuthToken}`).send()

  const adminUser = await createAdminUser();
  const res = await request(app).put("/api/auth").send(adminUser);
  const loginToken = res.body.token;

  await request(app)
    .post("/api/franchise")
    .set("Authorization", testUserAuthToken)
    .send();
});

// test("DELETE /api/franchise/:franchiseId should delete a franchise (admin only)", async () => {
//   const response = await request(app)
//     .delete(`/api/franchise/${testFranchiseId}`)
//     .set("Authorization", `Bearer ${adminUserAuthToken}`);
//   expect(response.status).toBe(200);
//   expect(response.body.message).toBe("franchise deleted");
// });

// test("DELETE /api/franchise/:franchiseId should fail for non-admin users", async () => {
//   const response = await request(app)
//     .delete(`/api/franchise/${testFranchiseId}`)
//     .set("Authorization", `Bearer ${testUserAuthToken}`);
//   expect(response.status).toBe(403);
// });

// test("POST /api/franchise/:franchiseId/store should create a new store", async () => {
//   // First, create a new franchise for testing
//   const franchiseData = {
//     name: "TestFranchise",
//     admins: [{ email: testUser.email }],
//   };
//   const franchiseResponse = await request(app)
//     .post("/api/franchise")
//     .set("Authorization", `Bearer ${adminUserAuthToken}`)
//     .send(franchiseData);
//   testFranchiseId = franchiseResponse.body.id;

//   const storeData = { name: "TestStore" };
//   const response = await request(app)
//     .post(`/api/franchise/${testFranchiseId}/store`)
//     .set("Authorization", `Bearer ${testUserAuthToken}`)
//     .send(storeData);
//   expect(response.status).toBe(200);
//   expect(response.body).toHaveProperty("id");
//   testStoreId = response.body.id;
// });

// test("DELETE /api/franchise/:franchiseId/store/:storeId should delete a store", async () => {
//   const response = await request(app)
//     .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
//     .set("Authorization", `Bearer ${testUserAuthToken}`);
//   expect(response.status).toBe(200);
//   expect(response.body.message).toBe("store deleted");
// });

// test("DELETE /api/franchise/:franchiseId/store/:storeId should fail for non-franchise admins", async () => {
//   const nonAdminUser = {
//     name: "non-admin",
//     email: randomEmail(),
//     password: "pass",
//   };
//   const nonAdminRegisterRes = await request(app)
//     .post("/api/auth")
//     .send(nonAdminUser);
//   const nonAdminToken = nonAdminRegisterRes.body.token;

//   const response = await request(app)
//     .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
//     .set("Authorization", `Bearer ${nonAdminToken}`);
//   expect(response.status).toBe(403);
// });
