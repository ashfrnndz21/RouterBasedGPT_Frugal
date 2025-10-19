'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { languageManager, Translations } from '../i18n/languageManager';

interface LanguageContextValue {
  language: string;
  setLanguage: (code: string) => Promise<void>;
  t: (key: string, params?: Record<string, any>) => string;
  direction: 'ltr' | 'rtl';
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');

  useEffect(() => {
    const initLanguage = async () => {
      let savedLang = 'en';
      
      if (typeof window !== 'undefined') {
        savedLang = localStorage.getItem('user_language') || 
                    navigator.language.split('-')[0] || 
                    'en';
      }
      
      // Validate language is supported
      const supported = languageManager.supportedLanguages.find(l => l.code === savedLang);
      if (!supported) {
        savedLang = 'en';
      }
      
      await loadLanguage(savedLang);
    };

    initLanguage();
  }, []);

  const loadLanguage = async (code: string) => {
    setIsLoading(true);
    try {
      const trans = await languageManager.loadTranslations(code);
      setTranslations(trans);
      setLanguageState(code);
      setDirection(languageManager.getLanguageDirection(code));
      languageManager.setLanguage(code);
    } catch (error) {
      console.error('Failed to load language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const t = (key: string, params?: Record<string, any>): string => {
    return languageManager.translate(key, translations, params);
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        setLanguage: loadLanguage, 
        t, 
        direction, 
        isLoading 
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  
  return context;
};

export default LanguageContext;
