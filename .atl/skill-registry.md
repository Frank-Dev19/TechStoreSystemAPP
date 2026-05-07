# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review. | branch-pr | C:\Users\sergi\.config\opencode\skills\branch-pr\SKILL.md |
| When writing Go tests, using teatest, or adding test coverage. | go-testing | C:\Users\sergi\.config\opencode\skills\go-testing\SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature. | issue-creation | C:\Users\sergi\.config\opencode\skills\issue-creation\SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen". | judgment-day | C:\Users\sergi\.config\opencode\skills\judgment-day\SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | skill-creator | C:\Users\sergi\.config\opencode\skills\skill-creator\SKILL.md |

## Compact Rules

### branch-pr
- Every PR MUST link an approved issue; blank PRs without linkage are blocked.
- Add exactly one `type:*` label and keep it aligned with the conventional commit type.
- Branch names MUST follow `type/description` using lowercase `a-z0-9._-` only.
- Use conventional commits only; never add `Co-Authored-By` trailers.
- Run `shellcheck` on modified shell scripts before opening the PR.
- PR body MUST include linked issue, short summary, changes table, and test plan.

### go-testing
- Prefer table-driven tests for pure logic and multi-case coverage.
- Test Bubbletea state transitions by calling `Model.Update()` directly.
- Use `teatest.NewTestModel()` for full interactive TUI flows.
- Use golden files for stable rendered-output assertions.
- Test success and error paths explicitly; isolate side effects behind mocks or interfaces.
- Use `t.TempDir()` for filesystem tests and skip real integration flows in `--short` mode.

### issue-creation
- Never create blank issues; always use the bug report or feature request template.
- Search for duplicates before opening a new issue.
- New issues get `status:needs-review`; PRs MUST wait for `status:approved`.
- Questions belong in Discussions, not Issues.
- Bug reports MUST include reproduction steps, expected behavior, and actual behavior.
- Feature requests MUST describe the problem, proposed solution, and affected area.

### judgment-day
- Resolve skill registry rules before launching judge agents; inject identical standards into both prompts.
- Always run TWO blind reviews in parallel; judges must not know about each other.
- Treat findings confirmed by both judges as high-confidence and fix those first.
- Classify warnings as `real` vs `theoretical`; theoretical warnings are reported as INFO only.
- After confirmed fixes, re-judge with both judges; escalate to user after 2 iterations if issues remain.
- The orchestrator coordinates only; judges review, fix agents patch.

### skill-creator
- Create a skill only for reusable patterns or workflows, not one-off tasks.
- Use `skills/{skill-name}/SKILL.md` with complete frontmatter and trigger text in description.
- Put actionable guidance in Critical Patterns and keep code examples minimal.
- Use `assets/` for templates/schemas and `references/` only for LOCAL docs.
- Follow lowercase hyphenated naming; choose project-specific names only when the pattern is project-specific.
- After creating a skill, register it in `AGENTS.md`.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| — | — | No project-level convention index files found (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, `copilot-instructions.md`). |
