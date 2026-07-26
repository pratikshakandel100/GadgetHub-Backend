/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*.test.ts"],
  testTimeout: 30000,
  maxWorkers: 1,
  setupFiles: ["<rootDir>/tests/integration/setup/env.js"],
  moduleNameMapper: {
    "^meilisearch$": "<rootDir>/tests/integration/stubs/meilisearch.js",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
};
