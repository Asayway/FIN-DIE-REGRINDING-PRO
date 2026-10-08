import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from './config';
import { useTranslation as useReactI18nTranslation } from 'react-i18next';
import { storageService } from '../services/storageService';

export type LanguageCode = 'EN' | 'TH' | 'DUAL';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useReactI18nTranslation();
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('app_language');
    if (saved && (saved === 'TH' || saved === 'EN')) {
      return saved as LanguageCode;
    }
    const settings = storageService.getSettings();
    return settings.language === 'EN' ? 'EN' : 'TH';
  });

  const setLanguage = (lang: LanguageCode) => {
    const validLang = lang === 'DUAL' ? 'EN' : lang;
    setLanguageState(validLang);
    localStorage.setItem('app_language', validLang);
    i18n.changeLanguage(validLang.toLowerCase());

    // Sync with system settings in storageService
    const currentSettings = storageService.getSettings();
    if (currentSettings.language !== validLang) {
      storageService.saveSettings({ ...currentSettings, language: validLang });
    }
  };

  useEffect(() => {
    i18n.changeLanguage(language.toLowerCase());
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'TH',
      setLanguage: () => {},
      t: (key: string, options?: any) => options?.defaultValue || key
    };
  }
  return context;
};

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context) {
    return {
      t: context.t,
      i18n: {
        changeLanguage: context.setLanguage,
        language: context.language
      }
    };
  }
  // Fallback to react-i18next if context is missing
  return useReactI18nTranslation();
}
