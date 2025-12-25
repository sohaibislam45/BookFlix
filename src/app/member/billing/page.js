'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { isPremium, getSubscriptionDisplayName } from '@/lib/utils';

export default function BillingPage() {
  const { userData } = useAuth();
  const [fines, setFines] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [processingSubscription, setProcessingSubscription] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (userData?._id) {
      fetchFines();
      fetchPayments();
      fetchSubscription();

      // Check for payment success/cancel in URL params
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment_success') === 'true') {
        // Show success message and refresh
        setTimeout(() => {
          fetchFines();
          fetchPayments();
        }, 1000);
      }
      if (params.get('subscription_success') === 'true') {
        setSuccessMessage('Subscription activated successfully!');
        fetchSubscription();
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
      }
      if (params.get('subscription_cancelled') === 'true') {
        setError('Subscription checkout was cancelled.');
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [userData]);

  const fetchFines = async () => {
    try {
      const response = await fetch(`/api/fines?memberId=${userData._id}&status=pending`);
      if (response.ok) {
        const data = await response.json();
        setFines(data.fines || []);
      }
    } catch (error) {
      console.error('Error fetching fines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/payments?memberId=${userData._id}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions?userId=${userData._id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleUpgradeSubscription = async (plan) => {
    try {
      setProcessingSubscription(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
          plan: plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error creating subscription checkout:', err);
      setProcessingSubscription(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.')) {
      return;
    }

    try {
      setProcessingSubscription(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      setSuccessMessage('Subscription will be cancelled at the end of the current period.');
      fetchSubscription();
      setProcessingSubscription(false);
    } catch (err) {
      setError(err.message);
      console.error('Error canceling subscription:', err);
      setProcessingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setProcessingSubscription(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reactivate subscription');
      }

      setSuccessMessage('Subscription reactivated successfully!');
      fetchSubscription();
      setProcessingSubscription(false);
    } catch (err) {
      setError(err.message);
      console.error('Error reactivating subscription:', err);
      setProcessingSubscription(false);
    }
  };

  const handlePayFine = async (fine) => {
    try {
      setProcessingPayment(fine._id);
      setError(null);

      // Create payment
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fineId: fine._id,
          memberId: userData._id,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const paymentData = await paymentResponse.json();
      const paymentId = paymentData.payment._id;

      // Create Stripe Checkout session
      const checkoutResponse = await fetch(`/api/payments/${paymentId}/checkout`, {
        method: 'POST',
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const checkoutData = await checkoutResponse.json();

      // Redirect to Stripe Checkout
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error processing payment:', err);
      setProcessingPayment(null);
    }
  };

  const totalOutstanding = fines.reduce((sum, fine) => sum + fine.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 scroll-smooth">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Billing & Payments</h2>
            <p className="text-text-secondary text-sm md:text-base">
              Manage your fines and payment history
            </p>
          </div>
          {totalOutstanding > 0 && (
            <div className="bg-alert-red/10 border border-alert-red/30 rounded-xl p-4">
              <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-alert-red">${totalOutstanding.toFixed(2)}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-alert-red/10 border border-alert-red/30 rounded-xl p-4">
            <p className="text-alert-red text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Subscription Management Section */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">workspace_premium</span>
              Subscription
            </h3>
          </div>

          <div className="bg-surface-dark rounded-xl p-6 border border-[#3c2348]">
            {subscription && isPremium({ subscription }) ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Current Plan</p>
                    <p className="text-2xl font-bold text-white">{getSubscriptionDisplayName(subscription.type)}</p>
                    {subscription.subscription && (
                      <p className="text-text-secondary text-sm mt-2">
                        Renews on {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg">
                    Active
                  </div>
                </div>

                {subscription.subscription?.cancelAtPeriodEnd ? (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <p className="text-orange-400 text-sm mb-3">
                      Your subscription will be cancelled at the end of the current period.
                    </p>
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={processingSubscription}
                      className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      {processingSubscription ? 'Processing...' : 'Reactivate Subscription'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={processingSubscription}
                    className="bg-alert-red/10 hover:bg-alert-red/20 border border-alert-red/30 text-alert-red text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingSubscription ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-1">Current Plan</p>
                  <p className="text-2xl font-bold text-white">Free</p>
                  <p className="text-text-secondary text-sm mt-2">
                    Upgrade to Premium for enhanced borrowing privileges
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleUpgradeSubscription('monthly')}
                    disabled={processingSubscription}
                    className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {processingSubscription ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">workspace_premium</span>
                        Upgrade to Monthly Premium
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleUpgradeSubscription('yearly')}
                    disabled={processingSubscription}
                    className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-sm font-bold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {processingSubscription ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">workspace_premium</span>
                        Upgrade to Yearly Premium
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Premium Benefits</p>
                  <ul className="text-text-secondary text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      Borrow up to 4 books at a time (vs 1 for free)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      20-day borrowing period (vs 7 days for free)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                      Priority access to new releases
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Outstanding Fines Section */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Outstanding Fines
            </h3>
            {fines.length > 0 && (
              <button
                onClick={() => fetchFines()}
                className="text-sm text-primary hover:text-white transition-colors font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Refresh
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50 animate-spin">refresh</span>
              <p className="text-lg">Loading fines...</p>
            </div>
          ) : fines.length === 0 ? (
            <div className="text-center py-12 text-text-secondary rounded-xl bg-surface-dark border border-[#3c2348]">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50">check_circle</span>
              <p className="text-lg">No outstanding fines</p>
              <p className="text-sm mt-2">You're all caught up!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {fines.map((fine) => (
                <div
                  key={fine._id}
                  className="bg-surface-dark rounded-xl p-5 border border-alert-red/30 hover:border-alert-red/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {fine.borrowing?.book?.coverImage && (
                          <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={fine.borrowing.book.coverImage}
                              alt={fine.borrowing.book.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-lg">
                            {fine.borrowing?.book?.title || 'Book'}
                          </h4>
                          <p className="text-text-secondary text-sm mb-2">
                            {fine.borrowing?.book?.author || 'Author unknown'}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div>
                              <span className="text-text-secondary">Days overdue:</span>{' '}
                              <span className="text-alert-red font-medium">{fine.daysOverdue}</span>
                            </div>
                            <div>
                              <span className="text-text-secondary">Issued:</span>{' '}
                              <span className="text-white">
                                {new Date(fine.issuedDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Amount Due</p>
                        <p className="text-2xl font-bold text-alert-red">${fine.amount.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => handlePayFine(fine)}
                        disabled={processingPayment === fine._id}
                        className="bg-alert-red hover:bg-red-600 disabled:bg-alert-red/50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors shadow-lg shadow-red-900/20 flex items-center gap-2"
                      >
                        {processingPayment === fine._id ? (
                          <>
                            <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">payment</span>
                            Pay Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payment History Section */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Payment History
            </h3>
            {payments.length > 0 && (
              <button
                onClick={() => fetchPayments()}
                className="text-sm text-primary hover:text-white transition-colors font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Refresh
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50 animate-spin">refresh</span>
              <p className="text-lg">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-text-secondary rounded-xl bg-surface-dark border border-[#3c2348]">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50">receipt</span>
              <p className="text-lg">No payment history</p>
              <p className="text-sm mt-2">Payments you make will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {payments.map((payment) => (
                <div
                  key={payment._id}
                  className={`bg-surface-dark rounded-xl p-5 border ${
                    payment.status === 'completed'
                      ? 'border-emerald-500/30'
                      : payment.status === 'failed'
                      ? 'border-alert-red/30'
                      : 'border-[#3c2348]'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-white font-bold">
                          {payment.fine?.borrowing?.book?.title || 'Fine Payment'}
                        </h4>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            payment.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : payment.status === 'failed'
                              ? 'bg-alert-red/20 text-alert-red border border-alert-red/30'
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          }`}
                        >
                          {payment.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                        <div>
                          <span className="material-symbols-outlined text-base align-middle">calendar_today</span>{' '}
                          {new Date(payment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {payment.completedDate && (
                          <div>
                            <span className="material-symbols-outlined text-base align-middle">check_circle</span>{' '}
                            Completed: {new Date(payment.completedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        )}
                        {payment.paymentMethod && (
                          <div>
                            <span className="material-symbols-outlined text-base align-middle">payment</span>{' '}
                            {payment.paymentMethod === 'stripe' ? 'Card' : payment.paymentMethod}
                          </div>
                        )}
                      </div>
                      {payment.failureReason && (
                        <p className="text-alert-red text-sm mt-2">{payment.failureReason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Amount</p>
                      <p className="text-xl font-bold text-white">${payment.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
