require("core-js/stable")
require("regenerator-runtime/runtime")

if (!process.env.TEST_SRC && !process.env.GITHUB_ACTIONS) {
  require("@effect-ts-app/fluent/polyfill/node")
  require("@effect-ts-app/fluent/polyfill/Prelude")
}
require("@effect-ts/system/Tracing/Enable")