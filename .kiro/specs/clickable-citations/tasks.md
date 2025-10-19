# Implementation Plan

- [ ] 1. Create CitationReferences component
  - Create new file `src/components/CitationReferences.tsx`
  - Accept `sources` prop (array of Document objects)
  - Render numbered list of citations with clickable URLs
  - Display format: `[number] Title - URL`
  - Use `target="_blank"` and `rel="noopener noreferrer"` for links
  - Style to match existing design (light/dark mode support)
  - Handle empty sources array gracefully
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.5_

- [x] 2. Integrate CitationReferences into MessageBox
  - Import CitationReferences component in `src/components/MessageBox.tsx`
  - Add CitationReferences after the answer section and before suggestions
  - Pass `section.sourceMessage.sources` as prop
  - Only render when `section.sourceMessage` exists and has sources
  - Add appropriate spacing and section styling
  - Ensure it doesn't break existing layout or components
  - _Requirements: 1.1, 2.1, 2.3, 3.1, 3.4_

- [x] 3. Test and verify implementation
  - Test with existing chat responses that have citations
  - Verify links are clickable and open in new tabs
  - Check light and dark mode styling
  - Verify responsive behavior on mobile
  - Test with responses that have no sources
  - Ensure inline citation numbers match reference list numbers
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.2, 3.5_
