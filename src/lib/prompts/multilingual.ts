/**
 * Multilingual System Prompts
 * 
 * Language-specific system prompts that instruct the LLM to respond
 * in the user's selected language.
 */

export interface MultilingualPrompts {
  [languageCode: string]: string;
}

/**
 * Base system prompts for each supported language
 * These instruct the LLM to respond in the target language
 */
export const multilingualSystemPrompts: MultilingualPrompts = {
  en: "You are a helpful AI assistant. Respond in English.",
  zh: "你是一个有用的AI助手。用中文回答。",
  id: "Anda adalah asisten AI yang membantu. Jawab dalam Bahasa Indonesia.",
  th: "คุณเป็นผู้ช่วย AI ที่มีประโยชน์ ตอบเป็นภาษาไทย",
};

/**
 * Get the system prompt for a specific language
 * Falls back to English if the language is not supported
 */
export const getMultilingualSystemPrompt = (languageCode: string): string => {
  return multilingualSystemPrompts[languageCode] || multilingualSystemPrompts.en;
};

/**
 * Prepend language instruction to existing system instructions
 * This ensures the LLM responds in the correct language while
 * maintaining any custom system instructions
 */
export const prependLanguageInstruction = (
  languageCode: string,
  existingInstructions?: string
): string => {
  const languagePrompt = getMultilingualSystemPrompt(languageCode);
  
  if (!existingInstructions || existingInstructions.trim() === '') {
    return languagePrompt;
  }
  
  return `${languagePrompt}\n\n${existingInstructions}`;
};
