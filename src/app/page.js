'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import { showError } from '@/lib/swal';

export default function Home() {
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [processingSubscription, setProcessingSubscription] = useState(false);
  const { user, userData } = useAuth();

  const togglePricingModal = () => {
    setPricingModalOpen(!pricingModalOpen);
  };

  const handleUpgradeSubscription = async (plan) => {
    if (!user || !userData) {
      // Redirect to login if not logged in
      window.location.href = '/login';
      return;
    }

    // Validate plan value
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      showError('Invalid Plan', 'Please select a valid subscription plan.');
      return;
    }

    // Validate user ID
    if (!userData._id) {
      showError('User Error', 'User information is incomplete. Please try logging in again.');
      return;
    }

    try {
      setProcessingSubscription(true);

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
      console.error('Error creating subscription checkout:', err);
      showError('Subscription Error', err.message || 'Failed to start subscription. Please try again.');
      setProcessingSubscription(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 transition-all duration-300 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-3xl text-primary">auto_stories</span>
            <h1 className="text-white text-2xl font-black tracking-tighter">Bookflix</h1>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <UserProfile />
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <button
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-md text-sm font-bold transition-all shadow-[0_0_15px_rgba(170,31,239,0.3)] hover:shadow-[0_0_20px_rgba(170,31,239,0.5)]"
                  onClick={togglePricingModal}
                >
                  Join Now
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-hero-gradient z-10"></div>
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCyDl6Ydl0fjXvdPpWK70bp9YmcxzROe9R8B6O9TQ2RHas7rIWvoNAiylNrZwXf5bUdZGXamxLoHuaQ6W8Bghg0P3g8gRItLPO2U5PyBQKtQJCliTZOoeKK07Lak-RZlAWwVY-ldaPqTLQjxA7ME5uUi7BYhpK77Lc8Q9VyHVgpud7xSs_yJJZXvzl0mYJGkHIfbClEDgxpjOWWJkeSUcva2YiDmLH7plqW280-oEaVwdPcclydgX074xXCDbGwVreuqDKEIqc1kY"
            alt="Library bookshelf background"
            fill
            className="object-cover opacity-20 blur-sm scale-110"
            priority
            quality={75}
          />
        </div>
        <div className="relative z-20 w-full max-w-4xl px-4 flex flex-col items-center text-center mt-10">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight mb-4 drop-shadow-xl">
            Your Library,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#aa1fef] to-[#c084fc]">
              Reimagined.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl font-light">
            Reserve online, pick up in-store, or get it delivered directly to your doorstep.
          </p>
          <div className="w-full max-w-2xl group">
            <label className="glass-panel flex items-center w-full h-16 rounded-full px-2 transition-all group-focus-within:bg-black/80 group-focus-within:border-primary/50">
              <div className="pl-4 pr-2 text-primary transition-colors">
                <span className="material-symbols-outlined text-2xl">search</span>
              </div>
              <input
                className="bg-transparent border-none text-white w-full h-full text-lg placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                placeholder="Search by Title, Author, or ISBN..."
                type="text"
              />
              <button className="hidden sm:flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-full h-12 px-6 font-semibold ml-2 transition-all shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-lg text-white">search</span>
                Search
              </button>
            </label>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="relative z-20 -mt-32 pb-20 space-y-12 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        {/* Stats */}
        <div className="glass-panel w-full rounded-2xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">15k+</span>
              <span className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">auto_stories</span>
                Books
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">1.2k</span>
              <span className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">headphones</span>
                Audiobooks
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">50+</span>
              <span className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">domain</span>
                Libraries
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">24/7</span>
              <span className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">public</span>
                Access
              </span>
            </div>
          </div>
        </div>

        {/* Top Rated Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between px-2">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">Top Rated This Week</h2>
            <Link
              className="text-xs font-semibold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1"
              href="#"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="relative group/carousel">
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 pt-4 px-2 no-scrollbar scroll-smooth snap-x">
              {[
                { title: 'The Midnight Library', author: 'Matt Haig', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPkVGkJiLI03swl6IeCwtbp1kcCtVee0O92rNwdQIMKxES-Yl604B6DNaRBqHiT-WjjejNW4j4A9uhnIxY_4EmUAedGzokJ8_vfTWlE1zz56FHFSY7Yfu7oQAssOkeiF_iXyeFqOCPbGYcwHuckOSeUkr1BNUHwPoNPOZizLpn4ZmNH4E_wLU-KSYdl591Y4BxlNthLBMxIumm2Qy4Z7pFif6oUuvLZCujqocw1VMEKykVfKzsY3fBzX3fFYHoo7h6rPhi5J_a1xo' },
                { title: 'Project Hail Mary', author: 'Andy Weir', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDM3Qy-wPH8-3c-QtIqMgaWX_KyiEXtgbryq5BTpAztR4RbiH4pVHqdjtbI9bS9N2_DMAxjvJz17PvdEkdn1e-n2taKASZcu5mcH70styS1c2FN9TGs-tBLxXFf0z2lY9BfpQTG3Vh3WVOwnrwCM-6RCVb17jNMqZ2dbysuU0xjhQavzsz0ST9nFseXp8zlthH-90qBtdsDHOrNswcgk-CQOVCfminR2kM_bRWUeMoDPjZDN-3KUv4tuttMPzBQBmmCKvqTrZRF0fU' },
                { title: 'Klara and the Sun', author: 'Kazuo Ishiguro', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCj98KbnzSpxoTqikaNWVGoSQWN3F6nz7xsdEM-ALagKI3BiRzAzLLVkrwgxIS26jBRNmk-amKrX3v-ffIdERmkQk3Lo6uKA6FAw1-DmP-qYJSu_zMItW1TlFnbEjFCKMrW0oIzpTQbEfC5nljW1GeYMnJb56bpUNTT3GDLM0l0kW-IjU3K_bTtrm7zozWICjgwJHqSLmW1BfChjvCSzYsYtNmSzRlaEBSIaH5ycJerimbC3NoznMSriAeIeWz4ByP11OJRC5pQ_WU' },
                { title: 'Where the Crawdads Sing', author: 'Delia Owens', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmOUeyKDZ2G_Bstqjjblqqlam7aWaDgigxyuK4evgwTUIGQJMvafmCCG38_l-wGlBkarTOBbkhwvG5_5SecQGQvPLkUB35_gXZOBT4x29mOT6Bbd1aV4ASLr5aZDUAJnsyLAc4QpseYSrhNdSXMzmbjyijCs4DpfCBUTbO_whgmlja_EsouO09HPrvdRnfTbU55I7LDHeaNs-0obI9KN2hatducD3EN83BHw_W9sCpgz8_-GWTb9Kjc_LdjRyjCuKsvJRElxnkz3U' },
                { title: 'Circe', author: 'Madeline Miller', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcQ14wur7aXNUHMha0ihywimkm5eFnIFULpbXmpGjMRsBgObWnGgh-lCpSqfuh0aGmQ2kh95B1Zlstsj3WnQvnHwfI2Fs67_BQQMj5praIoTLGHQK9zhVIfPH38K18mo6ztzr6JbTS67UxQIEgEtpjwqh4iX8taRFEOktG8MwQy3ZPb85Myfr84I-EysYuvpCO2XDKhmOLCrjO0_qIiembo6zBHylSLvOzBbAuGClPKRBt_hL7dKG5sw5GcQCyNS_hPGe3OoE2fk0' },
                { title: 'Dune', author: 'Frank Herbert', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWIVE_ktKG2xlUtm-Wy0J-C8iqaEYLd24D3PkutxrKZAK8zOdL9-tI0cklpaKL4nPZnkkqVXcLxOrXgsBRWpf92HO30ZcjXb8QjoTZ-whDUbxq-q--nsTosQ5CBkL_KvxLgAmrv5WyHjz5XZP1mDfbwMMshpVmrguPCAYc0RlyDqPxqnBmR1lI-Rz1jhixls6SX_cHZijkfRJVquW6QkMfr2tBpSeEoGK83EWOWjsIAq4UfInCr-6iH9taovNZT35bhB_hqiE_fHA' },
              ].map((book, index) => (
                <div key={index} className="flex-none w-[160px] md:w-[200px] snap-start group cursor-pointer">
                  <div className="card-hover-effect relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/50">
                    <Image
                      src={book.image}
                      alt={`${book.title} by ${book.author}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 160px, 200px"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <button className="bg-primary/20 backdrop-blur-md border border-white/20 text-white font-medium py-2 px-4 rounded-sm text-sm hover:bg-primary/40 transition-colors w-full">
                        Details
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-white text-sm font-semibold truncate">{book.title}</h3>
                    <p className="text-gray-400 text-xs">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fresh New Arrivals Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between px-2">
            <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">Fresh New Arrivals</h2>
            <Link
              className="text-xs font-semibold text-primary hover:text-white uppercase tracking-wider flex items-center gap-1"
              href="#"
            >
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="relative group/carousel">
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 pt-4 px-2 no-scrollbar scroll-smooth snap-x">
              {[
                { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCyDl6Ydl0fjXvdPpWK70bp9YmcxzROe9R8B6O9TQ2RHas7rIWvoNAiylNrZwXf5bUdZGXamxLoHuaQ6W8Bghg0P3g8gRItLPO2U5PyBQKtQJCliTZOoeKK07Lak-RZlAWwVY-ldaPqTLQjxA7ME5uUi7BYhpK77Lc8Q9VyHVgpud7xSs_yJJZXvzl0mYJGkHIfbClEDgxpjOWWJkeSUcva2YiDmLH7plqW280-oEaVwdPcclydgX074xXCDbGwVreuqDKEIqc1kY' },
                { title: 'Atomic Habits', author: 'James Clear', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDM3Qy-wPH8-3c-QtIqMgaWX_KyiEXtgbryq5BTpAztR4RbiH4pVHqdjtbI9bS9N2_DMAxjvJz17PvdEkdn1e-n2taKASZcu5mcH70styS1c2FN9TGs-tBLxXFf0z2lY9BfpQTG3Vh3WVOwnrwCM-6RCVb17jNMqZ2dbysuU0xjhQavzsz0ST9nFseXp8zlthH-90qBtdsDHOrNswcgk-CQOVCfminR2kM_bRWUeMoDPjZDN-3KUv4tuttMPzBQBmmCKvqTrZRF0fU' },
                { title: 'The Invisible Life of Addie LaRue', author: 'V.E. Schwab', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCj98KbnzSpxoTqikaNWVGoSQWN3F6nz7xsdEM-ALagKI3BiRzAzLLVkrwgxIS26jBRNmk-amKrX3v-ffIdERmkQk3Lo6uKA6FAw1-DmP-qYJSu_zMItW1TlFnbEjFCKMrW0oIzpTQbEfC5nljW1GeYMnJb56bpUNTT3GDLM0l0kW-IjU3K_bTtrm7zozWICjgwJHqSLmW1BfChjvCSzYsYtNmSzRlaEBSIaH5ycJerimbC3NoznMSriAeIeWz4ByP11OJRC5pQ_WU' },
                { title: 'Educated', author: 'Tara Westover', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmOUeyKDZ2G_Bstqjjblqqlam7aWaDgigxyuK4evgwTUIGQJMvafmCCG38_l-wGlBkarTOBbkhwvG5_5SecQGQvPLkUB35_gXZOBT4x29mOT6Bbd1aV4ASLr5aZDUAJnsyLAc4QpseYSrhNdSXMzmbjyijCs4DpfCBUTbO_whgmlja_EsouO09HPrvdRnfTbU55I7LDHeaNs-0obI9KN2hatducD3EN83BHw_W9sCpgz8_-GWTb9Kjc_LdjRyjCuKsvJRElxnkz3U' },
                { title: 'The Song of Achilles', author: 'Madeline Miller', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcQ14wur7aXNUHMha0ihywimkm5eFnIFULpbXmpGjMRsBgObWnGgh-lCpSqfuh0aGmQ2kh95B1Zlstsj3WnQvnHwfI2Fs67_BQQMj5praIoTLGHQK9zhVIfPH38K18mo6ztzr6JbTS67UxQIEgEtpjwqh4iX8taRFEOktG8MwQy3ZPb85Myfr84I-EysYuvpCO2XDKhmOLCrjO0_qIiembo6zBHylSLvOzBbAuGClPKRBt_hL7dKG5sw5GcQCyNS_hPGe3OoE2fk0' },
                { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWIVE_ktKG2xlUtm-Wy0J-C8iqaEYLd24D3PkutxrKZAK8zOdL9-tI0cklpaKL4nPZnkkqVXcLxOrXgsBRWpf92HO30ZcjXb8QjoTZ-whDUbxq-q--nsTosQ5CBkL_KvxLgAmrv5WyHjz5XZP1mDfbwMMshpVmrguPCAYc0RlyDqPxqnBmR1lI-Rz1jhixls6SX_cHZijkfRJVquW6QkMfr2tBpSeEoGK83EWOWjsIAq4UfInCr-6iH9taovNZT35bhB_hqiE_fHA' },
              ].map((book, index) => (
                <div key={index} className="flex-none w-[160px] md:w-[200px] snap-start group cursor-pointer">
                  <div className="card-hover-effect relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/50">
                    <Image
                      src={book.image}
                      alt={`${book.title} by ${book.author}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 160px, 200px"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <button className="bg-primary/20 backdrop-blur-md border border-white/20 text-white font-medium py-2 px-4 rounded-sm text-sm hover:bg-primary/40 transition-colors w-full">
                        Details
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-white text-sm font-semibold truncate">{book.title}</h3>
                    <p className="text-gray-400 text-xs">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <div className="relative rounded-3xl overflow-hidden mt-12 group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#aa1fef] to-[#7000ff] opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative z-10 px-8 py-16 md:px-20 md:py-20 flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left border border-white/10 rounded-3xl bg-background-dark/60 backdrop-blur-xl">
              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  Ready to Reimagine Your Reading?
                </h2>
                <p className="text-gray-300 text-lg font-light leading-relaxed">
                  Join Bookflix today and get instant access to our curated collection. No late fees on the premium plan.
                </p>
                <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-400 pt-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                    Cancel anytime
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                    Free 7-day trial
                  </span>
                </div>
              </div>
              <button
                className="shrink-0 bg-white text-black hover:bg-gray-100 px-10 py-5 rounded-full font-bold text-lg transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 flex items-center gap-2"
                onClick={togglePricingModal}
              >
                Get Started Now <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/5 py-16 px-6 mt-auto">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-primary">auto_stories</span>
              <h2 className="text-white text-xl font-bold">Bookflix</h2>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Reinventing the way you discover, borrow, and read books. The modern library experience.
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Browse</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Top Rated
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Genres
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Audiobooks
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Support</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Library Policies
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Help Center
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link className="hover:text-primary transition-colors" href="#">
                  Locations
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Connect</h3>
            <div className="flex gap-4">
              <Link
                className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-white hover:bg-primary transition-colors"
                href="#"
              >
                <span className="material-symbols-outlined text-lg">public</span>
              </Link>
              <Link
                className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-white hover:bg-primary transition-colors"
                href="#"
              >
                <span className="material-symbols-outlined text-lg">mail</span>
              </Link>
              <Link
                className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-white hover:bg-primary transition-colors"
                href="#"
              >
                <span className="material-symbols-outlined text-lg">group</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-white/5 text-center text-gray-500 text-xs">
          © 2024 Bookflix Library Services. All rights reserved.
        </div>
      </footer>

      {/* Pricing Modal */}
      {pricingModalOpen && (
        <div
          aria-labelledby="modal-title"
          aria-modal="true"
          className="fixed inset-0 z-[100]"
          id="pricing-modal"
          role="dialog"
        >
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" onClick={togglePricingModal}></div>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-2xl bg-background-dark border border-white/10 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-5xl">
                <div className="absolute top-4 right-4 z-20">
                  <button
                    className="text-gray-400 hover:text-white transition-colors"
                    onClick={togglePricingModal}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>
                <div className="px-8 py-10 sm:p-12">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
                    <p className="text-gray-400">Unlock the full potential of your library experience.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Plan */}
                    <div className="rounded-xl border border-white/10 bg-surface-dark p-6 hover:border-primary/50 transition-colors flex flex-col">
                      <h3 className="text-xl font-bold text-white">Free Plan</h3>
                      <div className="mt-4 flex items-baseline text-white">
                        <span className="text-4xl font-black tracking-tight">0 ৳</span>
                        <span className="ml-1 text-sm text-gray-400">/month</span>
                      </div>
                      <ul className="mt-6 space-y-4 flex-1 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          7-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          15% standard late fine
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Basic reservation queue
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          In-library pickup only
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Email notifications
                        </li>
                      </ul>
                      <Link
                        href="/register"
                        className="mt-8 w-full rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-bold text-white hover:bg-white/5 transition-colors text-center"
                      >
                        Free registration
                      </Link>
                    </div>

                    {/* Monthly Premium */}
                    <div className="rounded-xl border border-primary bg-purple-200 p-6 relative flex flex-col transform md:-translate-y-2 shadow-[0_4px_20px_rgba(170,31,239,0.15)]">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        Popular
                      </div>
                      <h3 className="text-xl font-bold text-white">Monthly Premium</h3>
                      <div className="mt-4 flex items-baseline text-white">
                        <span className="text-4xl font-black tracking-tight">200 ৳</span>
                        <span className="ml-1 text-sm text-gray-400">/month</span>
                      </div>
                      <ul className="mt-6 space-y-4 flex-1 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          20-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          5% late fine discount
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Advance reservation
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Home delivery
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Push & SMS notifications
                        </li>
                      </ul>
                      <button
                        onClick={() => handleUpgradeSubscription('monthly')}
                        disabled={processingSubscription}
                        className="mt-8 w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/25"
                      >
                        {processingSubscription ? 'Processing...' : user ? 'Get Monthly' : 'Sign Up for Monthly'}
                      </button>
                    </div>

                    {/* Yearly Premium */}
                    <div className="rounded-xl border border-white/10 bg-surface-dark p-6 hover:border-primary/50 transition-colors flex flex-col">
                      <h3 className="text-xl font-bold text-white">Yearly Premium</h3>
                      <div className="mt-4 flex flex-col text-white">
                        <div className="flex items-baseline">
                          <span className="text-4xl font-black tracking-tight">2,000 ৳</span>
                          <span className="ml-1 text-sm text-gray-400">/year</span>
                        </div>
                        <span className="text-xs text-green-400 mt-1 font-semibold">Save 17%</span>
                      </div>
                      <ul className="mt-6 space-y-4 flex-1 text-sm text-gray-300">
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          20-day borrowing
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          10% late fine discount
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Priority advance reservation
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Free home delivery
                        </li>
                        <li className="flex items-start">
                          <span className="material-symbols-outlined text-primary text-lg mr-2 shrink-0">check</span>
                          Push, SMS & priority support
                        </li>
                      </ul>
                      <button
                        onClick={() => handleUpgradeSubscription('yearly')}
                        disabled={processingSubscription}
                        className="mt-8 w-full rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingSubscription ? 'Processing...' : user ? 'Get Yearly' : 'Sign Up for Yearly'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
