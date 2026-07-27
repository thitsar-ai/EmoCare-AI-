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
      title: 'Mira ကို မေးမယ်',
      subtitle: 'အသိပညာ၊ မဟာဗျူဟာနှင့် အမြင်သစ်များ',
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
      title: 'အီမိုနဲ့ စကားပြောမယ်',
      subtitle: 'ခံစားချက်၊ ထောက်ပံ့မှုနှင့် စေတနာရှိရှိ နားထောင်ပေးခြင်း',
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
 * @param {'checkin' | 'journal' | 'insights' | 'settings' | 'home' | 'today' | 'memoryledger'} key
 */
export function getMainMenuLabel(preference, key) {
  const id = normalizeChatLanguage(preference);
  /** @type {Record<string, Record<string, string>>} */
  const map = {
    en: {
      checkin: 'Check-in',
      journal: 'Journal',
      insights: 'Insights',
      settings: 'Settings',
      home: 'Home',
      today: 'My Day',
      memoryledger: 'Memory Ledger',
    },
    my: {
      checkin: 'Check-in',
      journal: 'ဂျာနယ်',
      insights: 'Insights',
      settings: 'ဆက်တင်',
      home: 'ပင်မ',
      today: 'ငါ့နေ့',
      memoryledger: 'မှတ်ဉာဏ်စာရင်း',
    },
    es: {
      checkin: 'Check-in',
      journal: 'Diario',
      insights: 'Perspectivas',
      settings: 'Ajustes',
      home: 'Inicio',
      today: 'Mi día',
      memoryledger: 'Registro de memorias',
    },
    id: {
      checkin: 'Check-in',
      journal: 'Jurnal',
      insights: 'Wawasan',
      settings: 'Pengaturan',
      home: 'Beranda',
      today: 'Hariku',
      memoryledger: 'Catatan memori',
    },
    'pt-BR': {
      checkin: 'Check-in',
      journal: 'Diário',
      insights: 'Insights',
      settings: 'Configurações',
      home: 'Início',
      today: 'Meu dia',
      memoryledger: 'Registro de memórias',
    },
    fr: {
      checkin: 'Bilan',
      journal: 'Journal',
      insights: 'Aperçus',
      settings: 'Réglages',
      home: 'Accueil',
      today: 'Ma journée',
      memoryledger: 'Registre des souvenirs',
    },
  };
  return (map[id] || map.en)[key] || (map.en)[key];
}
