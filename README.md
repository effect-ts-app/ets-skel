# WIP

## Developing

### Preparation (and whenever libraries update)

- Run in the root `yarn`
- On Mac: Make sure xcode CLI is installed: `xcode-select --install` (if need to reinstall check https://github.com/schnerd/d3-scale-cluster/issues/7)

### Running

- Run in the root: `yarn link-libs`
- then run `yarn dev` (an alias for `dev:linked`)
  If you are using VS Code, you can use the built-in: "Tasks: Run Build Task" for an excellent experience.

#### Running with unlinked libs

Only recommended to verify published versions.

- Run in the root: `yarn unlink-libs`
- then run `yarn dev:unlinked`

### Notes

- We delete the`.next` folder when switching between linked an unlinked automatically.
- Because of unique symbol use in @effect-ts* libraries, we must make sure we only have 1 version of each library loaded within a single application.
  this is taken care of in the `next.config.js`.

## Updating all package dependencies

- run `yarn up` to update all package.jsons and run yarn incl. upgrade, as well as re-link-libs.
