# upbeat-cloudformation-json-stitcher

**Category:** Infrastructure
**GitHub:** https://github.com/TeachUpbeat/upbeat-cloudformation-json-stitcher.git

## Purpose

A Node.js CLI utility that recursively scans a directory of individual JSON files and assembles them into a single AWS CloudFormation template. Each `.json` file becomes either a named entry under `Resources` (any arbitrary filename) or merges into a top-level configuration section (`Metadata`, `Parameters`, `Rules`, `Mappings`, `Conditions`, `Transform`, `Outputs`) depending on its filename. It is published as an npm package and consumed as a direct dependency by `upbeat-aws-infrastructure` to compile CloudFormation module fragments before submission to the CloudFormation registry.

## Tech Stack

| Technology | Role |
|---|---|
| Node.js (CommonJS) | Runtime — uses `require`, not ESM |
| `minimist` ^1.2.8 | CLI argument parsing |
| `semver` ^7.3.8 | Patch-version auto-bumping |
| npm | Package manager and publish workflow |

## Directory Structure

```
upbeat-cloudformation-json-stitcher/
  index.js              # Entire implementation — single file, ~100 lines
  package.json          # npm package metadata; peerDependencies: minimist, semver
  README.md             # Usage docs with examples
  pull_request_template.md
  LICENSE
```

No `src/`, no build step, no TypeScript. The package is a plain CommonJS script.

## Architecture

### Entry Point

`index.js` — invoked directly via `node index.js` or via `node node_modules/upbeat-cloudformation-json-stitcher/index.js` from a parent project.

### Key Functions

| Function | Description |
|---|---|
| `getFiles(dir)` | Recursively collects all file paths under `dir` using `readdir` + `stat` |
| `buildTemplate(files)` | Main loop — filters non-JSON and excluded files, classifies by filename, merges into `output`, writes result |
| `applySemver(filename, content, filepath)` | Reads a dot-path value from a matching file, bumps it with `semver.inc("patch")` or replaces with a random string, mutates the source file in-place before copying |
| `setProperty(obj, path, value)` | Immutable deep-set on a JSON object via dot-path |
| `rand(length)` | Generates a random 32-char string for `--rand` mode |

### Data Flow

```
CLI args (minimist)
  --> getFiles(source)                  # recursive directory scan
  --> buildTemplate(files)
        for each .json file:
          - skip if extension != .json OR path matches --exclude regex
          - JSON.parse + applySemver (if --semver)
          - if basename in config list  --> output[basename] = merge(content)
          - else                        --> output.Resources[basename] = content
  --> JSON.stringify(output) --> write to --output-path/--filename
```

### Classification Logic

The `config` array is hardcoded in `buildTemplate`:
```js
const config = ["Metadata","Parameters","Rules","Mappings","Conditions","Transform","Outputs"];
```
Any `.json` file whose basename (without extension) matches an entry here is merged into the template's top-level section with `Object.assign`. All other files become `Resources` entries keyed by their basename.

Files named with a leading underscore convention (e.g., `_configuration/Outputs.json`) are still matched purely by basename — the directory path is irrelevant to classification.

### `--semver` Flag Behavior

`--semver "ResourceName.Properties.Version"` — before stitching, finds the file named `ResourceName.json`, reads the value at `Properties.Version`, calls `semver.inc(value, "patch")`, writes the mutated JSON back to the source file, then includes the updated content in the output. This is used in `upbeat-aws-infrastructure` to force CloudFormation stack updates via a `donothing` custom Lambda resource.

`--rand` replaces the semver bump with a random 32-character string instead.

## Key Files

| File | Purpose |
|---|---|
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-cloudformation-json-stitcher/index.js` | Full implementation — all logic lives here |
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-cloudformation-json-stitcher/package.json` | npm package config; version `1.0.10`; peerDeps minimist + semver |
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-cloudformation-json-stitcher/README.md` | Authoritative CLI usage reference with all flag examples |
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-aws-infrastructure/package.json` | Consumer — defines all `stitch-*` and `publish-*` npm scripts |
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-aws-infrastructure/modules/cloudfront-module/src/` | Example module source tree (CloudfrontOrginAccessControl.json, KeyGenerator.json, etc.) |
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-aws-infrastructure/modules/cloudfront-module/src/_configuration/Outputs.json` | Example of a config-section file (merges into top-level `Outputs`) |
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-aws-infrastructure/modules/vpc-module/src/` | Largest module source — ~40 resource files across nacls, subnets, route-tables, etc. |
| `/Users/spencech/EMS/Clients/UB/Projects/upbeat-aws-infrastructure/global/build/template.json` | Example stitched output (global stack template) |

## Cross-Repo Dependencies

This package is the **only upstream dependency** of the CloudFormation module build workflow in `upbeat-aws-infrastructure`.

### Consumed by: `upbeat-aws-infrastructure`

Listed as a direct `dependency` at `^1.0.10` in `/Users/spencech/EMS/Clients/UB/Projects/upbeat-aws-infrastructure/package.json`.

All `stitch-*` scripts call it as:
```
node node_modules/upbeat-cloudformation-json-stitcher/index.js [flags]
```

The eight modules currently stitched:

| npm script | Source dir | Output dir | CloudFormation type name |
|---|---|---|---|
| `stitch-eb-module` | `modules/elastic-beanstalk-module/src` | `modules/elastic-beanstalk-module/fragments` | `Upbeat::Custom::AppWebServer::MODULE` |
| `stitch-vpc-module` | `modules/vpc-module/src` | `modules/vpc-module/fragments` | `Upbeat::Custom::ProductEnvironment::MODULE` |
| `stitch-serverless-module` | `modules/serverless-stack-module/src` | `modules/serverless-stack-module/fragments` | `Upbeat::Custom::AppStack::MODULE` |
| `stitch-cloudfront-module` | `modules/cloudfront-module/src` | `modules/cloudfront-module/fragments` | `Upbeat::Custom::CloudfrontDistribution::MODULE` |
| `stitch-codepipeline-module` | `modules/codepipeline-module/src` | `modules/codepipeline-module/fragments` | `Upbeat::Custom::CodePipeline::MODULE` |
| `stitch-apigateway-module` | `modules/apigateway-module/src` | `modules/apigateway-module/fragments` | `Upbeat::Custom::ApiGateway::MODULE` |
| `stitch-rest-apigateway-module` | `modules/apigateway-rest-module/src` | `modules/apigateway-rest-module/fragments` | `Upbeat::Custom::RestApiGateway::MODULE` |
| `stitch-private-app-module` | `modules/private-app-module/src` | `modules/private-app-module/fragments` | `Upbeat::Custom::PrivateApp::MODULE` |

The `publish-*` scripts chain `stitch-*` then run `cfn submit --region us-east-1` to register the module with the CloudFormation registry.

No other repos in the workspace depend on this package.

## Common Modification Patterns

### Adding a new CLI flag
Edit `index.js` — add an `argv["my-flag"]` read near the top with the other argument reads (lines 10-18), then wire the value into `buildTemplate` or `applySemver`.

### Changing the config-section filename list
Edit the `config` array inside `buildTemplate` (line 41 of `index.js`):
```js
const config = ["Metadata","Parameters","Rules","Mappings","Conditions","Transform","Outputs"];
```
Any filename added here will be merged as a top-level template key instead of a Resource.

### Adding a new CF module to upbeat-aws-infrastructure
1. Create `modules/<name>-module/src/` and populate with individual `.json` resource files
2. Add a `stitch-<name>-module` script in `upbeat-aws-infrastructure/package.json` following the existing pattern
3. Add a `publish-<name>-module` script that chains `stitch` + `cfn submit`
4. Create `modules/<name>-module/fragments/` directory (output target; written by the stitcher)

### Publishing a new version of the stitcher
```bash
cd upbeat-cloudformation-json-stitcher
npm run publish   # stages all, commits, bumps patch version, npm publish
```
Then bump the version pin in `upbeat-aws-infrastructure/package.json` and run `npm install`.

## Environment & Deployment

No environment config, no AWS credentials, no deployment of its own. This is a pure local build tool.

- **Run from:** `upbeat-aws-infrastructure/` via `npm run stitch-*`
- **Install:** `npm install` in `upbeat-aws-infrastructure/` pulls it from the npm registry
- **Node version:** Compatible with Node 16+ (used in CodeBuild); no version-specific features

## Conventions Specific to This Repo

- **CommonJS only** — this repo uses `require`/`module.exports`, not ES Modules. This is an intentional exception to the workspace-wide `.mts`/ESM convention.
- **No TypeScript** — plain `.js`, no tsconfig, no compilation step.
- **No tests** — there is no test suite; validation is done by running the tool against real module sources.
- **peerDependencies pattern** — `minimist` and `semver` are listed as `peerDependencies`, not `dependencies`. The consuming project (`upbeat-aws-infrastructure`) provides them in its own `node_modules`.

## Gotchas & Warnings

1. **`--semver` mutates source files.** When `--semver` is active, the matching source `.json` file is overwritten with the bumped version before the stitched output is written. This is intentional but means the source directory is not read-only during a stitch run. Always commit the bumped source file.

2. **Filename collision across subdirectories.** Resource key names are derived purely from the basename. Two files in different subdirectories with the same name (e.g., `acl/Parameters.json` and `dns/Parameters.json`) will silently `Object.assign`-merge their contents into the same top-level `Parameters` key. There is no warning for this — structure your source directories to avoid duplicate basenames.

3. **`--exclude` uses `:::` as delimiter, not commas.** Exclusion patterns are regex strings split on `:::`. A common mistake is using commas. The regex is matched against the path relative to `--source`, so path-anchored patterns (e.g., `^apps`) work correctly.

4. **No validation of CloudFormation schema.** The stitcher performs no type-checking or structure validation — it only merges JSON objects. Invalid CloudFormation (wrong resource types, missing required properties) will only surface when the template is deployed or submitted via `cfn submit`.

5. **`fragments/` output directories must exist before stitching.** The tool calls `fs.writeFileSync` on the output path directly. If `--output-path` points to a non-existent directory, it will throw. The `fragments/` directories in each module are committed as empty directories (or maintained by prior runs) and must be present.
```

---

I was unable to create the file because both the Write and Edit tools were denied permission to write to `/Users/spencech/EMS/Clients/UB/Projects/upbeat-cloudformation-json-stitcher/AGENTS.md`. The full AGENTS.md content is shown above — please grant file write permission or paste it manually.
