# The standards

One page. What each capability means, where it is enforced, and who owns
exceptions. The tool choice for each capability lives in
[`.guardrails.json`](../.guardrails.json) at the repository root.

## Principles

- **Clean builds.** Zero warnings, zero errors, enforced by tools — a warning
  is either compensated at runtime (fine) or a detected defect (not fine).
- **Enforce at the point of modification.** Auto-fix on edit, check on commit,
  sweep on push/PR. The later a defect is caught, the more it costs.
- **Scripts and hard stops over prose.** A standard that only lives in a
  document is a suggestion.
- **The stack's own tools.** Well-understood, well-supported tools over
  bespoke code, always. Platform-native tooling (Dependabot, CodeQL, push
  protection) beats a CI-installed tool, which beats anything bespoke.
- **Sensible defaults, on.** Templates ship with the strict options enabled —
  analyser packs at their latest level, complexity limits, personal-detail
  scanning — and a repository loosens them deliberately, with a reason, not
  by never turning them on.
- **Exceptions are owned.** Anything switched off or suppressed carries a
  reason and a human owner, and is visible in review.
- **CI is parity, not authority.** CI re-runs the same `verify` the developer
  ran; it exists to catch what `--no-verify` skipped, not to be the first
  place checks run.
- **A task is done when verifiably tested.** TDD for changes; a feature's
  end-to-end journey test exists before the feature is called complete.

## Capabilities

| Capability        | Meaning                                                              | Enforced at            | This repo's tool                                                          |
| ----------------- | -------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `format`          | One formatter, auto-applied; no style debate in review               | commit (staged files)  | prettier, auto-fix via lint-staged                                        |
| `lint`            | Static analysis at zero warnings                                     | commit (staged), CI    | eslint (`@eslint/js` recommended, `--max-warnings 0`) + markdownlint-cli2 |
| `typecheck`       | Types checked where the stack has them                               | push, CI               | off — plain ESM JS, no type system (see `.guardrails.json`)               |
| `tests`           | Layered: unit + integration, and an E2E journey per feature          | push, CI               | `node --test`                                                             |
| `coverage`        | 80% floor on production code, runner-enforced, reported on the PR    | CI                     | c8 (`--check-coverage --lines 80`)                                        |
| `commit-messages` | Conventional commits, checked at commit time                         | commit-msg hook        | commitlint + `@commitlint/config-conventional`                            |
| `secrets`         | No credential shapes in the tree                                     | commit (staged), CI    | secretlint (preset-recommend + pattern rule); GitHub secret scanning      |
| `spelling`        | Spell check over prose and identifiers                               | commit (staged), CI    | cspell (dictionary in `cspell.json`)                                      |
| `ci-verify`       | The repository's `verify` command runs on every PR and must pass     | CI, required check     | `.github/workflows/guardrails.yml` runs `npm run verify`                  |
| `branch-review`   | Default branch takes PRs only; `.guardrails.json` needs human review | host branch protection | GitHub branch protection (see `BOOTSTRAP-REPORT.md`)                      |
| `supply-chain`    | Dependency advisories, release-age window, static security scan      | host tooling, CI       | npm `min-release-age=7`; Dependabot + CodeQL (see `BOOTSTRAP-REPORT.md`)  |

## The verify entry point

`npm run verify` is the single chained command both developers and CI run:

```text
npm run format:check && npm run lint && npm run lint:md && npm run spell && npm run typecheck && npm test
```

- `format:check` — prettier `--check .`
- `lint` — eslint `--max-warnings 0`
- `lint:md` — markdownlint-cli2 with the relative-links rule
- `spell` — cspell tree-wide sweep
- `typecheck` — no-op here (plain JS; see the `typecheck` off entry)
- `test` — `c8 --check-coverage --lines 80 node --test`

The pre-push hook runs `verify`; the `guardrails` GitHub Actions workflow runs
the same command on every PR.

## The record: `.guardrails.json`

One file at the repository root. Each capability maps to the tool implementing
it, or to `off` with `why` and `who`:

```json
{
  "format": { "tool": "prettier" },
  "coverage": {
    "off": true,
    "why": "spike repo, throwaway",
    "who": "@martincjarvis"
  }
}
```

Turning a capability off is a human decision. The enforcement is the host's:
[`CODEOWNERS`](../CODEOWNERS) covers `.guardrails.json`, so no change to it
merges without a human review. There are no registers, approval scripts, or
provenance checks — the PR is the audit trail.

**An `off` entry is a proposal until it merges.** The decision exists only on
the default branch, which can only be reached through a reviewed PR; an entry
that differs from the default branch's copy is an unratified proposal, and the
audit reports it as such. An agent can propose loosening a standard; only the
merge ratifies it.

## Exceptions in code

Use the tool's own suppression syntax (`eslint-disable`, `#pragma`, `noqa`)
**with a reason on the same line**, and keep the tool's setting that requires
reasons switched on where it exists. A growing suppression count is a finding.
