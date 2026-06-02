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

## What's Missing (Requires Local Setup)

The Android SDK is not available in this container. To generate the `.aab` file locally:

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
```
android/app/build/outputs/bundle/release/app-release.aab
```

Upload this file to [Google Play Console](https://play.google.com/console).

## Troubleshooting

### Gradle Build Fails with Java Version Error
- Ensure Java 21+ is active: `java -version`
- Use: `source /usr/local/sdkman/bin/sdkman-init.sh`

### "SDK location not found"
- Set `export ANDROID_HOME=/path/to/your/android/sdk`
- Or create `android/local.properties`:
  ```
  sdk.dir=/path/to/your/android/sdk
  ```

### Keystore Password Issues
- Make sure the `key.properties` file permissions are restricted: `chmod 600 android/key.properties`

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
