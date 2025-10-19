import React from 'react';

const Citation = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
    >
      [{children}]
    </a>
  );
};

export default Citation;
