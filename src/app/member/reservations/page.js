'use client';

export default function ReservationsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">Reservations</h2>
        <p className="text-text-secondary mb-8">Track your hold requests, manage queue positions, and claim available books.</p>
        <div className="text-center py-12 text-text-secondary">
          <span className="material-symbols-outlined text-5xl mb-3 opacity-50">event_seat</span>
          <p className="text-lg">No active reservations</p>
        </div>
      </div>
    </div>
  );
}

