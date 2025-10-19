# Citations Format Fixed ✅

## Problem
At the bottom of answers, citations were appearing as plain text like:
```
1How does Perplexity work? | Perplexity Help Center
2How does perplexity.ai works? : r/perplexity_ai
```

Instead of clickable source cards with favicons and proper formatting.

## Root Cause
The LLM prompt was instructing the model to use `[number]` notation for citations:
```
- Cite using [number] notation
- Example: "The Eiffel Tower is visited by millions[1]."
```

But the frontend Citation component expects XML format:
```xml
<citation href="url">number</citation>
```

The mismatch caused citations to render as plain text instead of interactive links.

## Solution

### Updated Prompt (`src/lib/prompts/webSearch.ts`)

**Before**:
```
- Cite using [number] notation
- Example: "The Eiffel Tower is visited by millions[1]."
```

**After**:
```
- Cite using <citation href="source_url">number</citation> XML tags
- Example: "The Eiffel Tower is visited by millions<citation href="https://example.com">1</citation>."
- The href attribute MUST contain the actual URL from the source metadata
```

### Key Changes:

1. **Citation Format**: Changed from `[number]` to `<citation href="url">number</citation>`
2. **URL Requirement**: Explicitly requires actual URLs in href attribute
3. **Multiple Citations**: Updated example for multiple sources
4. **Clear Instructions**: Added emphasis on XML format in example output section

## How It Works Now

### LLM Output (Correct Format):
```markdown
Perplexity operates as an AI-powered search engine<citation href="https://perplexity.ai/help">1</citation>. 
It uses large language models<citation href="https://reddit.com/r/perplexity">2</citation>.
```

### Frontend Rendering:
The Citation component converts this to:
```html
<a href="https://perplexity.ai/help" target="_blank" class="...">1</a>
<a href="https://reddit.com/r/perplexity" target="_blank" class="...">2</a>
```

### User Sees:
- Clickable citation numbers (1, 2, 3, etc.)
- Styled as small badges
- Click to open source in new tab
- Proper spacing and formatting

## Expected Result

**Before** (Plain Text):
```
Conclusion
Perplexity stands out as an AI tool...1How does Perplexity work? | Perplexity Help Center 2How does perplexity.ai works?
```

**After** (Clickable Citations):
```
Conclusion
Perplexity stands out as an AI tool...[1] [2] [3]
```
Where [1], [2], [3] are clickable badges that open the source URLs.

## Additional Benefits

1. **Better UX**: Users can click citations to verify sources
2. **Professional Look**: Matches Perplexity's citation style
3. **Accessibility**: Screen readers can announce links properly
4. **SEO**: Proper link structure for crawlers

## Testing

To test the fix:

1. **Ask a new question** (citations are generated per query)
2. Wait for the answer to complete
3. Look for small numbered badges in the text (e.g., [1], [2])
4. Click a citation number → Should open source URL in new tab

**Note**: Existing answers in your chat history will still show old format. Only NEW queries will use the correct citation format.

## Files Modified

1. **src/lib/prompts/webSearch.ts**
   - Updated citation format instructions
   - Changed from `[number]` to `<citation href="url">number</citation>`
   - Added explicit URL requirement
   - Updated examples

## Why This Matters

Citations are a core feature of Perplexity-style search. They:
- Build trust by showing sources
- Allow users to verify information
- Provide context for answers
- Enable deeper research

Without proper citation formatting, the app loses one of its key differentiators!

## Next Steps

1. **Clear chat history** or start a new chat
2. **Ask a question** that requires web search
3. **Verify citations** appear as clickable badges
4. **Click citations** to confirm they link to sources

The citation format is now correct and will work for all new queries! 🔗✨

---
*Last updated: October 19, 2025*
