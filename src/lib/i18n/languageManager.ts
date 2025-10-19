/**
 * Language Manager - Central service for managing language state and translations
 */

export interface Language {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
  flag: string;
}

export interface Translations {
  [key: string]: string | Translations;
}

class LanguageManager {
  private static instance: LanguageManager;
  private currentLang: string = 'en';
  private translations: Map<string, Translations> = new Map();

  public supportedLanguages: Language[] = [
    { code: 'en', name: 'English', direction: 'ltr', flag: '🇺🇸' },
    { code: 'zh', name: '中文', direction: 'ltr', flag: '🇨🇳' },
    { code: 'id', name: 'Bahasa Indonesia', direction: 'ltr', flag: '🇮🇩' },
    { code: 'th', name: 'ไทย', direction: 'ltr', flag: '🇹🇭' },
  ];

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }

  public setLanguage(code: string): void {
    this.currentLang = code;
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_language', code);
      document.documentElement.lang = code;
      document.documentElement.dir = this.getLanguageDirection(code);
    }
  }

  public getLanguage(): string {
    return this.currentLang;
  }

  public getLanguageDirection(code: string): 'ltr' | 'rtl' {
    const lang = this.supportedLanguages.find((l) => l.code === code);
    return lang?.direction || 'ltr';
  }

  public async loadTranslations(code: string): Promise<Translations> {
    if (this.translations.has(code)) {
      return this.translations.get(code)!;
    }

    try {
      const translations = await import(`./translations/${code}.json`);
      this.translations.set(code, translations.default);
      return translations.default;
    } catch (error) {
      console.error(`Failed to load translations for ${code}:`, error);
      // Fallback to English
      if (code !== 'en') {
        return this.loadTranslations('en');
      }
      return {};
    }
  }

  public translate(
    key: string,
    translations: Translations,
    params?: Record<string, any>
  ): string {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation missing: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      return Object.entries(params).reduce(
        (str, [key, val]) => str.replace(`{{${key}}}`, String(val)),
        value
      );
    }

    return value;
  }
}

export const languageManager = LanguageManager.getInstance();
export default languageManager;
