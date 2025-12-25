'use client';

export default function MyShelfPage() {
  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">My Shelf</h2>
        <p className="text-text-secondary mb-8">Your borrowed books and reading history</p>
        <div className="text-center py-12 text-text-secondary">
          <span className="material-symbols-outlined text-5xl mb-3 opacity-50">shelves</span>
          <p className="text-lg">No books on your shelf yet</p>
        </div>
      </div>
    </div>
  );
}

