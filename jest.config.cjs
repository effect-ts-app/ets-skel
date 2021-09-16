module.exports = {
  cacheDirectory: "./.jest-cache",
  projects: ["<rootDir>/apps/api", "<rootDir>/apps/frontend", "<rootDir>/packages/*"].concat(process.env.TEST_ALL ? ["<rootDir>/apps/e2e-api"] : [])
}
