import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import th from './locales/th.json';

export type LanguageCode = 'EN' | 'TH' | 'DUAL';

const savedLang = (localStorage.getItem('app_language') || 'TH').toUpperCase();
const initialLang = savedLang === 'EN' ? 'EN' : 'TH';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      th: { translation: th },
      EN: { translation: en },
      TH: { translation: th }
    },
    lng: initialLang.toLowerCase(),
    fallbackLng: 'th',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
