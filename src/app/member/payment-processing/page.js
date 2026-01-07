'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscriptionDisplayName } from '@/lib/utils';
import { showError as showErrorAlert } from '@/lib/swal';
import Loader from '@/components/Loader';

function PaymentProcessingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  const createCheckoutSession = useCallback(async (planType) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData._id,
          plan: planType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error || 'Failed to create checkout session';
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('Stripe price ID not configured')) {
          errorMessage = 'Payment system is not fully configured. Please contact support or try again later.';
        } else if (errorMessage.includes('already has an active subscription')) {
          errorMessage = 'You already have an active premium subscription. Please manage it from the billing page.';
        } else if (response.status === 500) {
          errorMessage = 'A server error occurred. Please try again later or contact support if the problem persists.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        setRedirecting(true);
        // Small delay to show redirecting message
        setTimeout(() => {
          window.location.href = data.url;
        }, 500);
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to process payment. Please try again.';
      setError(errorMessage);
      showErrorAlert('Payment Processing Error', errorMessage);
      console.error('Error creating subscription checkout:', err);
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    // Get plan from URL parameters
    const planParam = searchParams.get('plan');
    
    if (!planParam) {
      setError('No subscription plan specified. Please select a plan from the billing page.');
      setLoading(false);
      return;
    }

    if (!['monthly', 'yearly'].includes(planParam)) {
      setError('Invalid subscription plan. Please select a valid plan.');
      setLoading(false);
      return;
    }

    setPlan(planParam);

    // Check if user is authenticated
    if (!userData?._id) {
      setError('You must be logged in to upgrade your subscription.');
      setLoading(false);
      return;
    }

    // Create checkout session
    createCheckoutSession(planParam);
  }, [searchParams, userData, createCheckoutSession]);

  const handleBackToBilling = () => {
    router.push('/member/billing');
  };

  const handleRetry = () => {
    if (plan) {
      createCheckoutSession(plan);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 scroll-smooth">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Processing Payment
          </h2>
          <p className="text-text-secondary text-sm md:text-base">
            Setting up your premium subscription checkout
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-surface-dark rounded-xl p-6 md:p-8 border border-[#3c2348]">
          {error ? (
            <div className="flex flex-col gap-6">
              {/* Error State */}
              <div className="bg-alert-red/10 border border-alert-red/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-alert-red text-3xl">error</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-alert-red mb-2">Payment Processing Error</h3>
                    <p className="text-text-secondary text-sm mb-4">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleRetry}
                        className="bg-primary hover:bg-primary-hover text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">refresh</span>
                        Try Again
                      </button>
                      <button
                        onClick={handleBackToBilling}
                        className="bg-surface-hover hover:bg-surface-hover/80 border border-[#3c2348] text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Back to Billing
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              {plan && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">
                    Selected Plan
                  </p>
                  <p className="text-xl font-bold text-white">
                    {getSubscriptionDisplayName(plan)}
                  </p>
                </div>
              )}
            </div>
          ) : redirecting ? (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              {/* Redirecting State */}
              <div className="flex justify-center mb-3">
                <Loader />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Redirecting to Payment...</h3>
                <p className="text-text-secondary text-sm">
                  You will be redirected to our secure payment page shortly.
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              {/* Loading State */}
              <div className="flex justify-center mb-3">
                <Loader />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Preparing Your Checkout</h3>
                <p className="text-text-secondary text-sm">
                  Please wait while we set up your payment session...
                </p>
              </div>
              {plan && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">
                    Selected Plan
                  </p>
                  <p className="text-xl font-bold text-white">
                    {getSubscriptionDisplayName(plan)}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Premium Benefits Info */}
        {!error && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-4">
              Premium Benefits
            </p>
            <ul className="text-text-secondary text-sm space-y-2">
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
        )}

        {/* Back Button (only show when not loading/redirecting) */}
        {!loading && !redirecting && !error && (
          <div className="flex justify-center">
            <button
              onClick={handleBackToBilling}
              className="text-sm text-text-secondary hover:text-white transition-colors font-medium flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Billing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentProcessingPage() {
  return (
    <Suspense fallback={<Loader />}>
      <PaymentProcessingPageContent />
    </Suspense>
  );
}

