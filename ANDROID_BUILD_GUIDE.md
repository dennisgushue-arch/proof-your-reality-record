# Android App Bundle (.aab) Build Guide

## What's Been Done

I've successfully prepared your Vite React app for Android deployment:

1. ✅ **Installed Capacitor** — Added `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android` packages
2. ✅ **Created Capacitor Configuration** — `capacitor.config.ts` configured with app ID `com.proofyourreality.record`
3. ✅ **Generated Android Project** — Full Gradle-based Android project structure in `/android` directory
4. ✅ **Built Web Assets** — Vite production build compiled to `dist/` (686 KB JavaScript + 66 KB CSS)
5. ✅ **Synced Assets** — Web app assets copied to `android/app/src/main/assets/public`
6. ✅ **Added Build Scripts** — Three convenience npm scripts:
   - `npm run android:sync` — Sync web assets into Android project
   - `npm run android:open` — Open Android Studio
   - `npm run android:bundle` — One-command build+sync+bundle

## Local Machine Prerequisites

To generate the `.aab` file on your own machine, make sure Android SDK/tooling is installed and configured:

### 1. Install Android SDK & Tools

**On macOS/Linux:**

```bash
# Using Android Studio (recommended):
# 1. Download from https://developer.android.com/studio
# 2. Run the installer
# 3. Complete the SDK setup wizard

# Or using command-line tools (manual setup):
export ANDROID_HOME=~/Android/sdk
mkdir -p $ANDROID_HOME
cd $ANDROID_HOME
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools*.zip
rm commandlinetools*.zip
mkdir -p $ANDROID_HOME/cmdline-tools/latest
mv cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/

# Add to ~/.bashrc or ~/.zshrc:
export ANDROID_HOME=~/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
```

**On Windows:**

```bash
# Download Android Studio or command-line tools from:
# https://developer.android.com/studio

# Or set manually:
setx ANDROID_HOME "C:\Android\sdk"
```

### 2. Install Required SDK Components

```bash
sdkmanager "platforms;android-35"
sdkmanager "build-tools;35.0.0"
sdkmanager "ndk;26.1.10909125"
```

### 3. Create Signing Key (Release Bundle)

```bash
keytool -genkey -v -keystore ~/proof-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias proof_key \
  -storepass your_keystore_password \
  -keypass your_key_password
```

### 4. Configure Signing in Gradle

Create `android/key.properties`:

```properties
storeFile=/path/to/your/proof-keystore.jks
storePassword=your_keystore_password
keyAlias=proof_key
keyPassword=your_key_password
```

Then in `android/app/build.gradle`, add:

```gradle
signingConfigs {
    release {
        def keyFile = rootProject.file('key.properties')
        if (keyFile.exists()) {
            def props = new Properties()
            props.load(new FileInputStream(keyFile))
            storeFile file(props['storeFile'])
            storePassword props['storePassword']
            keyAlias props['keyAlias']
            keyPassword props['keyPassword']
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

> Important: For Google Play uploads, use a real release keystore via `android/key.properties`.
> The current Gradle config loads signing values from `android/key.properties` when that file exists.

### 5. Set ANDROID_HOME & Build

```bash
cd /path/to/proof-your-reality-record

# Set the Android SDK path
export ANDROID_HOME=~/Android/sdk

# Build the app bundle
npm run android:bundle
```

### 6. Locate the Generated AAB

After a successful build, your app bundle will be at:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Upload this file to [Google Play Console](https://play.google.com/console).

## Upload Preflight Checklist (2 minutes)

Run this before every Play upload:

1. Build fresh bundle:

```bash
npm run android:bundle
```

1. Confirm the artifact exists:

```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

1. Verify signer fingerprint on the actual `.aab`:

```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab | grep "SHA1"
```

1. Compare against Play's expected upload key SHA1:

```text
DC:94:30:62:0F:31:05:AC:18:27:5E:4F:67:51:79:BC:9B:E6:08:0F
```

1. If mismatch: stop upload, fix `android/key.properties` to point at the correct upload keystore, rebuild, re-check fingerprint.

## Troubleshooting

### Gradle Build Fails with Java Version Error

- Ensure Java 21+ is active: `java -version`
- Use: `source /usr/local/sdkman/bin/sdkman-init.sh`

### "SDK location not found"

- Set `export ANDROID_HOME=/path/to/your/android/sdk`
- Or create `android/local.properties`:

    ```properties
  sdk.dir=/path/to/your/android/sdk
  ```

### Keystore Password Issues

- Make sure the `key.properties` file permissions are restricted: `chmod 600 android/key.properties`

### "Your Android App Bundle is signed with the wrong key"

If Google Play reports a fingerprint mismatch, verify your local signing key before uploading.

Expected (from Play Console error):

```text
SHA1: DC:94:30:62:0F:31:05:AC:18:27:5E:4F:67:51:79:BC:9B:E6:08:0F
```

In this workspace, the current configured release key resolves to:

```text
SHA1: 3E:67:E6:41:E3:41:2F:B9:05:DD:D1:86:DE:86:E3:15:03:ED:2D:C4
```

This mismatch means you are signing with the wrong upload keystore.

Fix path:

1. Update `android/key.properties` to point to the **original upload keystore** whose SHA1 matches Play's expected fingerprint.
2. Rebuild with `npm run android:bundle`.
3. Verify the generated bundle signer fingerprint before upload:

```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab | grep "SHA1"
```

Important:

- Do **not** generate a brand-new keystore for an existing Play app unless you also perform an upload key reset in Play Console.
- If the original upload key is lost, request an **Upload key reset** in Play Console and then use the replacement key consistently in local builds/CI.

### Out of Memory During Build

```bash
export ORG_GRADLE_JVM_ARGS="-Xmx4096m"
./gradlew bundleRelease
```

## Quick Reference: One-Command Build

Once Android SDK is configured locally:

```bash
export ANDROID_HOME=~/Android/sdk
npm run android:bundle
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Verified in This Repository (2026-06-20)

The following release tasks were executed successfully in this workspace:

- `./gradlew :app:assembleRelease`
- `./gradlew :app:bundleRelease`

Verified output artifact:

- `android/app/build/outputs/bundle/release/app-release.aab` (present)

## App Configuration

Your app is configured as:

- **Package ID:** `com.proofyourreality.record`
- **App Name:** Proof
- **Web Assets Root:** `dist/`
- **Min SDK Level:** 24 (Android 7.0)
- **Target SDK Level:** 35 (Android 15)

## Next Steps

1. Download Android SDK locally
2. Configure signing key
3. Run `npm run android:bundle`
4. Upload the `.aab` to Google Play Console

## Files Modified/Created

- ✅ `capacitor.config.ts` — Capacitor configuration
- ✅ `package.json` — Added Android build scripts + Capacitor deps
- ✅ `android/` — Full Gradle Android project (generated)
- ✅ `dist/` — Production web build
