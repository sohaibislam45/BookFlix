'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminHeader from '@/components/AdminHeader';
import { formatCurrency, formatDate, debounce } from '@/lib/utils';
import Loader from '@/components/Loader';
import { showSuccess, showError } from '@/lib/swal';

export default function AdminFinancePage() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    finesCollected: 0,
    subscriptionARR: 0,
    payingMembers: 0,
    revenueGrowth: 0,
    pendingFines: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState('7d');
  const [revenueData, setRevenueData] = useState([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState({
    subscriptions: { percentage: 0, amount: 0 },
    fines: { percentage: 0, amount: 0 },
    replacement: { percentage: 0, amount: 0 },
  });
  const filterDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [timePeriod]);

  // Filter transactions based on search and status
  useEffect(() => {
    let filtered = [...allTransactions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((tx) => {
        const memberName = tx.member?.name?.toLowerCase() || '';
        const memberEmail = tx.member?.email?.toLowerCase() || '';
        const txId = tx._id?.toString().toLowerCase() || '';
        return memberName.includes(query) || memberEmail.includes(query) || txId.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.status === statusFilter);
    }

    setTransactions(filtered);
  }, [searchQuery, statusFilter, allTransactions]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/payments?limit=1000'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        
        // Calculate subscription ARR (Annual Recurring Revenue)
        const monthlyPrice = 9.99;
        const subscriptionARR = (statsData.premiumUsers || 0) * monthlyPrice * 12;

        setStats(prev => ({
          totalRevenue: statsData.totalRevenue || 0,
          finesCollected: prev.finesCollected || 0, // Will be updated when payments are loaded
          subscriptionARR: subscriptionARR,
          payingMembers: statsData.premiumUsers || 0,
          revenueGrowth: parseFloat(statsData.revenueGrowth || 0),
          pendingFines: statsData.pendingFines || 0,
        }));

        // Calculate revenue breakdown
        if (statsData.revenueBreakdown && statsData.revenueBreakdown.length > 0) {
          const subscriptionBreakdown = statsData.revenueBreakdown.find(r => r.type === 'subscription');
          const fineBreakdown = statsData.revenueBreakdown.find(r => r.type === 'fine');
          
          setRevenueBreakdown({
            subscriptions: {
              percentage: subscriptionBreakdown?.percentage || 0,
              amount: (statsData.totalRevenue || 0) * (subscriptionBreakdown?.percentage || 0) / 100,
            },
            fines: {
              percentage: fineBreakdown?.percentage || 0,
              amount: (statsData.totalRevenue || 0) * (fineBreakdown?.percentage || 0) / 100,
            },
            replacement: {
              percentage: 0,
              amount: 0,
            },
          });
        }

        // Calculate revenue chart data based on time period
        calculateRevenueChart(statsData.monthlyRevenue || [], timePeriod);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        const payments = paymentsData.payments || [];
        setAllTransactions(payments);
        setTransactions(payments);
        
        // Calculate fines collected from completed payments after transactions are loaded
        const finesCollected = payments
          .filter(tx => tx.status === 'completed' && (tx.fine || tx.type === 'fine'))
          .reduce((sum, tx) => sum + (tx.amount || 0), 0);
        
        setStats(prev => ({
          ...prev,
          finesCollected: finesCollected,
        }));
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
      showError('Error', 'Failed to fetch finance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenueChart = (monthlyRevenue, period) => {
    const now = new Date();
    const days = 7;
    const dataPoints = 7; // Show daily for 7 days

    // Generate daily data points
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // For simplicity, distribute monthly revenue evenly across days
      // In a real app, you'd fetch daily payment data
      const monthIndex = monthlyRevenue.length - Math.floor(i / 30);
      const monthData = monthlyRevenue[monthIndex] || { total: 0 };
      const dailyAmount = monthData.total / 30;
      
      chartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: dailyAmount,
      });
    }

    setRevenueData(chartData);
  };

  const handleExportReport = () => {
    try {
      // Create CSV content
      const headers = ['Transaction ID', 'Date', 'Member', 'Email', 'Type', 'Method', 'Amount', 'Status'];
      const rows = transactions.map(tx => [
        tx._id?.toString().slice(-6) || '',
        formatDate(tx.createdAt),
        tx.member?.name || 'Unknown',
        tx.member?.email || 'N/A',
        tx.type || 'Payment',
        tx.paymentMethod || 'Card',
        formatCurrency(tx.amount || 0),
        tx.status || 'Pending',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `finance-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('Export Successful', 'Finance report has been downloaded.');
    } catch (error) {
      console.error('Error exporting report:', error);
      showError('Export Failed', 'Failed to export report. Please try again.');
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
              <button 
                onClick={handleExportReport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 transition-all text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Report
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <div className="bg-card-dark border border-white/5 rounded-xl p-5 hover:border-orange-500/30 transition-colors shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-orange-400">pending</span>
              </div>
              <p className="text-text-secondary text-sm font-medium mb-1">Pending Fines</p>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-white">{loading ? '...' : stats.pendingFines.toLocaleString()}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-orange-500/20">
                  <span className="material-symbols-outlined text-[12px]">info</span> Unpaid
                </span>
                <span className="text-text-secondary">requires action</span>
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
              </div>
              <div className="h-[300px] w-full relative flex items-end justify-between gap-2">
                {revenueData.length > 0 ? (
                  revenueData.map((data, index) => {
                    const maxAmount = Math.max(...revenueData.map(d => d.amount), 1);
                    const height = (data.amount / maxAmount) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2" style={{ height: '100%' }}>
                        <div className="w-full flex flex-col items-end justify-end" style={{ height: '100%' }}>
                          <div
                            className="w-full bg-primary rounded-t transition-all hover:bg-primary-hover cursor-pointer"
                            style={{ height: `${Math.max(height, 5)}%`, minHeight: '4px' }}
                            title={formatCurrency(data.amount)}
                          ></div>
                        </div>
                        <span className="text-xs text-text-secondary font-medium">
                          {data.date}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary">
                    No revenue data available
                  </div>
                )}
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
                      <span className="text-white font-semibold">{revenueBreakdown.subscriptions.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-background-dark rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full shadow-[0_0_10px_rgba(170,31,239,0.4)] transition-all" 
                        style={{ width: `${revenueBreakdown.subscriptions.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{formatCurrency(revenueBreakdown.subscriptions.amount)} total</p>
                  </div>
                  <div className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">Late Fines</span>
                      <span className="text-white font-semibold">{revenueBreakdown.fines.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-background-dark rounded-full h-2">
                      <div 
                        className="bg-orange-400 h-2 rounded-full transition-all" 
                        style={{ width: `${revenueBreakdown.fines.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{formatCurrency(revenueBreakdown.fines.amount)} total</p>
                  </div>
                  {revenueBreakdown.replacement.percentage > 0 && (
                    <div className="group">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">Book Replacement</span>
                        <span className="text-white font-semibold">{revenueBreakdown.replacement.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-background-dark rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all" 
                          style={{ width: `${revenueBreakdown.replacement.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{formatCurrency(revenueBreakdown.replacement.amount)} total</p>
                    </div>
                  )}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative" ref={filterDropdownRef}>
                  <button 
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/5 bg-card-dark hover:bg-white/5 text-white text-sm transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                    Filter
                    <span className="material-symbols-outlined text-[14px]">{isFilterDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {isFilterDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg bg-card-dark border border-white/5 shadow-xl z-50">
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status</div>
                        <button
                          onClick={() => {
                            setStatusFilter('all');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            statusFilter === 'all'
                              ? 'bg-primary/20 text-white'
                              : 'text-text-secondary hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          All Transactions
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('completed');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            statusFilter === 'completed'
                              ? 'bg-primary/20 text-white'
                              : 'text-text-secondary hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Completed
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('pending');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            statusFilter === 'pending'
                              ? 'bg-primary/20 text-white'
                              : 'text-text-secondary hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('failed');
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                            statusFilter === 'failed'
                              ? 'bg-primary/20 text-white'
                              : 'text-text-secondary hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          Failed
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                                {transaction.member?.name?.charAt(0) || transaction.memberId?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{transaction.member?.name || transaction.memberId?.name || 'Unknown'}</p>
                                <p className="text-xs text-text-secondary">{transaction.member?.email || transaction.memberId?.email || 'N/A'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-white/70">{transaction.type || (transaction.fine ? 'Fine Payment' : 'Payment')}</td>
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

