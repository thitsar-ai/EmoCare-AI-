/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...require('./app.json').expo,
    extra: {
      emocareApiUrl: process.env.EXPO_PUBLIC_EMOCARE_API_URL ?? '',
      emocareApiSecret: process.env.EXPO_PUBLIC_EMOCARE_API_SECRET ?? '',
    },
  },
};
