/**
 * Expo config plugin for the Khanqah live-broadcast feature.
 * Adds Android permissions/foreground-service declaration and the iOS
 * UIBackgroundModes + microphone-usage strings. The native code itself
 * lives in modules/broadcast-service.
 */
const {
  withAndroidManifest,
  withInfoPlist,
  AndroidConfig,
} = require('@expo/config-plugins');

const ANDROID_PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
];

const withBroadcastNative = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    AndroidConfig.Permissions.ensurePermissions(cfg.modResults, ANDROID_PERMISSIONS);
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    plist.NSMicrophoneUsageDescription =
      plist.NSMicrophoneUsageDescription ||
      'Khanqah uses your microphone so admins can broadcast live bayaans.';
    const modes = new Set(plist.UIBackgroundModes || []);
    modes.add('audio');
    plist.UIBackgroundModes = Array.from(modes);
    return cfg;
  });

  return config;
};

module.exports = withBroadcastNative;
