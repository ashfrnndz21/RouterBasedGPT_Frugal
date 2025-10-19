# Design Document: Clickable Citations

## Overview

This design simplifies the citation system to display all source links used in the response as a clickable references list at the end. Instead of complex inline citations, we'll show a clean "References" section with all URLs that were cited in the response.

### Current State Analysis

The application already has:
- A `Citation` component (`src/components/Citation.tsx`) that renders `[number]` citations
- A `MessageSources` component that displays source cards at the top
- Sources are available in `section.sourceMessage.sources` with URL and title metadata

### Problem Statement

Citations currently show as `[1]`, `[2]`, etc., but there's no easy way to see what these numbers refer to or click through to the actual sources. Users want a simple references section showing:
1. All links that were cited
2. Clickable URLs
3. Clear numbering that matches the inline citations

## Architecture

### Component Structure

```
MessageBox (Container)
├── Markdown Parser (renders inline [1], [2], etc.)
├── MessageSources (existing source cards at top)
└── CitationReferences (new component - simple numbered list at bottom)
```

### Data Flow

1. **Sources Available**: Sources are already in `section.sourceMessage.sources` array
2. **Inline Citations**: Existing Citation component shows `[1]`, `[2]`, etc.
3. **References Section**: New component at bottom lists all sources with clickable URLs
4. **User Clicks**: Opens source URL in new tab

## Components and Interfaces

### 1. CitationReferences Component (New)

**File**: `src/components/CitationReferences.tsx`

**Purpose**: Display a simple numbered list of all source URLs at the end of the response

**Props**:
```typescript
import { Document } from '@langchain/core/documents';

interface CitationReferencesProps {
  sources: Document[];  // Same format as MessageSources uses
}
```

**Features**:
- Simple numbered list (1, 2, 3...)
- Each item shows: `[number] Title - URL (clickable)`
- Clean, minimal styling
- Opens links in new tab
- Responsive layout

### 2. MessageBox Component (Modified)

**File**: `src/components/MessageBox.tsx`

**Changes**:
- Add CitationReferences component after the answer section
- Pass `section.sourceMessage.sources` to it
- Only show if sources exist

## Data Models

### Source Data Structure (Already Exists)

```typescript
// From @langchain/core/documents
interface Document {
  pageContent: string;
  metadata: {
    url: string;
    title: string;
  };
}
```

This is already available in `section.sourceMessage.sources` - we just need to display it.

## Error Handling

### No Sources Available

**Scenario**: Response has no sources

**Handling**:
- Don't render CitationReferences component
- No error message needed

### Missing URL or Title

**Scenario**: Source has missing metadata

**Handling**:
- Show "Unknown Source" for missing title
- Show URL if available, otherwise skip that source
- No error to user

### Long URLs

**Scenario**: URL is very long

**Handling**:
- Let it wrap naturally or truncate with CSS
- Full URL still clickable

## Testing Strategy

### Manual Testing

**CitationReferences Component**:
- Renders with sources array
- Shows correct numbering
- Links are clickable
- Opens in new tab
- Handles empty sources array
- Works in light/dark mode

**MessageBox Integration**:
- References section appears after answer
- Only shows when sources exist
- Doesn't break existing layout
- Works with existing MessageSources component

## Implementation Phases

### Single Phase: Add References Section
1. Create CitationReferences component with simple numbered list
2. Add it to MessageBox after the answer
3. Style it to match existing design
4. Test with existing chat responses

## Design Decisions and Rationales

### Decision 1: Simple Numbered List

**Rationale**: User wants a straightforward list of all links used. No complex extraction or parsing needed - sources are already available.

**Alternative Considered**: Complex inline citation system with tooltips
**Why Rejected**: Over-engineered for the requirement

### Decision 2: Reuse Existing Source Data

**Rationale**: `section.sourceMessage.sources` already contains all the data we need (URL, title). No need to parse markdown or extract citations.

**Alternative Considered**: Parse citation tags from markdown
**Why Rejected**: Unnecessary complexity when data is already available

### Decision 3: Place After Answer Section

**Rationale**: Standard academic format - references at the end. Doesn't interfere with reading the answer.

**Alternative Considered**: Place at top with MessageSources
**Why Rejected**: Would be redundant with existing source cards

## Accessibility Considerations

### Keyboard Navigation
- Links are keyboard accessible (Tab navigation)
- Enter key opens link

### Screen Readers
- Proper heading for "References" section
- Links have descriptive text (title + URL)

### Visual Accessibility
- Works in both light and dark modes
- Sufficient color contrast
- Clear hover states

## Performance Considerations

### Rendering
- Simple list rendering, no complex operations
- Sources array is already available, no extraction needed
- Use React.memo if needed for optimization

## Security Considerations

### External Links
- Use `rel="noopener noreferrer"` for all links
- Open in new tab (`target="_blank"`)
- URLs come from trusted source (our own API)

## Future Enhancements

Possible future improvements:
1. Add favicons to reference list
2. Copy all references button
3. Export citations in different formats

## Component Layout

```
MessageBox
├── User Question
├── MessageSources (existing - source cards at top)
├── Answer (markdown with inline [1], [2], etc.)
├── Response Badges
├── Action Buttons (Rewrite, Copy, etc.)
└── CitationReferences (NEW - numbered list at bottom)
    ├── [1] Title - URL
    ├── [2] Title - URL
    └── [3] Title - URL
```

## Dependencies

No new dependencies needed. Uses existing:
- React
- @langchain/core/documents (already used)

## Files to Modify

1. `src/components/CitationReferences.tsx` (new file)
2. `src/components/MessageBox.tsx` (add references section)
