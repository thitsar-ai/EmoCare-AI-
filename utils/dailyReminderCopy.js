/**
 * Localized Daily Reminder notification + Settings UI copy (no React Native imports).
 */

import { normalizeChatLanguage } from './chatLanguage.js';

export const DAILY_REMINDER_DATA_KIND = 'daily-reminder';

/** Localization key family: dailyReminderNotification* */
export const DAILY_REMINDER_COPY_EN = {
  title: 'A gentle moment for you',
  body: 'Take a moment to check in with yourself today.',
};

/** @type {Record<'en'|'my'|'id'|'es'|'pt-BR'|'fr', { title: string, body: string }>} */
export const DAILY_REMINDER_COPY_BY_LOCALE = {
  en: DAILY_REMINDER_COPY_EN,
  my: {
    title: 'ကိုယ့်အတွက် နူးညံ့တဲ့ အချိန်လေး',
    body: 'ဒီနေ့ ကိုယ့်စိတ်ကို ခဏလောက် ပြန်လည်သတိထားကြည့်ရအောင်နော်။',
  },
  id: {
    title: 'Momen lembut untuk Anda',
    body: 'Luangkan waktu sejenak untuk memeriksa perasaan Anda hari ini.',
  },
  'pt-BR': {
    title: 'Um momento de carinho para você',
    body: 'Reserve um momento para perceber como você está se sentindo hoje.',
  },
  fr: {
    title: 'Un moment de douceur pour vous',
    body: 'Prenez un instant pour faire le point sur ce que vous ressentez aujourd’hui.',
  },
  es: {
    title: 'Un momento de calma para ti',
    body: 'Tómate un momento para conectar con cómo te sientes hoy.',
  },
};

/** Sheet / Settings UI copy (key family: dailyReminder*). */
export const DAILY_REMINDER_UI_BY_LOCALE = {
  en: {
    sheetTitle: 'Daily Reminder',
    sheetHint: 'Choose a gentle time for EmoCare to remind you to check in with yourself.',
    toggleLabel: 'Reminders on',
    timeLabel: 'Reminder time',
    cancel: 'Cancel',
    save: 'Save',
    settingsLabel: 'Daily reminders',
    settingsHint: 'Choose a gentle time for a local daily check-in reminder on this device.',
    settingsOff: 'Off',
    settingsOnPrefix: 'On',
    deniedTitle: 'Notifications unavailable',
    deniedBody:
      'To receive daily reminders, allow notifications for EmoCare in your device Settings.',
    openSettings: 'Open Settings',
  },
  my: {
    sheetTitle: 'နေ့စဉ် သတိပေးချက်',
    sheetHint: 'EmoCare က ကိုယ့်ကိုယ်ကို ပြန်လည်သတိထားဖို့ နူးညံ့တဲ့ အချိန်တစ်ခု ရွေးပါရှင်။',
    toggleLabel: 'သတိပေးချက် ဖွင့်ထားသည်',
    timeLabel: 'သတိပေးချိန်',
    cancel: 'ပယ်ဖျက်',
    save: 'သိမ်းမည်',
    settingsLabel: 'အသိပေးချက် ဆက်တင်များ',
    settingsHint: 'ဒီစက်ပေါ်မှာ တစ်နေ့တစ်ကြိမ် နူးညံ့တဲ့ စိတ်စစ်ဆေးမှု သတိပေးချက်အတွက် အချိန်ရွေးပါ။',
    settingsOff: 'ပိတ်',
    settingsOnPrefix: 'ဖွင့်',
    deniedTitle: 'အကြောင်းကြားချက် မရနိုင်ပါ',
    deniedBody:
      'နေ့စဉ် သတိပေးချက် ရရန် စက် Settings မှာ EmoCare အတွက် အကြောင်းကြားချက်များကို ခွင့်ပြုပေးပါရှင်။',
    openSettings: 'Settings ဖွင့်မည်',
  },
  id: {
    sheetTitle: 'Pengingat harian',
    sheetHint: 'Pilih waktu yang lembut agar EmoCare mengingatkan Anda untuk memeriksa diri.',
    toggleLabel: 'Pengingat aktif',
    timeLabel: 'Waktu pengingat',
    cancel: 'Batal',
    save: 'Simpan',
    settingsLabel: 'Pengingat harian',
    settingsHint: 'Pilih waktu lembut untuk pengingat check-in harian lokal di perangkat ini.',
    settingsOff: 'Mati',
    settingsOnPrefix: 'Aktif',
    deniedTitle: 'Notifikasi tidak tersedia',
    deniedBody:
      'Untuk menerima pengingat harian, izinkan notifikasi untuk EmoCare di Pengaturan perangkat Anda.',
    openSettings: 'Buka Pengaturan',
  },
  'pt-BR': {
    sheetTitle: 'Lembrete diário',
    sheetHint: 'Escolha um horário gentil para o EmoCare lembrar você de fazer um check-in consigo.',
    toggleLabel: 'Lembretes ativos',
    timeLabel: 'Horário do lembrete',
    cancel: 'Cancelar',
    save: 'Salvar',
    settingsLabel: 'Lembretes diários',
    settingsHint: 'Escolha um horário gentil para um lembrete local diário neste dispositivo.',
    settingsOff: 'Desligado',
    settingsOnPrefix: 'Ligado',
    deniedTitle: 'Notificações indisponíveis',
    deniedBody:
      'Para receber lembretes diários, permita notificações do EmoCare nas Configurações do dispositivo.',
    openSettings: 'Abrir Configurações',
  },
  fr: {
    sheetTitle: 'Rappel quotidien',
    sheetHint: 'Choisissez un moment doux pour qu’EmoCare vous rappelle de faire le point avec vous-même.',
    toggleLabel: 'Rappels activés',
    timeLabel: 'Heure du rappel',
    cancel: 'Annuler',
    save: 'Enregistrer',
    settingsLabel: 'Rappels quotidiens',
    settingsHint: 'Choisissez un moment doux pour un rappel local quotidien sur cet appareil.',
    settingsOff: 'Désactivé',
    settingsOnPrefix: 'Activé',
    deniedTitle: 'Notifications indisponibles',
    deniedBody:
      'Pour recevoir des rappels quotidiens, autorisez les notifications d’EmoCare dans les Réglages de votre appareil.',
    openSettings: 'Ouvrir Réglages',
  },
  es: {
    sheetTitle: 'Recordatorio diario',
    sheetHint: 'Elige un momento suave para que EmoCare te recuerde hacer un check-in contigo.',
    toggleLabel: 'Recordatorios activos',
    timeLabel: 'Hora del recordatorio',
    cancel: 'Cancelar',
    save: 'Guardar',
    settingsLabel: 'Recordatorios diarios',
    settingsHint: 'Elige un momento suave para un recordatorio local diario en este dispositivo.',
    settingsOff: 'Desactivado',
    settingsOnPrefix: 'Activado',
    deniedTitle: 'Notificaciones no disponibles',
    deniedBody:
      'Para recibir recordatorios diarios, permite las notificaciones de EmoCare en Ajustes del dispositivo.',
    openSettings: 'Abrir Ajustes',
  },
};

/**
 * @param {string | undefined} preference chatLanguage preference
 * @returns {{ title: string, body: string }}
 */
export function getDailyReminderCopy(preference) {
  const id = normalizeChatLanguage(preference);
  const locale = id === 'auto' ? 'en' : id;
  return DAILY_REMINDER_COPY_BY_LOCALE[locale] || DAILY_REMINDER_COPY_EN;
}

/**
 * @param {string | undefined} preference
 */
export function getDailyReminderUiCopy(preference) {
  const id = normalizeChatLanguage(preference);
  const locale = id === 'auto' ? 'en' : id;
  return DAILY_REMINDER_UI_BY_LOCALE[locale] || DAILY_REMINDER_UI_BY_LOCALE.en;
}

/**
 * @param {{ notification?: { request?: { content?: { data?: unknown } } } } | null | undefined} response
 */
export function isDailyReminderResponse(response) {
  const data = response?.notification?.request?.content?.data;
  if (!data || typeof data !== 'object') return false;
  return /** @type {{ kind?: string }} */ (data).kind === DAILY_REMINDER_DATA_KIND;
}
