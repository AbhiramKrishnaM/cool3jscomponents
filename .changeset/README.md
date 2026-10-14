# Changesets

Run `pnpm changeset` after a change that should ship, pick the packages and the bump (patch / minor / major), and write one line for the changelog. Commit the generated file with the change.

To release: `pnpm version-packages` bumps versions and writes `CHANGELOG.md` files, then `pnpm release` builds and publishes to npm.
