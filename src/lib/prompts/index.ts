import {
  webSearchResponsePrompt,
  webSearchRetrieverFewShots,
  webSearchRetrieverPrompt,
} from './webSearch';
import { writingAssistantPrompt } from './writingAssistant';
import {
  multilingualSystemPrompts,
  getMultilingualSystemPrompt,
  prependLanguageInstruction,
} from './multilingual';

export default {
  webSearchResponsePrompt,
  webSearchRetrieverPrompt,
  webSearchRetrieverFewShots,
  writingAssistantPrompt,
};

export {
  multilingualSystemPrompts,
  getMultilingualSystemPrompt,
  prependLanguageInstruction,
};
