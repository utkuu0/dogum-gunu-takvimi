// app.json'daki statik config'i devralır; sadece google-services.json yolunu
// EAS'ta dosya ortam değişkeninden (GOOGLE_SERVICES_JSON), yerelde repo dışı dosyadan okur.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
