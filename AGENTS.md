# AGENTS.md

## Dev environment tips
- Install dependencies with `npm install` before running scaffolds.
- Use `npm run dev` for the interactive TypeScript session that powers local experimentation.
- Run `npm run build` to refresh the CommonJS bundle in `dist/` before shipping changes.
- Store generated artefacts in `.context/` so reruns stay deterministic.

## Testing instructions
- Execute `npm run test` to run the Jest suite.
- Append `-- --watch` while iterating on a failing spec.
- Trigger `npm run build && npm run test` before opening a PR to mimic CI.
- Add or update tests alongside any generator or CLI changes.

## PR instructions
- Follow Conventional Commits (for example, `feat(scaffolding): add doc links`).
- Cross-link new scaffolds in `docs/README.md` and `agents/README.md` so future agents can find them.
- Attach sample CLI output or generated markdown when behaviour shifts.
- Confirm the built artefacts in `dist/` match the new source changes.

## Repository map
- `AI_RULES.md/` — explain what lives here and when agents should edit it.
- `aplicar-schema-producao.md/` — explain what lives here and when agents should edit it.
- `AssPC.png/` — explain what lives here and when agents should edit it.
- `Atue como Engenheiro Sênior conform.txt/` — explain what lives here and when agents should edit it.
- `Backup/` — explain what lives here and when agents should edit it.
- `backup_estrutura.sql/` — explain what lives here and when agents should edit it.
- `check_ffmpeg.js/` — explain what lives here and when agents should edit it.
- `check_ffmpeg.ts/` — explain what lives here and when agents should edit it.

## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `CONTRIBUTING.md`


