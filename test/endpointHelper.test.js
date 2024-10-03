const { StatusCodeError } = require("../src/endpointHelper");

test("StatusCodeError Constructor because it shows up as untested", () => {
  const message = "We are habeen un serious problem";
  const statusCode = 666;

  const testErrorInstance = new StatusCodeError(message, statusCode);

  expect(testErrorInstance.message).toBe(message);
  expect(testErrorInstance.statusCode).toBe(statusCode);

  expect(testErrorInstance).toBeInstanceOf(Error);
});
