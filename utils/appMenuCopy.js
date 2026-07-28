/**
 * Localized main-menu labels. Uses Emo Talk language preference as the app menu locale.
 */

import { normalizeChatLanguage } from './chatLanguage.js';

/** @typedef {import('./chatLanguage.js').ChatLanguageId} ChatLanguageId */

/**
 * @param {ChatLanguageId | string | undefined} preference
 */
export function getAskMiraMenuCopy(preference) {
  const id = normalizeChatLanguage(preference);
  /** @type {Record<string, { title: string; subtitle: string }>} */
  const map = {
    en: {
      title: 'Ask Mira',
      subtitle: 'Knowledge, strategy, and wise perspective',
    },
    my: {
      title: 'အတွင်းစိတ် လမ်းညွှန်မှု',
      subtitle: 'အသိပညာနှင့် အမြင်သစ်များ',
    },
    es: {
      title: 'Preguntar a Mira',
      subtitle: 'Conocimiento, estrategia y una perspectiva sabia',
    },
    id: {
      title: 'Tanya Mira',
      subtitle: 'Pengetahuan, strategi, dan sudut pandang bijak',
    },
    'pt-BR': {
      title: 'Perguntar à Mira',
      subtitle: 'Conhecimento, estratégia e uma perspectiva sábia',
    },
    fr: {
      title: 'Demander à Mira',
      subtitle: 'Connaissances, stratégie et perspective éclairée',
    },
  };
  return map[id] || map.en;
}

/**
 * Talk to Emo + Ask Mira — the primary companion pair in the menu.
 * @param {ChatLanguageId | string | undefined} preference
 */
export function getTalkToEmoMenuCopy(preference) {
  const id = normalizeChatLanguage(preference);
  /** @type {Record<string, { title: string; subtitle: string }>} */
  const map = {
    en: {
      title: 'Talk to Emo',
      subtitle: 'Feelings, support, and a caring presence',
    },
    my: {
      title: 'Emo နဲ့ စကားပြောမယ်',
      subtitle: 'ခံစားချက်နှင့် နားထောင်ပေးခြင်း',
    },
    es: {
      title: 'Hablar con Emo',
      subtitle: 'Emociones, apoyo y una presencia cariñosa',
    },
    id: {
      title: 'Ngobrol dengan Emo',
      subtitle: 'Perasaan, dukungan, dan kehadiran yang peduli',
    },
    'pt-BR': {
      title: 'Conversar com a Emo',
      subtitle: 'Sentimentos, apoio e uma presença acolhedora',
    },
    fr: {
      title: 'Parler avec Emo',
      subtitle: 'Émotions, soutien et une présence bienveillante',
    },
  };
  return map[id] || map.en;
}

/**
 * @param {ChatLanguageId | string | undefined} preference
 */
export function getTalkToEmoMenuLabel(preference) {
  return getTalkToEmoMenuCopy(preference).title;
}

/**
 * @param {ChatLanguageId | string | undefined} preference
 * @param {'checkin' | 'journal' | 'insights' | 'settings' | 'home' | 'today' | 'memoryledger' | 'welcome' | 'privacy' | 'aboutyou' | 'profile'} key
 */
export function getMainMenuLabel(preference, key) {
  const id = normalizeChatLanguage(preference);
  /** @type {Record<string, Record<string, string>>} */
  const map = {
    en: {
      checkin: 'Check-in',
      journal: 'My Journal',
      insights: 'Insights',
      settings: 'Settings',
      home: 'Home',
      today: 'My Day',
      memoryledger: 'Memory Ledger',
      welcome: 'Welcome',
      privacy: 'Privacy',
      aboutyou: 'Tell Me About You',
      profile: 'Your Name & Profile',
    },
    my: {
      checkin: 'ခံစားချက် မှတ်မယ်',
      journal: 'ရင်ဖွင့်မှတ်တမ်း',
      insights: 'ထိုးထွင်းသိမြင်မှုများ',
      settings: 'ဆက်တင်များ',
      home: 'စိတ်နားခိုရာ',
      today: 'ယနေ့အတွက်',
      memoryledger: 'မှတ်သားထားမှုများ',
      welcome: 'ကြိုဆိုပါတယ်',
      privacy: 'ကိုယ်ရေးလုံခြုံမှု',
      aboutyou: 'သင့်အကြောင်း',
      profile: 'အမည်နှင့် ပရိုဖိုင်',
    },
    es: {
      checkin: 'Check-in',
      journal: 'Mi diario',
      insights: 'Perspectivas',
      settings: 'Ajustes',
      home: 'Inicio',
      today: 'Mi día',
      memoryledger: 'Registro de memorias',
      welcome: 'Bienvenida',
      privacy: 'Privacidad',
      aboutyou: 'Cuéntame sobre ti',
      profile: 'Tu nombre y perfil',
    },
    id: {
      checkin: 'Check-in',
      journal: 'Jurnal saya',
      insights: 'Wawasan',
      settings: 'Pengaturan',
      home: 'Beranda',
      today: 'Hariku',
      memoryledger: 'Catatan memori',
      welcome: 'Selamat datang',
      privacy: 'Privasi',
      aboutyou: 'Ceritakan tentang diri Anda',
      profile: 'Nama & profil Anda',
    },
    'pt-BR': {
      checkin: 'Check-in',
      journal: 'Meu diário',
      insights: 'Insights',
      settings: 'Configurações',
      home: 'Início',
      today: 'Meu dia',
      memoryledger: 'Registro de memórias',
      welcome: 'Boas-vindas',
      privacy: 'Privacidade',
      aboutyou: 'Fale sobre você',
      profile: 'Seu nome e perfil',
    },
    fr: {
      checkin: 'Bilan',
      journal: 'Mon journal',
      insights: 'Aperçus',
      settings: 'Réglages',
      home: 'Accueil',
      today: 'Ma journée',
      memoryledger: 'Registre des souvenirs',
      welcome: 'Bienvenue',
      privacy: 'Confidentialité',
      aboutyou: 'Parlez-moi de vous',
      profile: 'Votre nom et profil',
    },
  };
  return (map[id] || map.en)[key] || map.en[key];
}
