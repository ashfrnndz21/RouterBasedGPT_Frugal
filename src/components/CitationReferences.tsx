'use client';

import React from 'react';
import { Document } from '@langchain/core/documents';

interface CitationReferencesProps {
  sources: Document[];
}

const CitationReferences = ({ sources }: CitationReferencesProps) => {
  // Handle empty sources array gracefully
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-light-200/50 dark:border-dark-200/50">
      <h3 className="text-black dark:text-white font-medium text-lg mb-4">
        References
      </h3>
      <ol className="space-y-3">
        {sources.map((source, index) => {
          const title = source.metadata?.title || 'Unknown Source';
          const url = source.metadata?.url;

          // Skip sources without URLs
          if (!url || url === 'File') {
            return null;
          }

          return (
            <li
              key={index}
              className="text-sm text-black/70 dark:text-white/70 leading-relaxed"
            >
              <span className="font-medium text-black dark:text-white">
                [{index + 1}]
              </span>{' '}
              <span className="text-black/80 dark:text-white/80">{title}</span>
              {' - '}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#24A0ED] hover:text-[#1b7ec0] dark:hover:text-[#3db3ff] underline transition-colors duration-200 break-all"
              >
                {url}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default CitationReferences;
