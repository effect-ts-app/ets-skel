const isBundled = !require("fs").existsSync("../../packages/types")
const withTM = isBundled
  ? (a) => a
  : require("next-transpile-modules")([
      "@effect-ts-app/fluent",
      "@ets-skel/types",
      "@ets-skel/client",
    ])

const CI = process.env.CI
if (!CI) {
  require("@effect-ts-app/fluent/polyfill/browser")
  require("@effect-ts-app/fluent/polyfill/Prelude")
}
// @ts-ignore
const withPolyfill = CI
  ? (a) => a
  : require("next-with-polyfill")(["@effect-ts-app/fluent/polyfill/browser", "@effect-ts-app/fluent/polyfill/Prelude"])
// @ts-ignore
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

/**
 * @type {import("next/dist/server/config").NextConfig}
 **/
const nextConfig = {
  experimental: {
    // @ts-ignore
    documentMiddleware: true,
  },

  webpack(config, options) {
    //console.log("$$ webpack\n " + JSON.stringify(config, undefined, 2))
    // We need tsconfig paths to point to /src in tsconfig.json for development - in conjunction with Project References.
    // but Next should find them in /dist instead.
    if (CI) {
      config.resolve.plugins = config.resolve.plugins.map((p) => {
        if (!p.paths) {
          return p
        }
        p.paths = Object.entries(p.paths).reduce((prev, [key, value]) => {
          prev[key] = value.map((s) =>
            key.includes("@/*") ? s.replace("/src", "") : s.replace("/src", "/dist")
          )
          return prev
        }, {})
        return p
      })
    }

    // // also minimize the server bundle
    // if (config.name === "server" && config.mode === "production") {
    //   config.optimization.minimize = true
    // }

    return config
  },
  typescript: {
    // in Local dev, causes errors because paths /src is not part of the typescript project (would have to be /dist instead)
    // on the CI we adapt the tsconfig accordingly however.
    ignoreBuildErrors: true,
  },
  eslint: {
    // we are running the eslint from within the build step ourselves
    ignoreDuringBuilds: true,
  },
  // @ts-ignore
  images: {
    domains: [
      "localhost",
    ],
  },
}

module.exports = withPolyfill(withBundleAnalyzer(withTM(nextConfig)))
