# Guardrails bootstrap report

Repository: **guardrails-e2e-node** (`https://github.com/martincjarvis/guardrails-e2e-node`)
Branch: `guardrails-bootstrap` (single commit `3c0f5df`, to be landed as one PR — never direct to `main`).
Stack: Node / plain ESM JavaScript (`package.json`, `"type": "module"`).
Run mode: **unattended** — per the brief, the reasonable option was taken wherever the skill
left a choice, and recorded here.

## 1. Survey

| Item              | Finding                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Stack             | Single stack: Node / plain ESM JS. `package.json` with `"type": "module"`, `src/slugify.mjs`, `test/slugify.test.mjs`.              |
| Existing tooling  | None beyond `npm test` (`node --test`). No formatter, linter, hook manager, CI, or `.gitattributes`. Nothing to replace; all added. |
| Host + CI         | GitHub (`origin` = `martincjarvis/guardrails-e2e-node.git`). No `.github/` before bootstrap — no baseline CI.                       |
| Hook manager      | None present → installed husky v9 (the stack default) and wired into it.                                                            |
| Default branch    | `main`; protection unknown — `gh` is not installed in this environment, so exact commands are in §5.                                |
| Baseline CI state | **No CI existed.** The only seed commit `d4e9bbe chore: seed app`; `npm test` passes (1 test, green).                               |

The plugin's own repository (`.claude-plugin/plugin.json` naming `forgeboard-guardrails`) is at
`/plugin`, not here; the skill's do-not-run guard does not apply.

## 2. Capabilities wired

| Capability        | Tool chosen (existing first, then the stack reference table)                                                                                                                    | Notes                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`          | **prettier** `3.9.6`                                                                                                                                                            | `.prettierrc.json`; auto-fix via lint-staged at commit; `format:check` in verify/CI.                                                                                                              |
| `lint`            | **eslint** `10.8.0` + `@eslint/js` recommended, `--max-warnings 0`; **markdownlint-cli2** `0.23.2` + relative-links rule                                                        | `eslint.config.mjs` (flat, complexity/max-depth on, `globals.node`); markdown link integrity as a lint feature.                                                                                   |
| `typecheck`       | **off**                                                                                                                                                                         | Plain ESM JavaScript — no TypeScript and no `jsconfig checkJs`. No type system to check. See `.guardrails.json` for the owned exception.                                                          |
| `tests`           | **node --test** (the repo's existing runner, kept)                                                                                                                              | `test/*.test.mjs`; layered testing via the same runner.                                                                                                                                           |
| `coverage`        | **c8** `12.0.0` (`--check-coverage --lines 80`, `--all` over `src/`)                                                                                                            | Floor enforced by the runner in `npm test`; reported on the PR via `$GITHUB_STEP_SUMMARY`. Current floor clears at 100%.                                                                          |
| `commit-messages` | **commitlint** `21.2.1` + `@commitlint/config-conventional`                                                                                                                     | `commit-msg` hook; also linted on the PR range in CI.                                                                                                                                             |
| `secrets`         | **secretlint** `13.0.4` (preset-recommend with AWS `enableIDScanRule: true`, + pattern rule) at commit and in verify; GitHub secret scanning + push protection (commands in §5) | `enableIDScanRule` turned on so AWS **access key IDs** (the skill's "AWS key shape" example) are caught, not just secret access keys. Pattern rule blocks home-dir / UNC paths (personal detail). |
| `spelling`        | **cspell** `10.0.1` (project dictionary in `cspell.json`, seeded green)                                                                                                         | Staged files at commit; tree-wide `spell` in verify.                                                                                                                                              |
| `ci-verify`       | **GitHub Actions**: `.github/workflows/guardrails.yml` runs `npm run verify` on every PR                                                                                        | One job, same command developers run; coverage + commit-msg range checks included.                                                                                                                |
| `branch-review`   | GitHub branch protection (commands in §5)                                                                                                                                       | PR-only, required `verify` check, `enforce_admins: true`, linear history.                                                                                                                         |
| `supply-chain`    | npm **`min-release-age=7` + `audit-level=high`** (`.npmrc`); Dependabot + CodeQL via GitHub (commands in §5)                                                                    | `.npmrc` blocks freshly-published versions; Dependabot.yml configured for npm + github-actions with conventional-commit prefixes; auto-merge workflow for patch/minor.                            |

**Verify entry point** (`package.json`):

```text
npm run format:check && npm run lint && npm run lint:md && npm run spell && npm run secrets && npm run typecheck && npm test
```

CI and developers and the `pre-push` hook all run this one command.

## 3. Anything `off` (owned exceptions)

- **`typecheck`** — `off`. _Why:_ plain ESM JavaScript, no TypeScript or `checkJs` in use, so there
  is no type system to check. _Who:_ `@martincjarvis`. Recorded in `.guardrails.json`. (To turn it
  on later: add TypeScript or a `jsconfig.json` with `checkJs: true` and a `tsc --noEmit` script.)

Everything else is wired with a tool.

## 4. Gates demonstrated failing, then passing

Per skill §4, each capability was shown to refuse a bad input before it was called wired.

1. **Format** — mis-formatted `demo-format.mjs` staged.
   - `npm run format:check` → **refused**: `Code style issues found … exit code 1`.
   - At commit, lint-staged's `prettier --write` **auto-fixed** the staged bytes (`✔ prettier --write`) and the commit landed with formatted content — the formatter engages at the point of modification.

2. **Commit messages** — `git commit --allow-empty -m "wip"`:

   ```text
   ✖   subject may not be empty [subject-empty]
   ✖   type may not be empty [type-empty]
   husky - commit-msg script failed (code 1)
   ```

   Conventional `chore: demonstrate conventional commit passes` → committed (then reset).

3. **Secrets** — staged `demo-secret.mjs` containing a dummy AWS access key ID (`AKIA` + 16 chars):

   ```text
   ✖ cspell lint …: Unknown word (AKIAJK) …
   husky - pre-commit script failed (code 1)
   ```

   Commit **refused (exit 1)** by the staged scan. Independent confirmation that the dedicated
   secrets tool fires on the same bytes:

   ```text
   [AWSAccessKeyID] found AWS Access Key ID: ********************
   @secretlint/secretlint-rule-preset-recommend > @secretlint/secretlint-rule-aws
   secretlint exit = 1
   ```

   (cspell fires first in the lint-staged chain on uppercase tokens; secretlint is what classifies
   it as an AWS key. Both run on staged code files.) Dummy deleted after.

4. **Tests / verify** — assertion flipped to expect the wrong slug:

   ```text
   ✖ slugifies … AssertionError [ERR_ASSERTION]: Expected values to be strictly equal …
   verify exit = 1
   ```

   The **pre-push hook refused the push** by running the same `verify`:

   ```text
   > guardrails-e2e-node@0.1.0 verify
   ✖ failing tests: slugifies
   husky - pre-push script failed (code 1)
   error: failed to push some refs to …
   ```

   Restored → `verify exit = 0`, push succeeded.

5. **Full `verify` clean** — `verify exit = 0`, coverage `Lines 100% (7/7)`.

All demonstration commits/branches were reset; the bootstrap branch contains the single wiring
commit plus this report.

## 5. Baseline CI state — before and after

- **Before:** no CI. The repository had `.github/` absent; the only check was `npm test` locally.
- **After:** `.github/workflows/guardrails.yml` runs `npm run verify` on every PR (with coverage on
  the summary and commit-message linting across the PR range). Not yet observed green on GitHub —
  this environment has no `gh` and no credentials, so the workflow is wired but its first green run
  is the PR's, recorded as a remaining step below.

## 6. Remaining gaps — exact remote commands

These need GitHub permissions this environment does not have (`gh` is not installed; no token). Run
them from a shell with admin rights on `martincjarvis/guardrails-e2e-node`. The bootstrap never
weakens protection that already exists — check current state first and only add.

```bash
OWNER_REPO="martincjarvis/guardrails-e2e-node"

# 0. Install gh if needed: https://cli.github.com/  then: gh auth login

# 1. Open the PR for this branch (the whole change lands as one PR, never direct to main).
gh pr create --base main --head guardrails-bootstrap \
  --title "chore: bootstrap quality guardrails" \
  --body "Wires format/lint/tests/coverage/commit-msg/secrets/spelling/CI per .guardrails.json. See BOOTSTRAP-REPORT.md."

# 2. Branch protection: PR-only, required verify check, enforce_admins (critical — without it the
#    owner bypasses everything and so does any agent running with the owner's token), linear history.
#    Do NOT weaken existing protection; merge these into what is already configured.
gh api -X PUT "repos/$OWNER_REPO/branches/main/protection" \
  -F required_pull_request_reviews=null \
  -F required_status_checks='{"strict":true,"contexts":["verify"]}' \
  -F enforce_admins=true \
  -F restrictions=null \
  -F required_linear_history=true
#    Solo-maintainer note: a required *review* deadlocks one account (GitHub forbids self-approval),
#    so review is left off above; PR-only + required verify + enforce_admins still ratify every change.

# 3. Supply chain — advisories: Dependabot alerts + automated security fixes.
gh api -X PUT "repos/$OWNER_REPO/vulnerability-alerts"
gh api -X PUT "repos/$OWNER_REPO/automated-security-fixes"
#    (Dependabot config file is already committed at .github/dependabot.yml.)

# 4. Supply chain — SAST: CodeQL default setup (free on public repositories).
gh api -X PATCH "repos/$OWNER_REPO/code-scanning/default-setup" -f state=configured

# 5. Secrets — enable secret scanning + push protection.
gh api -X PATCH "repos/$OWNER_REPO" \
  -F security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}'

# 6. Auto-merge (lets the dependabot-auto-merge workflow merge patch/minor PRs once verify passes).
gh api -X PATCH "repos/$OWNER_REPO" -F allow_auto_merge=true

# 7. After the PR's "verify" check goes green, confirm it is the required context name and merge.
gh pr view --json statusCheckRollup   # confirm "verify" is reported and required
gh pr merge --squash --delete-branch  # once green and reviewed
```

## 7. Notes and choices made (unattended)

- **`typecheck` off** — recorded with reason and owner (§3).
- **secrets** — `enableIDScanRule: true` was turned on for `@secretlint/secretlint-rule-aws` so the
  "AWS key shape" example in the skill is caught by default, matching the "strict defaults, on"
  principle. Without it, secretlint catches only AWS _secret access keys_, not access key IDs.
- **lint-staged secretlint scope** — secretlint is run on staged **code** files
  (`*.{js,mjs,cjs,ts,tsx,jsx}`) and as a tree-wide `npm run secrets` sweep in verify/CI, but was
  removed from the generic `*.{json,jsonc,yml,yaml}` staged group: secretlint refuses to scan its own
  dotfile config and cspell's (`exit 2 "Not found target files"`), which would block any commit that
  touched only `.secretlintrc.json` or `.cspell.json`. cspell + prettier still run on staged JSON.
- **engines** — pinned to `node >=24.0.0, npm >=11.6.0`: cspell needs Node ≥ 22.18 and the
  `min-release-age` feature needs npm ≥ 11.6 (ships with Node 24); CI's `setup-node` reads
  `node-version-file: package.json`.
- **Agent hooks** — `.claude/settings.json` ships the plugin's format-on-edit / verify-at-stop
  template for Claude Code contributors. This bootstrap ran under **opencode**, for which the plugin
  ships no equivalent template; the two behaviours should be wired into opencode's hook mechanism if
  contributors standardise on it. Recorded as an audit finding rather than guessed.
- **Baseline `npm test`** was green before any change; no pre-existing failures were papered over.
