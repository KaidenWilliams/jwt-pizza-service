module.exports = async () => {
  //Define how to Connect to new Docker Container Database
  const TEST_DB_HOST = "localhost";
  const TEST_DB_USER = "dockerTestUser";
  const TEST_DB_PASSWORD = "dockerTestPassword";
  const TEST_DB_NAME = "pizza";

  const DOCKER_CONTAINER_NAME = "test-mysql-db";

  // Set up Docker Container
  const Docker = require("dockerode");
  const docker = new Docker();

  // Find Containers, if for some reason container was not deleted (Because tests weren't allowed to complete), delete it
  try {
    const options = {
      limit: 1,
      filters: `{"name": ["${DOCKER_CONTAINER_NAME}"]}`,
    };

    var existingContainer = await docker.listContainers(options);
    existingContainer = existingContainer[0];

    const containerInstance = docker.getContainer(existingContainer.Id);
    await containerInstance.inspect();
    await containerInstance.stop();
    await containerInstance.remove();
  } catch {
    console.log("Docker Container did not exist as expected");
  }

  // Create Docker Container
  console.log("Setting Up Docker Container");

  const container = await docker.createContainer({
    Image: "mysql:latest",
    name: DOCKER_CONTAINER_NAME,
    Env: [
      `MYSQL_ROOT_PASSWORD=${TEST_DB_PASSWORD}`,
      `MYSQL_DATABASE=${TEST_DB_NAME}`,
      `MYSQL_USER=${TEST_DB_USER}`,
      `MYSQL_PASSWORD=${TEST_DB_PASSWORD}`,
    ],
    ExposedPorts: {
      "3306/tcp": {},
    },
    HostConfig: {
      PortBindings: {
        "3306/tcp": [{ HostPort: "3306" }],
      },
    },
  });

  await container.start();
  global.__MYSQL_CONTAINER__ = container;

  // Ensure MySQL is ready to recieve connections
  console.log("Waiting for MySQL to be ready");
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const makeSureMySQLIsReady = async (maxAttempts = 30) => {
    const mysql = require("mysql2/promise");
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const connection = await mysql.createConnection({
          host: TEST_DB_HOST,
          user: TEST_DB_USER,
          password: TEST_DB_PASSWORD,
          database: TEST_DB_NAME,
        });
        await connection.end();
        return;
      } catch {
        // Wait 1 second
        await delay(1000);
      }
    }
    throw new Error("MySQL did not become ready in time.");
  };

  await makeSureMySQLIsReady();
  console.log("Setup Completed");
};
