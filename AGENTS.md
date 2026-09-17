# AGENTS.md

## Repository overview

This repository contains the Day Planner (OG) Obsidian plugin. It is a TypeScript/Svelte project bundled with esbuild.

- `src/` contains the plugin implementation; `src/main.ts` is the entry point.
- `src/timeline.svelte` and `src/timeline-view.ts` implement the timeline UI.
- `tests/` contains Vitest tests and Obsidian mocks/fixtures.
- `examples/` contains example planner notes and CSS.
- `manifest.json` and `manifest-beta.json` describe the plugin releases.
- `build/` is generated output and is ignored by Git.

## Development workflow

Use Node.js 22.13 or newer. Install dependencies with:

```sh
npm ci
```

Useful commands:

```sh
npm run dev       # watch and rebuild into build/
npm run test      # run Vitest in watch mode
npm run build     # run tests, checks, and a production bundle
npm run lint      # run Biome linting
npm run eslint    # run the Obsidian ESLint rules
npm run fix       # apply Biome fixes to src/
```

Before submitting a change, run `npm run build`. Add or update tests in `tests/` for behavior changes. Keep generated bundles, source maps, archives, and local vault/build output out of commits.

## Code conventions

- Follow the existing TypeScript and Svelte patterns and preserve strict type checking.
- Use four-space indentation; Biome and the repository `.editorconfig` define formatting details.
- Keep Obsidian API integration in the existing plugin/view/settings modules rather than introducing parallel abstractions.
- Use the existing logger and settings/constants modules where applicable.
- Update `README.md` when commands, settings, note formats, or user-visible behavior change.
- Do not change version numbers or release manifests for ordinary feature/fix pull requests; the maintainer handles release versioning.

## Pull requests

Discuss substantial changes in an issue or with the maintainer before implementation. Pull requests should explain the user-visible change, include tests where practical, and pass the CI build and test workflow. Follow `CONTRIBUTING.md` and the repository Code of Conduct.
