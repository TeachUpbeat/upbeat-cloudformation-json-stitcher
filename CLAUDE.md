# CLAUDE.md — upbeat-cloudformation-json-stitcher

> Prescriptive guidance for Claude Code. For descriptive context see AGENTS.md.
> Global conventions (naming, formatting, TypeScript patterns) live in the workspace-level CLAUDE.md — do not duplicate here.

## Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| Run stitcher manually | `node index.js --source <dir> --output-path <dir> --filename <name>.json` | Requires `minimist` and `semver` in `node_modules` |
| Stitch a CF module | `npm run stitch-<module>-module` | Run from `upbeat-aws-infrastructure/` |
| Publish new version | `npm run publish` | Stages all, commits, bumps patch, publishes to npm |
| Test changes | Run any `stitch-*` script in `upbeat-aws-infrastructure/` and inspect the `fragments/` output | No automated test suite exists |

## Local Development Setup

1. Clone the repo — no `npm install` needed (peerDependencies are provided by the consumer)
2. To test locally, run from `upbeat-aws-infrastructure/` where `minimist` and `semver` exist in `node_modules`:
   ```bash
   cd ../upbeat-aws-infrastructure
   npm install
   node node_modules/upbeat-cloudformation-json-stitcher/index.js \
     --source modules/cloudfront-module/src \
     --output-path modules/cloudfront-module/fragments \
     --filename fragment.json
   ```
3. Or symlink locally: `npm link` in this repo, then `npm link upbeat-cloudformation-json-stitcher` in `upbeat-aws-infrastructure/`

## Testing

- **No test suite.** Validation is done by running the tool against real module sources in `upbeat-aws-infrastructure/`.
- After any change to `index.js`, run at least two `stitch-*` scripts and diff the `fragments/` output against the previous version.
- Verify the stitched JSON is valid: `cat fragments/fragment.json | python3 -m json.tool > /dev/null`

## Guardrails

- **Single-file implementation.** All logic lives in `index.js` (~100 lines). Do not split into multiple files or introduce a build step.
- **CommonJS only.** This repo uses `require`/`module.exports` — do not convert to ESM. This is an intentional exception to the workspace convention.
- **No TypeScript.** Do not introduce `tsconfig.json` or `.ts` files.
- **Do not modify the `config` array** (`["Metadata","Parameters","Rules","Mappings","Conditions","Transform","Outputs"]`) without understanding that it controls which filenames become top-level CF sections vs. Resources entries.
- **`--semver` mutates source files.** Be aware that source `.json` files are overwritten in-place when this flag is active. Never remove this behavior — it is relied upon to force CF stack updates.
- **`--exclude` uses `:::` as the delimiter**, not commas. Do not change this — consumers depend on it.
- **peerDependencies, not dependencies.** `minimist` and `semver` must remain peerDependencies. The consumer provides them.
- **`fragments/` directories must exist** before running the stitcher — it does not create output directories.

## Pre-Commit Checklist

- [ ] `index.js` changes tested against at least one real module source
- [ ] Stitched output is valid JSON
- [ ] No accidental format changes to the `config` array or CLI argument names
- [ ] If publishing: version in `package.json` bumped and `upbeat-aws-infrastructure/package.json` dependency updated

## File Organization

- `index.js` — entire implementation (getFiles, buildTemplate, applySemver, setProperty, rand)
- `package.json` — npm metadata; version `1.0.10`; peerDeps only
- `README.md` — CLI usage reference with all flag examples
