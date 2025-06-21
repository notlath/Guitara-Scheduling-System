export default {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  moduleFileExtensions: ["js", "jsx"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.(js|jsx)",
    "<rootDir>/src/**/?(*.)(test|spec).(js|jsx)",
  ],
  collectCoverageFrom: [
    "src/**/*.(js|jsx)",
    "!src/main.jsx",
    "!src/setupTests.js",
  ],
  verbose: true,
  globals: {
    jest: true,
  },
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
};
