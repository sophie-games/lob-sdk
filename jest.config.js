module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  setupFiles: [
    "<rootDir>/src/game-data-manager/register-all-scenario-catalogs.ts",
  ],
  moduleNameMapper: {
    "^@lob-sdk/(.*)$": "<rootDir>/src/$1",
  },
};
