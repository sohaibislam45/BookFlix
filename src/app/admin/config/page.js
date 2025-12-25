'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import { showSuccess, showError } from '@/lib/swal';

export default function AdminConfigPage() {
  const { userData } = useAuth();
  const [config, setConfig] = useState({
    timezone: 'EST',
    maintenanceMode: false,
    supportEmail: 'help@bookflix.lib',
    standardLoanDays: 14,
    premiumLoanDays: 30,
    maxConcurrentLoans: 5,
    gracePeriod: 1,
    dailyFine: 0.50,
    maxFineCap: 20.00,
    autoChargeFines: false,
    deliveryService: true,
    deliveryRadius: 15,
    droneBeta: false,
    vipPriority: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to save config
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showSuccess('Configuration saved successfully');
    } catch (error) {
      showError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminHeader title="System Configuration" subtitle="Manage global application settings, fine rates, lending logic, and communication templates." />
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-1 justify-center py-6 sm:py-10 px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col max-w-[1100px] w-full flex-1 gap-8 pb-24">
            <div className="flex flex-wrap justify-between items-end gap-4 border-b border-white/5 pb-6">
              <div className="flex flex-col gap-2 max-w-2xl">
                <h1 className="text-white text-3xl sm:text-4xl font-black leading-tight tracking-tight">System Configuration</h1>
                <p className="text-text-secondary text-base font-normal leading-normal">Manage global application settings, fine rates, lending logic, and communication templates.</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card-dark border border-white/5 text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
                  <span className="material-symbols-outlined text-sm">history</span>
                  <span className="text-sm font-medium">Audit Log</span>
                </button>
              </div>
            </div>

            {/* General Settings */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2">
                <span className="material-symbols-outlined text-primary text-xl">tune</span>
                <h3 className="text-white text-xl font-bold leading-tight">General Settings</h3>
              </div>
              <div className="p-6 rounded-xl bg-card-dark border border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <label className="flex flex-col flex-1 group">
                  <p className="text-white text-sm font-medium leading-normal pb-2">System Timezone</p>
                  <select
                    className="form-select w-full rounded-lg text-white border border-white/5 bg-background-dark focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-sm transition-all cursor-pointer"
                    value={config.timezone}
                    onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                  >
                    <option>UTC (Coordinated Universal Time)</option>
                    <option>EST (Eastern Standard Time)</option>
                    <option>PST (Pacific Standard Time)</option>
                    <option>GMT (Greenwich Mean Time)</option>
                  </select>
                  <p className="text-xs text-text-secondary mt-2">Affects fine calculation cut-off times.</p>
                </label>
                <label className="flex flex-col flex-1 group">
                  <p className="text-white text-sm font-medium leading-normal pb-2">Maintenance Mode</p>
                  <div className="flex items-center justify-between h-12 px-4 rounded-lg border border-white/5 bg-background-dark">
                    <span className="text-sm text-text-secondary">System Status</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-success-green">{config.maintenanceMode ? 'Maintenance' : 'Live'}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          className="sr-only peer"
                          type="checkbox"
                          checked={config.maintenanceMode}
                          onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </label>
                <label className="flex flex-col flex-1 group">
                  <p className="text-white text-sm font-medium leading-normal pb-2">Support Email</p>
                  <input
                    className="form-input w-full rounded-lg text-white border border-white/5 bg-background-dark focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-sm transition-all placeholder:text-text-secondary/50"
                    type="email"
                    value={config.supportEmail}
                    onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                  />
                </label>
              </div>
            </section>

            {/* Borrowing Limits and Fine Rates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2">
                  <span className="material-symbols-outlined text-primary text-xl">policy</span>
                  <h3 className="text-white text-xl font-bold leading-tight">Borrowing Limits</h3>
                </div>
                <div className="flex flex-col gap-6 p-6 rounded-xl bg-card-dark border border-white/5 h-full">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col flex-1 group">
                      <p className="text-white text-sm font-medium leading-normal pb-2">Standard Loan</p>
                      <div className="relative">
                        <input
                          className="form-input w-full rounded-lg text-white border border-white/5 bg-background-dark focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-sm transition-all placeholder:text-text-secondary/50"
                          type="number"
                          value={config.standardLoanDays}
                          onChange={(e) => setConfig({ ...config, standardLoanDays: parseInt(e.target.value) })}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-xs">Days</span>
                      </div>
                    </label>
                    <label className="flex flex-col flex-1 group">
                      <p className="text-white text-sm font-medium leading-normal pb-2">Premium Loan</p>
                      <div className="relative">
                        <input
                          className="form-input w-full rounded-lg text-white border border-white/5 bg-background-dark focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-sm transition-all placeholder:text-text-secondary/50"
                          type="number"
                          value={config.premiumLoanDays}
                          onChange={(e) => setConfig({ ...config, premiumLoanDays: parseInt(e.target.value) })}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-xs">Days</span>
                      </div>
                    </label>
                  </div>
                  <label className="flex flex-col flex-1 group">
                    <div className="flex justify-between items-center pb-2">
                      <p className="text-white text-sm font-medium leading-normal">Max Concurrent Loans</p>
                      <span className="text-primary text-xs font-bold">{config.maxConcurrentLoans} Books</span>
                    </div>
                    <input
                      className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer"
                      type="range"
                      min="1"
                      max="20"
                      value={config.maxConcurrentLoans}
                      onChange={(e) => setConfig({ ...config, maxConcurrentLoans: parseInt(e.target.value) })}
                    />
                    <div className="flex justify-between text-xs text-text-secondary mt-2">
                      <span>1 Book</span>
                      <span>20 Books</span>
                    </div>
                  </label>
                  <label className="flex flex-col flex-1 group pt-2">
                    <p className="text-white text-sm font-medium leading-normal pb-2">Grace Period</p>
                    <div className="relative">
                      <input
                        className="form-input w-full rounded-lg text-white border border-white/5 bg-background-dark focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-sm transition-all placeholder:text-text-secondary/50"
                        type="number"
                        value={config.gracePeriod}
                        onChange={(e) => setConfig({ ...config, gracePeriod: parseInt(e.target.value) })}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-xs">Days</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">Days after due date before fines accrue.</p>
                  </label>
                </div>
              </section>
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2">
                  <span className="material-symbols-outlined text-primary text-xl">attach_money</span>
                  <h3 className="text-white text-xl font-bold leading-tight">Fine Rates</h3>
                </div>
                <div className="flex flex-col gap-6 p-6 rounded-xl bg-card-dark border border-white/5 h-full">
                  <label className="flex flex-col flex-1 group">
                    <p className="text-white text-sm font-medium leading-normal pb-2">Daily Overdue Fine</p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-mono">$</span>
                      <input
                        className="form-input w-full rounded-lg text-white border border-white/5 bg-background-dark focus:border-primary focus:ring-1 focus:ring-primary h-12 pl-8 pr-4 text-sm transition-all placeholder:text-text-secondary/50"
                        type="number"
                        step="0.50"
                        value={config.dailyFine}
                        onChange={(e) => setConfig({ ...config, dailyFine: parseFloat(e.target.value) })}
                      />
                    </div>
                  </label>
                  <label className="flex flex-col flex-1 group">
                    <p className="text-white text-sm font-medium leading-normal pb-2">Maximum Fine Cap</p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-mono">$</span>
                      <input
                        className="form-input w-full rounded-lg text-white border border-white/5 bg-background-dark focus:border-primary focus:ring-1 focus:ring-primary h-12 pl-8 pr-4 text-sm transition-all placeholder:text-text-secondary/50"
                        type="number"
                        step="1.00"
                        value={config.maxFineCap}
                        onChange={(e) => setConfig({ ...config, maxFineCap: parseFloat(e.target.value) })}
                      />
                    </div>
                    <p className="text-xs text-text-secondary mt-2">Maximum amount a user can be charged per book.</p>
                  </label>
                  <div className="border-t border-white/5 my-1"></div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">Auto-Charge Fines</p>
                      <p className="text-text-secondary text-xs">Bill default payment method</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        className="sr-only peer"
                        type="checkbox"
                        checked={config.autoChargeFines}
                        onChange={(e) => setConfig({ ...config, autoChargeFines: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-background-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </section>
            </div>

            {/* Logistics & Automation */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2">
                <span className="material-symbols-outlined text-primary text-xl">precision_manufacturing</span>
                <h3 className="text-white text-xl font-bold leading-tight">Logistics & Automation</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-5 rounded-xl bg-card-dark border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">local_shipping</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        className="sr-only peer"
                        type="checkbox"
                        checked={config.deliveryService}
                        onChange={(e) => setConfig({ ...config, deliveryService: e.target.checked })}
                      />
                      <div className="w-9 h-5 bg-background-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Delivery Service</h4>
                    <p className="text-text-secondary text-xs mt-1">Enable home delivery option for premium users within radius.</p>
                  </div>
                  <div className="mt-auto pt-2">
                    <label className="text-xs text-text-secondary block mb-1">Max Radius (km)</label>
                    <input
                      className="form-input w-full rounded text-white border border-white/5 bg-background-dark h-8 px-2 text-xs"
                      type="number"
                      value={config.deliveryRadius}
                      onChange={(e) => setConfig({ ...config, deliveryRadius: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-card-dark border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        className="sr-only peer"
                        type="checkbox"
                        checked={config.droneBeta}
                        onChange={(e) => setConfig({ ...config, droneBeta: e.target.checked })}
                      />
                      <div className="w-9 h-5 bg-background-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Drone Beta</h4>
                    <p className="text-text-secondary text-xs mt-1">Experimental autonomous delivery for items under 1kg.</p>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-card-dark border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <span className="material-symbols-outlined">priority_high</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        className="sr-only peer"
                        type="checkbox"
                        checked={config.vipPriority}
                        onChange={(e) => setConfig({ ...config, vipPriority: e.target.checked })}
                      />
                      <div className="w-9 h-5 bg-background-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">VIP Priority</h4>
                    <p className="text-text-secondary text-xs mt-1">Allow premium users to bypass standard waitlists.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        {/* Sticky Footer */}
        <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-background-dark/95 backdrop-blur-sm z-10 flex justify-center">
          <div className="w-full max-w-[1100px] flex justify-between items-center px-4 sm:px-8">
            <div className="flex items-center gap-2 text-text-secondary text-sm hidden sm:flex">
              <span className="material-symbols-outlined text-lg">info</span>
              Configuration changes apply immediately.
            </div>
            <div className="flex gap-4 ml-auto">
              <button className="px-6 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 transition-colors">Discard</button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium shadow-[0_0_20px_rgba(170,31,239,0.3)] transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

