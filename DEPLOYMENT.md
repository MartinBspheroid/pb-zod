# Releasing pb-ts-zod

How this package is built, versioned, and published to npm.

Package: [`pb-ts-zod`](https://www.npmjs.com/package/pb-ts-zod) · Repo:
[`MartinBspheroid/pb-zod`](https://github.com/MartinBspheroid/pb-zod)

## What ships

`package.json` `files` controls the published tarball — only these are included:

```
dist/**/*      README.md      CHANGELOG.md      LICENSE
```

`npm run build` (tsdown) emits ESM plus declarations:

| Path | Role |
| --- | --- |
| `dist/index.mjs` / `dist/index.d.mts` | library entry (`main`, `types`, `exports`) |
| `dist/cli.mjs` | the `pb-ts-zod` binary |

The build is ESM-only (`"type": "module"`). `node:sqlite` must stay a `node:`-prefixed external in
the bundle — tsdown handles this; esbuild-based bundlers strip the prefix and break the CLI at
runtime. Verify with `grep -c 'node:sqlite' dist/*.mjs` after a build if you change bundler config.

`prepublishOnly` runs `npm run build`, so a manual `npm publish` cannot ship a stale `dist/`.

## Prerequisites

1. **npm account** with publish rights on `pb-ts-zod`.
2. **`NPM_TOKEN`** repository secret — an npm *Automation* token with publish permission
   (Settings → Secrets and variables → Actions).
3. **Actions permissions** — Contents: write (for creating GitHub releases).

## Release process

Releases are tag-driven. `.github/workflows/release.yml` triggers on any pushed tag matching `v*`
and runs:

```
checkout → setup-node (registry npmjs) → npm ci → npm run build → npm publish → gh release create
```

The GitHub release is created by `softprops/action-gh-release` with `generate_release_notes: true`.

### Cutting a release

```bash
# 1. Make sure the gate is green and the changelog is updated
npm run check
npm run test:e2e            # optional but recommended before a minor/major

# 2. Bump the version (no tag yet)
npm version patch --no-git-tag-version   # or minor / major

# 3. Commit, tag, push
VERSION=$(node -p "require('./package.json').version")
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release v$VERSION"
git tag "v$VERSION"
git push origin main --follow-tags
```

Pushing the tag is what triggers publication.

### Using the helper script

`scripts/release.sh` wraps the same steps and refuses to run on a non-`main` branch or with a dirty
working tree:

```bash
./scripts/release.sh patch    # 1.0.0 → 1.0.1
./scripts/release.sh minor    # 1.0.0 → 1.1.0
./scripts/release.sh major    # 1.0.0 → 2.0.0
```

It pulls `main`, runs `npm test` and `npm run build`, bumps the version, commits, tags, and pushes
with `--follow-tags`.

### Pre-releases

```bash
npm version prerelease --preid=beta      # 1.0.0 → 1.0.1-beta.0
git tag "v$(node -p "require('./package.json').version")"
git push origin main --follow-tags
```

Note: `release.yml` runs a plain `npm publish`, which would tag this as `latest`. To ship a beta
under the `beta` dist-tag, publish manually with `npm publish --tag beta` instead of pushing the
tag, or add a `--tag` argument to the workflow first.

## Pre-release checklist

- [ ] `npm run check` passes (typecheck + Biome + Vitest)
- [ ] `npm run test:e2e` passes against a real PocketBase
- [ ] `npm run build` succeeds and `dist/cli.mjs` runs: `node dist/cli.mjs --version`
- [ ] `npm pack --dry-run` shows only `dist/`, README, CHANGELOG, LICENSE
- [ ] `CHANGELOG.md` has an entry for this version (move items out of `[Unreleased]`)
- [ ] `README.md` reflects any new or changed flags
- [ ] Version follows [SemVer](https://semver.org/) — generated-output changes that break consumers
      are a **major**

## Local verification

```bash
npm run build
npm pack                                    # produces pb-ts-zod-<version>.tgz
npm install -g ./pb-ts-zod-*.tgz
pb-ts-zod --version
pb-ts-zod --json ./test/fixtures/pb_schema.json --out /tmp/out.ts
npm uninstall -g pb-ts-zod
```

Because the tool requires Node ≥ 22.5, verify on a Node 22+ runtime — the `node:sqlite` reader
silently doesn't exist on older versions.

## Post-release verification

1. `npm view pb-ts-zod version` matches the tag
2. The GitHub release exists with generated notes
3. `npx pb-ts-zod@latest --version` works from a clean environment
4. `npx pb-ts-zod@latest --json <some-schema.json>` produces a valid file

## Troubleshooting

**"Version already exists"** — npm versions are immutable. Bump again:

```bash
npm view pb-ts-zod versions --json | tail -5
npm version patch --no-git-tag-version
```

**"Authentication failed" / 401 on publish** — the `NPM_TOKEN` secret is missing, expired, or is a
read-only token. Regenerate an *Automation* token with publish scope.

**Release workflow didn't trigger** — the tag must match `v*` and must actually be pushed:

```bash
git tag -l
git push origin --tags
```

**Build passes locally, fails in CI** — reproduce with a clean install:

```bash
rm -rf node_modules && npm ci && npm run build && npm run check
```

### Rolling back

```bash
npm unpublish pb-ts-zod@<version>       # only within 72 hours, and only if nothing depends on it
gh release delete v<version>
git tag -d v<version>
git push origin :refs/tags/v<version>
```

Prefer `npm deprecate pb-ts-zod@<version> "<reason>"` and shipping a fix over unpublishing.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and PRs to `main`, on Node 22: `npm ci` →
`npm run check` (typecheck + Biome + unit tests) → `npm run build` → a CLI smoke check that
generates from `test/fixtures/pb_schema.json`. `release.yml` runs the same `npm run check` before
publishing.

The **end-to-end suite is not in CI** — it needs Bun and downloads a PocketBase binary. Run
`npm run test:e2e` locally before any release, and for any change to field mapping, emission, or
the fetchers.

## Monitoring

- Downloads: [npm-stat](https://npm-stat.com/charts.html?package=pb-ts-zod)
- Bundle size: [bundlephobia](https://bundlephobia.com/package/pb-ts-zod)
- Dependencies: [deps.dev](https://deps.dev/npm/pb-ts-zod)
