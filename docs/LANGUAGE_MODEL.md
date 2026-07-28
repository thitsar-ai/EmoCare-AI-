# EmoCare language model

| Layer | Setting key | Where set | Behavior |
|-------|-------------|-----------|----------|
| **App UI chrome** | `chatLanguage` | Settings → Emo language | Labels, sheets, tabs, Settings, onboarding review. `auto` → English UI. |
| **Daily reminder notification** | `chatLanguage` | Same | Title/body rescheduled when language changes. |
| **Emo Talk replies** | `chatLanguage` | Settings or Talk language sheet | Compose locale; Auto detects from the user’s message. |
| **Mira replies + Mira placeholder** | `miraLanguage` | Mira globe / onboarding | Independent of Emo language. |

`UiCopyProvider` hydrates from `chatLanguage` and updates immediately when Settings changes Emo language.
