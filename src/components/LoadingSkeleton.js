'use client';

import React from 'react';

/**
 * Loading skeleton component for cards
 */
export function CardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-surface-dark rounded-xl p-4 border border-[#3c2348] animate-pulse"
        >
          <div className="w-full aspect-[16/9] mb-4 bg-white/5 rounded-lg"></div>
          <div className="h-4 bg-white/5 rounded mb-2"></div>
          <div className="h-3 bg-white/5 rounded w-3/4"></div>
        </div>
      ))}
    </>
  );
}

/**
 * Loading skeleton for table rows
 */
export function TableRowSkeleton({ count = 5, columns = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <div className="h-4 bg-white/5 rounded w-3/4"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Loading skeleton for stats cards
 */
export function StatsCardSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl bg-surface-dark border border-[#3c2348] p-5 animate-pulse"
        >
          <div className="h-4 bg-white/5 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-white/5 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-white/5 rounded w-2/3"></div>
        </div>
      ))}
    </>
  );
}

/**
 * Loading skeleton for list items
 */
export function ListItemSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-4 bg-surface-dark rounded-lg border border-white/5 animate-pulse"
        >
          <div className="size-10 rounded-full bg-white/5"></div>
          <div className="flex-1">
            <div className="h-4 bg-white/5 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-white/5 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Generic loading skeleton
 */
export function Skeleton({ className = '', width = '100%', height = '1rem' }) {
  return (
    <div
      className={`bg-white/5 rounded animate-pulse ${className}`}
      style={{ width, height }}
    ></div>
  );
}

export default {
  Card: CardSkeleton,
  TableRow: TableRowSkeleton,
  StatsCard: StatsCardSkeleton,
  ListItem: ListItemSkeleton,
  Skeleton,
};

