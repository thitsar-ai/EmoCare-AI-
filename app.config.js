/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...require('./app.json').expo,
    extra: {
      anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '',
      tavilyApiKey: process.env.EXPO_PUBLIC_TAVILY_API_KEY ?? '',
      elevenLabsApiKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '',
      elevenLabsVoiceId: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? '',
    },
  },
};
