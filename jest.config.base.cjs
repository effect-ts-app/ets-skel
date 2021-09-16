const { pathsToModuleNameMapper } = require("ts-jest/utils")

module.exports = (tsconfigPath, mapSrcTo = "/dist") => { 
  const tsconfig = require("require-json5")(tsconfigPath)

  const { compilerOptions } = tsconfig

  const SRC = process.env.TEST_SRC || process.env.GITHUB_ACTIONS

  const modules = tsconfig.compilerOptions?.paths ? pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/",
  }) : undefined

  const moduleNameMapper = modules && (SRC ?  Object.entries(
    modules
  ).reduce((prev, [key, value]) => {
    prev[key] = value.replace("/src", mapSrcTo)
    return prev
  }, {}) : modules)

  return {
    cacheDirectory: "./.jest-cache",
    globals: {
      "ts-jest": {
        diagnostics: false,
        useESM: true,
        tsconfig: {
          noEmit: true,
        },
      },
    },
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper,
    setupFiles: [__dirname + "/jest.polyfill"],
    testRegex: SRC ? "(/__tests__/.*|(\\.|/)(test|spec))\\.jsx?$" : "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
    // resolve .mjs
    //resolver: "./export_maps_resolver.cjs",
//    preset: "ts-jest", // ts-jest/presets/js-with-babel-esm
    transform: {
      // The esbuild transformer makes changes not come up immediately in wallaby
      "\\.[jt]sx?$": "esbuild-runner/jest",
    },
    watchPathIgnorePatterns: [".tsbuildinfo", ".jest-cache"],
  }
}