'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { showError } from '@/lib/swal';
import Link from 'next/link';

export default function UpgradePlanPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Check if user is already premium and redirect if so
  useEffect(() => {
    if (userData && !authLoading) {
      const subscriptionType = userData?.subscription?.type || 'free';
      const subscriptionStatus = userData?.subscription?.status || 'active';
      const isPremium = (subscriptionType === 'monthly' || subscriptionType === 'yearly') && subscriptionStatus === 'active';
      
      if (isPremium) {
        // User is already premium, redirect to settings
        router.push('/member/settings?tab=subscription');
      }
    }
  }, [userData, router, authLoading]);

  // Handle scrolling to "Choose Your Plan" section when hash is present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#choose-plan') {
      // Small delay to ensure the page is fully rendered
      setTimeout(() => {
        const element = document.getElementById('choose-plan');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, []);

  const handleUpgrade = async (plan) => {
    if (!userData?._id) {
      showError('Error', 'User data not available. Please try again.');
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);

    try {
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
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      showError('Subscription Error', error.message || 'Failed to start subscription upgrade. Please try again.');
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Premium',
      price: 'Monthly',
      period: 'Billed monthly',
      icon: 'calendar_month',
      popular: false,
      features: [
        'Borrow up to 4 books at once',
        'Extended borrowing period (20 days)',
        '50% discount on late fines (15 BDT/day)',
        'Priority reservation access',
        'Access to premium book collection',
        'Cancel anytime',
      ],
    },
    {
      id: 'yearly',
      name: 'Yearly Premium',
      price: 'Yearly',
      period: 'Billed annually (best value)',
      icon: 'workspace_premium',
      popular: true,
      features: [
        'All monthly features included',
        'Borrow up to 4 books at once',
        'Extended borrowing period (20 days)',
        '50% discount on late fines (15 BDT/day)',
        'Priority reservation access',
        'Access to premium book collection',
        'Save more with annual billing',
      ],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 scroll-smooth">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-primary/20 p-3 rounded-xl">
              <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                stars
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Upgrade to Premium</h2>
          </div>
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto">
            Unlock unlimited access to our premium library features and enjoy enhanced reading experience
          </p>
        </div>

        {/* Benefits Comparison */}
        <div className="bg-surface-dark rounded-2xl border border-[#3c2348] p-6 md:p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">compare_arrows</span>
            Standard vs Premium
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1c1022] rounded-xl border border-[#3c2348] p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-text-secondary">person</span>
                <h4 className="text-lg font-bold text-white">Standard Member</h4>
              </div>
              <ul className="flex flex-col gap-3">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-text-secondary text-xl">book</span>
                  <div>
                    <p className="text-white text-sm font-medium">1 book at once</p>
                    <p className="text-text-secondary text-xs">Limited borrowing capacity</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-text-secondary text-xl">event</span>
                  <div>
                    <p className="text-white text-sm font-medium">7 days borrowing period</p>
                    <p className="text-text-secondary text-xs">Shorter reading time</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-text-secondary text-xl">attach_money</span>
                  <div>
                    <p className="text-white text-sm font-medium">30 BDT/day late fine</p>
                    <p className="text-text-secondary text-xs">Standard fine rate</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/30 p-5 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <h4 className="text-lg font-bold text-white">Premium Member</h4>
              </div>
              <ul className="flex flex-col gap-3">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>book</span>
                  <div>
                    <p className="text-white text-sm font-bold">4 books at once</p>
                    <p className="text-text-secondary text-xs">4x more borrowing capacity</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                  <div>
                    <p className="text-white text-sm font-bold">20 days borrowing period</p>
                    <p className="text-text-secondary text-xs">Nearly 3x longer reading time</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>attach_money</span>
                  <div>
                    <p className="text-white text-sm font-bold">15 BDT/day late fine</p>
                    <p className="text-text-secondary text-xs">50% discount on fines</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div id="choose-plan">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Choose Your Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-surface-dark rounded-2xl border-2 p-6 md:p-8 relative transition-all hover:scale-105 ${
                  plan.popular
                    ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-transparent'
                    : 'border-[#3c2348] hover:border-primary/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="flex flex-col items-center text-center mb-6">
                  <div className={`p-4 rounded-xl mb-4 ${
                    plan.popular ? 'bg-primary/20' : 'bg-[#1c1022]'
                  }`}>
                    <span className={`material-symbols-outlined text-5xl ${
                      plan.popular ? 'text-primary' : 'text-text-secondary'
                    }`} style={{ fontVariationSettings: plan.popular ? "'FILL' 1" : "'FILL' 0" }}>
                      {plan.icon}
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-white mb-2">{plan.name}</h4>
                  <p className="text-text-secondary text-sm mb-1">{plan.period}</p>
                </div>

                <div className="flex flex-col gap-4 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className={`material-symbols-outlined flex-shrink-0 mt-0.5 ${
                        plan.popular ? 'text-primary' : 'text-text-secondary'
                      }`} style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>
                        check_circle
                      </span>
                      <span className="text-text-secondary text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
                    plan.popular
                      ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30'
                      : 'bg-primary/10 hover:bg-primary/20 text-primary border-2 border-primary/30 hover:border-primary/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {loading && selectedPlan === plan.id ? (
                    <>
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>
                        sync
                      </span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Upgrade Now</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-surface-dark rounded-2xl border border-[#3c2348] p-6 md:p-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-bold mb-2">Can I cancel anytime?</h4>
              <p className="text-text-secondary text-sm">
                Yes, you can cancel your subscription at any time from your settings page. Your premium features will remain active until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">What payment methods do you accept?</h4>
              <p className="text-text-secondary text-sm">
                We accept all major credit and debit cards through our secure Stripe payment gateway. Your payment information is encrypted and secure.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">Will I lose access to borrowed books?</h4>
              <p className="text-text-secondary text-sm">
                No, you can keep all currently borrowed books until their due dates, even if you cancel your premium subscription.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-2">How does the upgrade work?</h4>
              <p className="text-text-secondary text-sm">
                After selecting a plan and completing payment, your account will be upgraded immediately. You'll have instant access to all premium features.
              </p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/member/settings"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              arrow_back
            </span>
            <span>Back to Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

