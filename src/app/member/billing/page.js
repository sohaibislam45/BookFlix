'use client';

export default function BillingPage() {
  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">Billing & Profile</h2>
        <p className="text-text-secondary mb-8">Manage your account settings, billing information, and subscription</p>
        <div className="text-center py-12 text-text-secondary">
          <span className="material-symbols-outlined text-5xl mb-3 opacity-50">receipt_long</span>
          <p className="text-lg">Billing information will appear here</p>
        </div>
      </div>
    </div>
  );
}

