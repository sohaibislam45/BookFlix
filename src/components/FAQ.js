'use client';

import { useState } from 'react';

const faqs = [
  {
    question: "How does the doorstep delivery work?",
    answer: "Once you reserve a book marked for delivery, our team processes it immediately. If requested before 2 PM, we offer same-day delivery within the city limits. Standard delivery takes 24 hours."
  },
  {
    question: "Can I cancel my premium subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time from your account settings. You will continue to have premium access until the end of your current billing period."
  },
  {
    question: "What happens if I return a book late?",
    answer: "For general members, a small fine is applied per day. Premium members enjoy an exemption from late fees for up to 14 days past the due date."
  },
  {
    question: "Is there a limit on how many books I can borrow?",
    answer: "General members can borrow up to 2 books at a time. Premium members can have up to 10 books simultaneously from our physical and digital collections."
  }
];

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <section className="py-20 px-6" id="faq">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] mb-4">FAQ</h2>
          <h3 className="text-3xl md:text-5xl font-black text-white">Got Questions?</h3>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="glass-panel rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 animate-on-scroll"
            >
              <button 
                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <span className="text-lg font-bold text-white">{faq.question}</span>
                <span className={`material-symbols-outlined text-primary transition-transform duration-300 ${activeIndex === index ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              <div className={`transition-all duration-300 ease-in-out ${activeIndex === index ? 'max-h-96 opacity-100 py-6 px-8 border-t border-white/5' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
