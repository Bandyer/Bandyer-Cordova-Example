# Bandyer Cordova Plugin Example

## How to setup the example app
Run the following commands to initialize the example app dependencies
```bash
npm i
cordova prepare
```

Edit the configuration variables in the config.js in [www/js/config.js](www/js/config.js) with the provided information from us.

N.B. firebaseProjectId is your own Firebase project identifier used for android notification demo.

## How to run the example app
```bash
cordova run android
cordova run ios
```

Problems & Solutions

- Gradle version too low when using cordova android 8?
To fix this problem run the following command <b>before cordova run android</b>
```bash
export CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL=https://services.gradle.org/distributions/gradle-5.3-bin.zip
```
```