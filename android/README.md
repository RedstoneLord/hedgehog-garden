# Ёжиковый сад для Android

The app runs the bundled web build offline. It saves the garden atomically in app-private storage, and the in-game save dialog can import or export a JSON backup through Android's file picker.

## Build and sign

Install JDK 17 and Android SDK platform 35 with build-tools 35.0.0. Install the project's JavaScript dependencies with `npm ci`. Set `ANDROID_SDK_ROOT` to the SDK path.

```sh
scripts/build-apk.sh --init-key
scripts/build-apk.sh
```

Use `--init-key` once for a new app identity. Keep a secure backup of both the PKCS#12 signing key and its password under `android/signing/`. Subsequent releases must use that same key. Set `ORCHARD_SIGNING_DIR` to use a private signing directory elsewhere. The build reads the version from `package.json` and writes a signed APK to the matching `versions` folder.

## Ship an update

1. Increase the version in `package.json` and `package-lock.json`. For a four-part version such as `0.5.2.1`, use npm version `0.5.2-hotfix.1`. Release scripts turn it into the four-part Android version and tag.
2. Run `scripts/build-apk.sh` with the existing signing key. Add the signed APK and `RELEASE.md` under `versions/<version>/` to the release commit.
3. Push the commit to `master`. GitHub Actions runs the tests, verifies the APK version and certificate, and publishes the version as the latest stable release on [GitHub](https://github.com/RedstoneLord/hedgehog-garden/releases). A push with an already published version runs the tests without replacing the release.
4. Launch an earlier Android build with a save, let it download the update, and confirm installation. Open the updated app and confirm the saved garden loads.

GitHub Actions only receives the signed APK. The private signing key and its password stay in the ignored local signing directory.

The app checks the latest stable release on foreground entry, at most once every 30 minutes per session. It downloads a newer matching APK, verifies its package name, Android version code, and signer, then offers to install. Android may request permission to install updates from this app and retains control of the install prompt.

Android builds through 0.5.2 need one in-place manual update to 0.5.2.1 because their updater only recognizes three-part versions. The signing key and save storage are shared with the earlier builds.
