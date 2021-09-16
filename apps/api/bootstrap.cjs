// ESM
// require("esbuild-runner/register") // loads side-effecty files multiple times..
// require("ts-node/register")
require("@babel/register")({
  // Array of ignore conditions, either a regex or a function. (Optional)
  // File paths that match any condition are not compiled.
  ignore: [/node_modules\/(?!@ets-skel)/],
  extensions: [".ts"],
})

// General
require("source-map-support/register")
require("tsconfig-paths/register")
require("core-js/stable")
require("regenerator-runtime/runtime")
require("@effect-ts-app/fluent/polyfill/node")
require("@effect-ts-app/fluent/polyfill/Prelude")

// Play
/*
const moduleAlias = require("module-alias")
const path = require("path")
const requireJSON5 = require("require-json5")

// const { compilerOptions } = requireJSON5(__dirname + "/tsconfig.json")

// const root = path.join(__dirname, compilerOptions.baseUrl || "")

// for (const [key, paths] of Object.entries(compilerOptions.paths)) {
//   const target = path.join(root, paths[0])
//   console.log("Aliasing", key, target)
//   if (!key.startsWith("@/")) moduleAlias.addAlias(key, target)
// }

// ./register.js
const { loadConfig, register } = require("tsconfig-paths")

const dirName = path.dirname(process.argv[process.argv.length - 1])
const config = loadConfig(dirName)

// dev support for absolute path resolution while allowing transpileOnly to work
register({
  baseUrl: config.absoluteBaseUrl,
  paths: config.paths,
})
*/
