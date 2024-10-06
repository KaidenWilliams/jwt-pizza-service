jest.mock("./src/config", () => {
  // Gets the actual config, not the mocked one, to avoid recursion.
  const originalConfig = jest.requireActual("./src/config");

  const TEST_DB_HOST = "localhost";
  const TEST_DB_USER = "dockerTestUser";
  const TEST_DB_PASSWORD = "dockerTestPassword";
  const TEST_DB_NAME = "pizza";

  const mockConfig = {
    ...originalConfig,
    db: {
      ...originalConfig.db,
      connection: {
        ...originalConfig.db.connection,
        host: TEST_DB_HOST,
        user: TEST_DB_USER,
        password: TEST_DB_PASSWORD,
        database: TEST_DB_NAME,
      },
    },
  };

  return mockConfig;
});
