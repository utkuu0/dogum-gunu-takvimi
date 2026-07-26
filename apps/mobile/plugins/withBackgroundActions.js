/**
 * react-native-background-actions kütüphanesinin gerektirdiği Android manifest
 * ayarlarını (izinler + foreground service tipi) prebuild sırasında ekler.
 * Kütüphanenin kendi Expo config plugin'i yok, bu yüzden elle uyguluyoruz.
 */
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const SERVICE_NAME = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';

const REQUIRED_PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
  'android.permission.WAKE_LOCK',
  'android.permission.POST_NOTIFICATIONS',
];

function withBackgroundActions(config) {
  config = AndroidConfig.Permissions.withPermissions(config, REQUIRED_PERMISSIONS);

  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    mainApplication.service = mainApplication.service || [];
    let service = mainApplication.service.find(
      (item) => item.$['android:name'] === SERVICE_NAME
    );
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } };
      mainApplication.service.push(service);
    }
    service.$['android:foregroundServiceType'] = 'dataSync';

    return config;
  });
}

module.exports = withBackgroundActions;
