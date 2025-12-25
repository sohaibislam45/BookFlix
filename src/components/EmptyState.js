'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Empty state component for when there's no data to display
 */
export default function EmptyState({
  icon = 'inbox',
  title = 'No items found',
  description = 'There are no items to display at this time.',
  actionLabel = null,
  actionHref = null,
  actionOnClick = null,
  className = '',
}) {
  return (
    <div className={`text-center py-12 text-text-secondary ${className}`}>
      <span className="material-symbols-outlined text-5xl mb-3 opacity-50 block">
        {icon}
      </span>
      <p className="text-lg font-medium text-white mb-2">{title}</p>
      <p className="text-sm mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-block px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold transition-all shadow-lg shadow-primary/20"
            >
              {actionLabel}
            </Link>
          ) : actionOnClick ? (
            <button
              onClick={actionOnClick}
              className="inline-block px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold transition-all shadow-lg shadow-primary/20"
            >
              {actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

