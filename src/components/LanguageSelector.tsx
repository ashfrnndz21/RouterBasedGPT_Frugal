'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { languageManager } from '@/lib/i18n/languageManager';
import { Globe } from 'lucide-react';

export const LanguageSelector = ({ compact = false }: { compact?: boolean }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languageManager.supportedLanguages.find(
    (l) => l.code === language
  );

  const handleLanguageChange = async (code: string) => {
    await setLanguage(code);
    setIsOpen(false);
  };

  if (compact) {
    // Compact version for sidebar
    return (
      <>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title={`Language: ${currentLang?.name}`}
        >
          <span className="text-2xl">{currentLang?.flag}</span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[90]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown - positioned fixed to avoid overflow issues */}
            <div className="fixed left-24 bottom-20 w-56 bg-white dark:bg-dark-secondary rounded-lg shadow-xl border border-light-200 dark:border-dark-200 z-[100]">
              <div className="py-2">
                {languageManager.supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-light-secondary dark:hover:bg-dark-primary transition-colors ${
                      language === lang.code
                        ? 'bg-light-secondary dark:bg-dark-primary'
                        : ''
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                    {language === lang.code && (
                      <span className="ml-auto text-xs text-green-600 dark:text-green-400">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Full version for navbar
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
        title="Select Language"
      >
        <Globe size={18} />
        <span className="text-lg">{currentLang?.flag}</span>
        <span className="hidden sm:inline text-sm">{currentLang?.name}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-secondary rounded-lg shadow-lg border border-light-200 dark:border-dark-200 z-50">
            <div className="py-2">
              {languageManager.supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-light-secondary dark:hover:bg-dark-primary transition-colors ${
                    language === lang.code
                      ? 'bg-light-secondary dark:bg-dark-primary'
                      : ''
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  {language === lang.code && (
                    <span className="ml-auto text-xs text-green-600 dark:text-green-400">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
