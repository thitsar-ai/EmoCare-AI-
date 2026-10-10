# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Cloud Agent

Node 22 is already on the image. `npm ci` installs the lockfile. The web script also needs the Expo SDK 54 web packages, which are not in that lockfile:

```bash
CI=1 npx expo install react-dom react-native-web @expo/metro-runtime
```

`npx tsc --noEmit` typechecks. These checks pass without provider keys: `npm run test:onboarding`, `npm run test:nav`, `npm run test:keyboard`, `npm run test:myanmar-text`, and `npm run test:eos`. `npm run test:smoke` currently fails on existing copy drift in identity, reminders, ui-language, and localization.

Web dev server (http://localhost:8081):

```bash
CI=1 npx expo start --web --host localhost --port 8081
```

Sanctuary API (`node server/index.mjs`, port 3001): `GET /health` is public. `npm run api-server` requires a gitignored `server/.env`. Chat, voice, and search need `EMOCARE_API_SECRET` plus `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, and `TAVILY_API_KEY` in that file. Without the secret, every route except `/health` fails closed.
