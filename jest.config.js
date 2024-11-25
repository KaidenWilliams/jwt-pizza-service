module.exports = {
  collectCoverage: true,
  coverageReporters: ["json-summary", "text"],
  testTimeout: 1200000,
  testEnvironment: "node",

  // Local Testing stuff to Use Docker Container, probably should put in CI script but I am lazy

  // setupFiles: ["./jest.setup.js"],
  // globalSetup: "./jestGlobalSetup.js",
  // globalTeardown: "./jestGlobalTeardown.js",
};
