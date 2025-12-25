'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import Loader from '@/components/Loader';

export default function AdminFinancePage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    finesCollected: 0,
    subscriptionARR: 0,
    payingMembers: 0,
    revenueGrowth: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/payments?limit=10'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalRevenue: statsData.totalRevenue || 0,
          finesCollected: 0, // Calculate from payments
          subscriptionARR: (statsData.premiumUsers || 0) * 9.99 * 12,
          payingMembers: statsData.premiumUsers || 0,
          revenueGrowth: parseFloat(statsData.revenueGrowth || 0),
        });
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setTransactions(paymentsData.payments || []);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminHeader title="Finance Overview" subtitle="Monitor revenue streams, fines collection, and subscription growth." />
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Finance Overview</h1>
              <p className="text-text-secondary">Monitor revenue streams, fines collection, and subscription growth.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary mr-2">Last updated: Today, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card-dark hover:bg-white/5 border border-white/5 text-white transition-all text-sm font-medium">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 transition-all text-sm font-medium">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Report
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card-dark border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary">payments</span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-1">Total Revenue</p>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-white">{loading ? '...' : formatCurrency(stats.totalRevenue)}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="bg-success-green/10 text-success-green px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-success-green/20">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span> {stats.revenueGrowth}%
                </span>
                <span className="text-text-secondary">vs last month</span>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-orange-400">gavel</span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-1">Fines Collected</p>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-white">{loading ? '...' : formatCurrency(stats.finesCollected)}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-red-500/20">
                  <span className="material-symbols-outlined text-[12px]">trending_down</span> 2.1%
                </span>
                <span className="text-text-secondary">vs last month</span>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-blue-400">card_membership</span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-1">Subscription ARR</p>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-white">{loading ? '...' : formatCurrency(stats.subscriptionARR)}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="bg-success-green/10 text-success-green px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-success-green/20">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span> 8.4%
                </span>
                <span className="text-text-secondary">vs last year</span>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary">group</span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-1">Paying Members</p>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-white">{loading ? '...' : stats.payingMembers.toLocaleString()}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="bg-success-green/10 text-success-green px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-success-green/20">
                  <span className="material-symbols-outlined text-[12px]">trending_up</span> 142
                </span>
                <span className="text-text-secondary">new this month</span>
              </div>
            </div>
          </div>

          {/* Revenue Chart and Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card-dark border border-white/5 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Revenue Analytics</h3>
                  <p className="text-sm text-text-secondary">Income from all sources over time</p>
                </div>
                <div className="flex p-1 bg-background-dark rounded-lg border border-white/5">
                  <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-white transition-colors">7d</button>
                  <button className="px-3 py-1 text-xs font-medium bg-white/5 text-white rounded shadow-sm transition-colors">30d</button>
                  <button className="px-3 py-1 text-xs font-medium text-text-secondary hover:text-white transition-colors">90d</button>
                </div>
              </div>
              <div className="h-[300px] w-full relative flex items-end justify-between gap-2">
                {[40, 50, 45, 60, 55, 70].map((height, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2" style={{ height: '100%' }}>
                    <div className="w-full flex flex-col items-end justify-end" style={{ height: '100%' }}>
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary-hover"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      ></div>
                    </div>
                    <span className="text-xs text-text-secondary font-medium">
                      {['Sep 24', 'Oct 01', 'Oct 08', 'Oct 15', 'Oct 22', 'Today'][index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 rounded-xl p-6 shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">Revenue Sources</h3>
                <p className="text-sm text-text-secondary">Breakdown by payment type</p>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="space-y-4">
                  <div className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">Subscriptions</span>
                      <span className="text-white font-semibold">78%</span>
                    </div>
                    <div className="w-full bg-background-dark rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full w-[78%] shadow-[0_0_10px_rgba(170,31,239,0.4)]"></div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">$97,110.00 this month</p>
                  </div>
                  <div className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">Late Fines</span>
                      <span className="text-white font-semibold">15%</span>
                    </div>
                    <div className="w-full bg-background-dark rounded-full h-2">
                      <div className="bg-orange-400 h-2 rounded-full w-[15%]"></div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">$18,675.00 this month</p>
                  </div>
                  <div className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">Book Replacement</span>
                      <span className="text-white font-semibold">7%</span>
                    </div>
                    <div className="w-full bg-background-dark rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full w-[7%]"></div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">$8,715.00 this month</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Total processed</span>
                    <span className="text-white font-bold">{formatCurrency(stats.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors group-focus-within:text-primary">search</span>
                  <input
                    className="bg-card-dark border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-full sm:w-64 transition-all"
                    placeholder="Search by user, ID..."
                    type="text"
                  />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/5 bg-card-dark hover:bg-white/5 text-white text-sm transition-colors">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  Filter
                </button>
              </div>
            </div>
            <div className="bg-card-dark border border-white/5 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background-dark/50 border-b border-white/5">
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Transaction ID</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Date</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Member</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Method</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="p-4 text-center text-text-secondary">
                          <div className="flex justify-center">
                            <Loader />
                          </div>
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-4 text-center text-text-secondary">No transactions found</td>
                      </tr>
                    ) : (
                      transactions.slice(0, 10).map((transaction) => (
                        <tr key={transaction._id} className="group hover:bg-white/5 transition-colors">
                          <td className="p-4 text-sm font-medium text-white font-mono">#{transaction._id.toString().slice(-6)}</td>
                          <td className="p-4 text-sm text-text-secondary">
                            {formatDate(transaction.createdAt)}
                            <br />
                            <span className="text-xs text-text-secondary/70">
                              {new Date(transaction.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {transaction.memberId?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{transaction.memberId?.name || 'Unknown'}</p>
                                <p className="text-xs text-text-secondary">{transaction.memberId?.email || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-white/70">{transaction.type || 'Payment'}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                              <span className="material-symbols-outlined text-[16px]">credit_card</span> Card
                            </div>
                          </td>
                          <td className="p-4 text-sm font-bold text-white">{formatCurrency(transaction.amount || 0)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              transaction.status === 'completed'
                                ? 'bg-success-green/10 text-success-green border border-success-green/20'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {transaction.status || 'Pending'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button className="text-text-secondary hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

