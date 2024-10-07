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
  const loginRes = await request(app).put("/api/auth").send(user);

  return loginRes;
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
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserId = myTestUser.body.user.id;
  const myTestUserToken = myTestUser.body.token;

  const response = await request(app)
    .get(`/api/franchise/${myTestUserId}`)
    .set("Authorization", putTokenInBearer(myTestUserToken));

  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(0);

  await logoutUser(myTestUserToken);
});

test("get user franchises should list no franchises if user is not Admin and incorrect id given", async () => {
  const myTestUser = await loginUser(DINER_USER);
  const myTestUserId = myTestUser.body.user.id + "1";
  const myTestUserToken = myTestUser.body.token;

  const response = await request(app)
    .get(`/api/franchise/${myTestUserId}`)
    .set("Authorization", putTokenInBearer(myTestUserToken));

  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(0);

  await logoutUser(myTestUserToken);
});

test("post should create a new franchise if user is admin", async () => {
  //Arrange
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  //Act
  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  //Assert
  expect(newFranchiseRequest.status).toBe(200);
  expect(newFranchiseRequest.body.name).toBe(myFranchise.name);
  expect(
    newFranchiseRequest.body.admins.some((x) => x.email == myTestUserEmail)
  ).toBe(true);

  //Cleanup
  await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserToken));

  await logoutUser(myTestUserToken);
});

test("post should throw if user is not admin", async () => {
  //Arrange
  const myTestUser = await loginUser(DINER_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  //Act
  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  //Assert
  expect(newFranchiseRequest.status).toBe(403);

  // Cleanup
  await logoutUser(myTestUserToken);
});

test("delete franchise should succesfully delete with an Admin User", async () => {
  //Arrange
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  //Act
  const deleteFranchiseRequest = await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserToken));

  //Assert
  expect(deleteFranchiseRequest.status).toBe(200);

  //Cleanup
  await logoutUser(myTestUserToken);
});

test("delete franchise should fail with a Non Admin User", async () => {
  //Arrange
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  await logoutUser(myTestUserToken);

  const myTestUserBad = await loginUser(DINER_USER);
  const myTestUserTokenBad = myTestUserBad.body.token;

  //Act
  const deleteFranchiseRequest = await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserTokenBad));

  //Assert
  expect(deleteFranchiseRequest.status).toBe(403);

  //Cleanup
  await logoutUser(myTestUserTokenBad);

  const myTestUserGood = await loginUser(ADMIN_USER);
  const myTestUserTokenGood = myTestUserGood.body.token;

  await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserTokenGood));

  await logoutUser(myTestUserTokenGood);
});

test("create store should succesfully create", async () => {
  //Arrange
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  const newStore = {
    franchiseId: newFranchiseRequest.body.id,
    name: "testFranchise",
  };

  //Act
  const newStoreRequest = await request(app)
    .post(`/api/franchise/${newFranchiseRequest.body.id}/store`)
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(newStore);

  //Assert
  expect(newStoreRequest.status).toBe(200);
  expect(newStoreRequest.body.franchiseId).toBe(newStore.franchiseId);
  expect(newStoreRequest.body.name).toBe(newStore.name);

  //Cleanup
  await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserToken));

  await request(app)
    .delete(
      `/api/franchise/${newStoreRequest.body.franchiseId}/store/:${newStoreRequest.body.id}`
    )
    .set("Authorization", putTokenInBearer(myTestUserToken));

  await logoutUser(myTestUserToken);
});

test("create store should not succesfully create if Non-Admin User", async () => {
  //Arrange
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  const newStore = {
    franchiseId: newFranchiseRequest.body.id,
    name: "testFranchise",
  };

  await logoutUser(myTestUserToken);

  const myTestUserBad = await loginUser(DINER_USER);
  const myTestUserTokenBad = myTestUserBad.body.token;

  //Act
  const newStoreRequest = await request(app)
    .post(`/api/franchise/${newFranchiseRequest.body.id}/store`)
    .set("Authorization", putTokenInBearer(myTestUserTokenBad))
    .send(newStore);

  //Assert
  expect(newStoreRequest.status).toBe(403);

  //Cleanup

  await logoutUser(myTestUserTokenBad);

  const myTestUserGood = await loginUser(ADMIN_USER);
  const myTestUserTokenGood = myTestUserGood.body.token;

  await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserTokenGood));

  await logoutUser(myTestUserTokenGood);
});

test("delete store should succesfully delete", async () => {
  //Arrange
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  const newStore = {
    franchiseId: newFranchiseRequest.body.id,
    name: "testFranchise",
  };

  const newStoreRequest = await request(app)
    .post(`/api/franchise/${newFranchiseRequest.body.id}/store`)
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(newStore);

  //Act
  const storeDeleteRequest = await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserToken));

  //Assert
  expect(storeDeleteRequest.status).toBe(200);

  //Cleanup
  await request(app)
    .delete(
      `/api/franchise/${newStoreRequest.body.franchiseId}/store/:${newStoreRequest.body.id}`
    )
    .set("Authorization", putTokenInBearer(myTestUserToken));

  await logoutUser(myTestUserToken);
});

test("delete store should not succesfully delete if Non-Admin User", async () => {
  //Arrange
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserEmail = myTestUser.body.user.email;
  const myTestUserToken = myTestUser.body.token;

  const myFranchise = {
    name: "testFranchise",
    admins: [{ email: myTestUserEmail }],
  };

  const newFranchiseRequest = await request(app)
    .post("/api/franchise")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(myFranchise);

  const newStore = {
    franchiseId: newFranchiseRequest.body.id,
    name: "testFranchise",
  };

  const newStoreRequest = await request(app)
    .post(`/api/franchise/${newFranchiseRequest.body.id}/store`)
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(newStore);

  await logoutUser(myTestUserToken);

  const myTestUserBad = await loginUser(DINER_USER);
  const myTestUserTokenBad = myTestUserBad.body.token;

  //Act
  const storeDeleteRequest = await request(app)
    .delete(
      `/api/franchise/${newStoreRequest.body.franchiseId}/store/:${newStoreRequest.body.id}`
    )
    .set("Authorization", putTokenInBearer(myTestUserTokenBad));

  //Assert
  expect(storeDeleteRequest.status).toBe(403);
  expect(storeDeleteRequest.body.message).toBe("unable to delete a store");

  //Cleanup

  await logoutUser(myTestUserTokenBad);

  const myTestUserGood = await loginUser(ADMIN_USER);
  const myTestUserTokenGood = myTestUserGood.body.token;

  await request(app)
    .delete(`/api/franchise/${newFranchiseRequest.body.id}`)
    .set("Authorization", putTokenInBearer(myTestUserTokenGood));

  await request(app)
    .delete(
      `/api/franchise/${newStoreRequest.body.franchiseId}/store/:${newStoreRequest.body.id}`
    )
    .set("Authorization", putTokenInBearer(myTestUserTokenGood));

  await logoutUser(myTestUserTokenGood);
});
