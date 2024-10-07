const request = require("supertest");
const app = require("../service.js");
const { DB, Role } = require("../database/database.js");
const exp = require("constants");

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

test("Get Pizza Menu will return nothing when no pizzas are added", async () => {
  const getPizzaRequest = await request(app).get("/api/order/menu");
  expect(getPizzaRequest.status).toBe(200);
  expect(Array.isArray(getPizzaRequest.body)).toBe(true);
});

test("Put add Menu Item will be succesful for admin user", async () => {
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserToken = myTestUser.body.token;

  const addMenuItem = {
    title: "Test1",
    description: "Lettuce",
    image: "pizza1.png",
    price: 99.99,
  };

  const addMenuItemResponse = await request(app)
    .put("/api/order/menu")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(addMenuItem);

  expect(addMenuItemResponse.status).toBe(200);
  expect(
    addMenuItemResponse.body.some(
      (pizza) =>
        pizza.title === addMenuItem.title &&
        pizza.description === addMenuItem.description &&
        pizza.image === addMenuItem.image &&
        pizza.price === addMenuItem.price
    )
  ).toBe(true);

  await logoutUser(myTestUserToken);
});

test("Put add Menu Item will not succesful for regular user", async () => {
  const myTestUser = await loginUser(DINER_USER);
  const myTestUserToken = myTestUser.body.token;

  const addMenuItem = {
    title: "Test1",
    description: "Lettuce",
    image: "pizza1.png",
    price: 99.99,
  };

  const addMenuItemResponse = await request(app)
    .put("/api/order/menu")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(addMenuItem);

  expect(addMenuItemResponse.status).toBe(403);

  await logoutUser(myTestUserToken);
});

test("Get orders does what it should blah blah blah", async () => {
  const myTestUser = await loginUser(DINER_USER);
  const myTestToken = myTestUser.body.token;

  const getOrderRequest = await request(app)
    .get("/api/order")
    .set("Authorization", putTokenInBearer(myTestToken));

  expect(getOrderRequest.status).toBe(200);
  expect(Array.isArray(getOrderRequest.body.orders)).toBe(true);
  expect(getOrderRequest.body.page).toEqual(expect.any(Number));
  expect(getOrderRequest.body.dinerId).toEqual(expect.any(Number));

  await logoutUser(myTestToken);
});

test("Create orders should return order with mocked fetch", async () => {
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserToken = myTestUser.body.token;

  const order = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: 1, description: "Lettuce", price: 99.99 }],
  };

  const mockResponse = {
    jwt: "mockJwtToken",
    reportUrl: "http://mockurl.com/report",
  };

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(mockResponse),
  });

  const addMenuItemResponse = await request(app)
    .post("/api/order")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(order);

  expect(addMenuItemResponse.status).toBe(200);
  expect(addMenuItemResponse.body.order.items).toEqual(order.items);
  expect(addMenuItemResponse.body.order.franchiseId).toEqual(order.franchiseId);
  expect(addMenuItemResponse.body.order.storeId).toEqual(order.storeId);

  delete global.fetch;

  await logoutUser(myTestUserToken);
});

test("Create orders should return 500 if fetch is not ok", async () => {
  const myTestUser = await loginUser(ADMIN_USER);
  const myTestUserToken = myTestUser.body.token;

  const order = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: 1, description: "Lettuce", price: 99.99 }],
  };

  const mockResponse = {
    jwt: "mockJwtToken",
    reportUrl: "http://mockurl.com/report",
  };

  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: jest.fn().mockResolvedValue(mockResponse),
  });

  const addMenuItemResponse = await request(app)
    .post("/api/order")
    .set("Authorization", putTokenInBearer(myTestUserToken))
    .send(order);

  expect(addMenuItemResponse.status).toBe(500);

  delete global.fetch;

  await logoutUser(myTestUserToken);
});
