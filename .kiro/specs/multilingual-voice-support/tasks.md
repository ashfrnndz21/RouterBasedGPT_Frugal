# Implementation Plan - MVP Demo (4 Languages)

- [x] 1. Create minimal language manager and context
  - Create simple language manager with 4 languages (English, Chinese, Indonesian, Thai)
  - Implement React Context for language state
  - Add localStorage persistence
  - _Requirements: 1.2, 1.3, 5.1_

- [x] 2. Create translation files for demo languages
  - Create minimal translation files with essential UI strings
  - Focus on chat interface and key navigation elements
  - _Requirements: 9.1, 9.2_

- [x] 2.1 Create English translation file (baseline)
  - Write en.json with core translation keys
  - Include: chat placeholder, send button, settings, common actions
  - _Requirements: 9.1_

- [x] 2.2 Create Chinese translation file
  - Translate core keys to Simplified Chinese (中文)
  - _Requirements: 9.1, 9.2_

- [x] 2.3 Create Indonesian translation file
  - Translate core keys to Bahasa Indonesia
  - _Requirements: 9.1, 9.2_

- [x] 2.4 Create Thai translation file
  - Translate core keys to Thai (ไทย)
  - _Requirements: 9.1, 9.2_

- [x] 3. Build simple Language Selector component
  - Create dropdown with 4 language options
  - Show flag emoji and native name
  - Add to navbar for easy access
  - _Requirements: 1.1, 1.2_

- [x] 4. Create multilingual system prompts for Ollama
  - Write system prompts in English, Chinese, Indonesian, and Thai
  - Integrate into chat API requests
  - _Requirements: 3.1, 3.2_

- [x] 4.1 Create prompt templates for each language
  - English: "You are a helpful AI assistant. Respond in English."
  - Chinese: "你是一个有用的AI助手。用中文回答。"
  - Indonesian: "Anda adalah asisten AI yang membantu. Jawab dalam Bahasa Indonesia."
  - Thai: "คุณเป็นผู้ช่วย AI ที่มีประโยชน์ ตอบเป็นภาษาไทย"
  - _Requirements: 3.1_

- [x] 4.2 Update chat API with language parameter
  - Pass current language to Ollama API
  - Prepend language-specific system prompt
  - _Requirements: 3.1, 3.2_

- [ ] 5. Localize core UI components
  - Update chat input placeholder
  - Update main navigation items
  - Update common buttons (Send, Clear, Settings)
  - _Requirements: 9.2, 9.3_

- [ ] 5.1 Localize chat interface
  - Replace "Ask anything..." with translation key
  - Replace "Send" button text
  - Replace "Clear chat" text
  - _Requirements: 9.2_

- [ ] 5.2 Localize navbar
  - Replace navigation item labels
  - Update tooltips
  - _Requirements: 9.2_

- [ ] 6. Add simple translation hook
  - Create useTranslation hook for components
  - Implement basic t() function for key lookup
  - Add fallback to English for missing keys
  - _Requirements: 9.4, 8.4_

- [x] 7. Wrap app with LanguageProvider
  - Add LanguageProvider to root layout
  - Initialize with saved language or browser default
  - _Requirements: 1.3, 5.3_

- [ ] 8. Test language switching
  - Verify language selector works
  - Test LLM responses in each language
  - Verify UI updates when language changes
  - _Requirements: 1.5, 3.3_
