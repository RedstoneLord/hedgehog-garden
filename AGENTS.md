# Ёжиковый сад

This repository is part of the wider itmo-game project. The game is a React/Vite orchard simulation, with a browser build and an Android WebView wrapper. Player-facing text is in Russian.

- Run `npm test` for the simulation tests, `npm run dev` for the development server, and `npm run build` for the browser build. Use a Node.js version supported by the repository's Vite dependency.
- Game actions and simulation live in `src/game.js`, with separate modules for trade, production, research, and worker development. Preserve compatibility with existing saves and route player actions through the same simulation entry points on desktop and mobile.
- Run `npm run terrain` after edits to the terrain renderer or baked foliage. Run `node scripts/standalone.mjs` after the browser build to generate the release's standalone `play.html`.
- Store four-part app versions as npm prereleases. For example, `0.7.2-hotfix.3` builds as `0.7.2.3`. Keep `package.json`, `package-lock.json`, `CHANGELOG.md`, and the matching release notes in sync.
- The Android build script uses JDK 17, Android SDK 35, and the existing release signer. Keep signing files out of git. The GitHub release workflow publishes the versioned APK in `versions/` for a new version.
