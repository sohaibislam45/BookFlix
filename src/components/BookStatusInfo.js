'use client';

import Image from 'next/image';

export default function BookStatusInfo({ currentBorrower, currentReserver, isPremium }) {
  if (!currentBorrower && !currentReserver) {
    return null;
  }

  return (
    <div className="bg-surface-dark/40 border border-surface-border rounded-xl p-4 mb-6 backdrop-blur-sm">
      {currentBorrower && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-surface-border/50">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative size-12 rounded-full overflow-hidden bg-surface-dark border border-surface-border flex-shrink-0">
              {currentBorrower.member.profilePhoto ? (
                <Image
                  src={currentBorrower.member.profilePhoto}
                  alt={currentBorrower.member.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold bg-primary/20">
                  {currentBorrower.member.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase text-text-secondary tracking-wider mb-1">
                Currently Borrowed By
              </p>
              <p className="text-white font-medium truncate">{currentBorrower.member.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {currentBorrower.daysOverdue > 0 ? (
                  <span className="text-xs text-alert-red font-bold">
                    {currentBorrower.daysOverdue} day{currentBorrower.daysOverdue !== 1 ? 's' : ''} overdue
                  </span>
                ) : (
                  <span className="text-xs text-emerald-400">
                    Due in {currentBorrower.daysRemaining} day{currentBorrower.daysRemaining !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-text-secondary text-xs">
                  ({new Date(currentBorrower.dueDate).toLocaleDateString()})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentReserver && isPremium && (
        <div className="flex items-center gap-3">
          <div className="relative size-12 rounded-full overflow-hidden bg-surface-dark border border-surface-border flex-shrink-0">
            {currentReserver.member.profilePhoto ? (
              <Image
                src={currentReserver.member.profilePhoto}
                alt={currentReserver.member.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold bg-amber-500/20">
                {currentReserver.member.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase text-text-secondary tracking-wider mb-1">
              Reserved By
            </p>
            <p className="text-white font-medium truncate">{currentReserver.member.name}</p>
            <p className="text-xs text-text-secondary mt-1">
              Reserved on {new Date(currentReserver.reservedDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

