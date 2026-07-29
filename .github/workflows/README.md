# GitHub Actions workflows

CI/CD for `pb-ts-zod`.

## Workflows

Both workflows run on Node 22 — the package requires ≥ 22.5 for `node:sqlite`.

### CI (`ci.yml`)

- **Triggers**: pushes to `main`, pull requests targeting `main`
- **Steps**: `actions/checkout` → `setup-node` → `npm ci` → **`npm run check`** (typecheck + Biome +
  unit tests) → `npm run build` → CLI smoke check (`--version`, `--help`, and a real generation run
  against `test/fixtures/pb_schema.json`)

### Release (`release.yml`)

- **Triggers**: pushed tags matching `v*`
- **Steps**: `actions/checkout` → `setup-node` (npm registry) → `npm ci` → **`npm run check`** →
  `npm run build` → `npm publish` → `softprops/action-gh-release` with
  `generate_release_notes: true`

## Release process

1. Bump the version in `package.json` and update `CHANGELOG.md`
2. Commit, then tag and push:

   ```bash
   VERSION=$(node -p "require('./package.json').version")
   git tag "v$VERSION"
   git push origin main --follow-tags
   ```

3. The release workflow publishes to npm and creates the GitHub release

`scripts/release.sh <patch|minor|major>` automates steps 1–2. See [DEPLOYMENT.md](../../DEPLOYMENT.md)
for the full guide.

## Required secrets

| Secret | Purpose |
| --- | --- |
| `NPM_TOKEN` | npm *Automation* token with publish permission |
| `GITHUB_TOKEN` | provided automatically; needs Contents: write for releases |

## Not covered by CI

The end-to-end suite (`npm run test:e2e`) is **not** wired into CI — it needs Bun and downloads a
PocketBase binary. Run it locally before releasing, and for any change to field mapping, emission,
or the fetchers.
