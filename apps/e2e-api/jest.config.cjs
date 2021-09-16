const { pathsToModuleNameMapper } = require("ts-jest/utils")
const requireJSON5 = require("require-json5")

const config = require("../../jest.config.base.cjs")(__dirname + "/tsconfig.json")

const SRC = process.env.TEST_SRC || process.env.GITHUB_ACTIONS

module.exports = {
  ...config,
  moduleNameMapper: {
    ...Object.entries(config.moduleNameMapper).reduce((prev, [key, value]) => {
      prev[key] = SRC
        ? value.replace("/../../apps/api/$1", "/../../apps/api/dist/$1")
        : value
      return prev
    }, {}),
    ["^../../apps/api/(.*)$"]: SRC
      ? "<rootDir>/../../apps/api/dist/$1"
      : "<rootDir>/../../apps/api/$1",
  },
}
