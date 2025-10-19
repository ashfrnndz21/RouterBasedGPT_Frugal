# Design Document

## Overview

The multilingual text support feature enables FrugalAIGpt to provide a fully localized experience where users can interact with the AI in their preferred language. The system uses Ollama models for language processing, browser localStorage for preference persistence, and a comprehensive i18n (internationalization) system for UI localization.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Language   │  │  Chat Input  │  │   Response   │      │
│  │   Selector   │  │   (i18n)     │  │   Display    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Language Context Layer                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Language Manager (localStorage + React Context)     │  │
│  │  - Current language state                            │  │
│  │  - Translation loader                                │  │
│  │  - Locale formatter                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Ollama     │  │    Search    │  │  Translation │      │
│  │   LLM API    │  │   API (i18n) │  │    Service   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
src/
├── lib/
│   ├── i18n/
│   │   ├── index.ts                 # Main i18n configuration
│   │   ├── languageManager.ts       # Language state management
│   │   ├── translations/            # Translation files
│   │   │   ├── en.json
│   │   │   ├── es.json
│   │   │   ├── fr.json
│   │   │   ├── de.json
│   │   │   ├── zh.json
│   │   │   ├── ja.json
│   │   │   ├── th.json
│   │   │   └── ar.json
│   │   └── localeFormatter.ts       # Date/number formatting
│   └── contexts/
│       └── LanguageContext.tsx      # React context for language
├── components/
│   ├── LanguageSelector.tsx         # Language dropdown component
│   └── LocalizedText.tsx            # Translation wrapper component
└── hooks/
    └── useTranslation.ts            # Translation hook
```

## Components and Interfaces

### 1. Language Manager

**Purpose:** Central service for managing language state and translations

**Interface:**
```typescript
interface LanguageManager {
  currentLanguage: string;
  supportedLanguages: Language[];
  
  setLanguage(languageCode: string): void;
  getLanguage(): string;
  loadTranslations(languageCode: string): Promise<Translations>;
  translate(key: string, params?: Record<string, any>): string;
}

interface Language {
  code: string;           // ISO 639-1 code (e.g., 'en', 'es')
  name: string;           // Native name (e.g., 'English', 'Español')
  direction: 'ltr' | 'rtl';
  flag: string;           // Emoji flag
}

interface Translations {
  [key: string]: string | Translations;
}
```

**Implementation:**
```typescript
// src/lib/i18n/languageManager.ts
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
  
  setLanguage(code: string): void {
    this.currentLang = code;
    localStorage.setItem('user_language', code);
    document.documentElement.lang = code;
    document.documentElement.dir = this.getLanguageDirection(code);
  }
  
  async loadTranslations(code: string): Promise<Translations> {
    if (this.translations.has(code)) {
      return this.translations.get(code)!;
    }
    
    const translations = await import(`./translations/${code}.json`);
    this.translations.set(code, translations.default);
    return translations.default;
  }
}
```

### 2. Language Context

**Purpose:** Provide language state to all React components

**Interface:**
```typescript
interface LanguageContextValue {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
  direction: 'ltr' | 'rtl';
  isLoading: boolean;
}
```

**Implementation:**
```typescript
// src/lib/contexts/LanguageContext.tsx
export const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>('en');
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const savedLang = localStorage.getItem('user_language') || 
                      navigator.language.split('-')[0] || 
                      'en';
    loadLanguage(savedLang);
  }, []);
  
  const loadLanguage = async (code: string) => {
    setIsLoading(true);
    const trans = await languageManager.loadTranslations(code);
    setTranslations(trans);
    setLanguageState(code);
    languageManager.setLanguage(code);
    setIsLoading(false);
  };
  
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation missing: ${key}`);
        return key;
      }
    }
    
    if (params) {
      return Object.entries(params).reduce(
        (str, [key, val]) => str.replace(`{{${key}}}`, String(val)),
        value
      );
    }
    
    return value;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage: loadLanguage, t, direction, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

### 3. Language Selector Component

**Purpose:** UI component for selecting language

**Implementation:**
```typescript
// src/components/LanguageSelector.tsx
export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentLang = languageManager.supportedLanguages.find(l => l.code === language);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="text-xl">{currentLang?.flag}</span>
        <span>{currentLang?.name}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          {languageManager.supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="text-xl">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 4. Translation Hook

**Purpose:** Easy access to translation function in components

**Implementation:**
```typescript
// src/hooks/useTranslation.ts
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  
  return {
    t: context.t,
    language: context.language,
    direction: context.direction,
  };
};
```

## Data Models

### Translation File Structure

```json
{
  "common": {
    "search": "Search",
    "settings": "Settings",
    "loading": "Loading...",
    "error": "Error"
  },
  "chat": {
    "placeholder": "Ask anything...",
    "send": "Send",
    "clear": "Clear chat",
    "newChat": "New chat"
  },
  "settings": {
    "language": "Language",
    "theme": "Theme",
    "preferences": "Preferences"
  },
  "errors": {
    "networkError": "Network error. Please try again.",
    "llmError": "Failed to get response from AI."
  }
}
```

### Language Preference Storage

```typescript
// localStorage structure
{
  "user_language": "es",  // ISO 639-1 code
  "language_timestamp": 1234567890  // Last updated timestamp
}
```

## LLM Integration

### Multilingual System Prompts

**Purpose:** Instruct Ollama models to respond in the target language

**Implementation:**
```typescript
// src/lib/prompts/multilingualPrompt.ts
export const getSystemPrompt = (language: string, mode: string): string => {
  const languageInstructions = {
    en: "You are a helpful AI assistant. Respond in English.",
    es: "Eres un asistente de IA útil. Responde en español.",
    fr: "Vous êtes un assistant IA utile. Répondez en français.",
    de: "Sie sind ein hilfreicher KI-Assistent. Antworten Sie auf Deutsch.",
    zh: "你是一个有用的AI助手。用中文回答。",
    ja: "あなたは役立つAIアシスタントです。日本語で答えてください。",
    th: "คุณเป็นผู้ช่วย AI ที่มีประโยชน์ ตอบเป็นภาษาไทย",
    ar: "أنت مساعد ذكاء اصطناعي مفيد. أجب باللغة العربية.",
  };
  
  const basePrompt = languageInstructions[language] || languageInstructions.en;
  
  // Add mode-specific instructions
  const modePrompts = {
    webSearch: getWebSearchPrompt(language),
    academic: getAcademicPrompt(language),
    writing: getWritingPrompt(language),
  };
  
  return `${basePrompt}\n\n${modePrompts[mode] || ''}`;
};
```

### API Request Modification

```typescript
// src/lib/api/chat.ts
export const sendChatMessage = async (
  message: string,
  language: string,
  mode: string
) => {
  const systemPrompt = getSystemPrompt(language, mode);
  
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      stream: true,
    }),
  });
  
  return response;
};
```

## Search Integration

### Multilingual Search Parameters

```typescript
// src/lib/serperSearch.ts
export const searchSerper = async (
  query: string,
  options: {
    language: string;
    country?: string;
  }
) => {
  const languageToCountry = {
    en: 'us',
    es: 'es',
    fr: 'fr',
    de: 'de',
    zh: 'cn',
    ja: 'jp',
    th: 'th',
    ar: 'sa',
  };
  
  const params = {
    q: query,
    hl: options.language,  // Interface language
    gl: options.country || languageToCountry[options.language],  // Geolocation
    num: 10,
  };
  
  // API call with language parameters
};
```

## Error Handling

### Language Fallback Strategy

```typescript
// src/lib/i18n/errorHandler.ts
export const handleLanguageError = (
  error: Error,
  language: string
): string => {
  console.error(`Language error for ${language}:`, error);
  
  // Fallback chain: requested language -> English -> key
  try {
    return languageManager.translate(error.message, language);
  } catch {
    try {
      return languageManager.translate(error.message, 'en');
    } catch {
      return error.message;
    }
  }
};
```

## Testing Strategy

### Unit Tests
- Language manager initialization
- Translation key lookup
- Fallback behavior
- localStorage persistence

### Integration Tests
- Language switching flow
- LLM prompt generation in different languages
- Search API with language parameters
- UI component rendering with translations

### E2E Tests
- Complete user flow: select language → type query → receive response
- Language persistence across page reloads
- RTL language rendering
- Error handling with unsupported languages

## Performance Considerations

1. **Lazy Loading**: Load translation files on-demand
2. **Caching**: Cache loaded translations in memory
3. **Bundle Size**: Keep translation files separate from main bundle
4. **Preloading**: Preload user's preferred language during app initialization
5. **Memoization**: Memoize translation function results for repeated keys

## Security Considerations

1. **Input Validation**: Sanitize user input in all languages
2. **XSS Prevention**: Escape translated strings before rendering
3. **Language Code Validation**: Validate language codes against whitelist
4. **localStorage Security**: No sensitive data in language preferences
