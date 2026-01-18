'use client';

const features = [
  {
    icon: 'speed',
    title: 'Instant Access',
    description: 'Borrow e-books and audiobooks instantly from any device, anywhere in the world.'
  },
  {
    icon: 'local_shipping',
    title: 'Doorstep Delivery',
    description: 'Prefer physical books? We deliver directly to your home within 24 hours.'
  },
  {
    icon: 'event_busy',
    title: 'No Late Fees',
    description: 'Our premium plan eliminates late fees, giving you more time to enjoy your read.'
  },
  {
    icon: 'workspace_premium',
    title: 'Exclusive Content',
    description: 'Access rare manuscripts and first editions available only to our members.'
  }
];

const Features = () => {
  return (
    <section className="py-20 px-6 bg-background-dark/50" id="features">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] mb-4">Why Choose Us</h2>
          <h3 className="text-3xl md:text-5xl font-black text-white">Experience the Future of Libraries</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="glass-panel p-8 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 group hover:-translate-y-2 opacity-0 animate-on-scroll"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-4">{feature.title}</h4>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
