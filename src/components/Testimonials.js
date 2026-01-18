'use client';

const testimonials = [
  {
    name: "Sarah Jenkins",
    role: "Literature Professor",
    content: "Bookflix has completely transformed how I access research material. The delivery service is impeccably fast.",
    rating: 5,
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    name: "David Chen",
    role: "Regular Reader",
    content: "The premium subscription is worth every penny. No late fees and the curated collections are outstanding.",
    rating: 5,
    avatar: "https://i.pravatar.cc/150?u=david"
  },
  {
    name: "Elena Rodriguez",
    role: "Student",
    content: "Best digital library experience I've ever had. User interface is sleek and finding books is so easy.",
    rating: 4,
    avatar: "https://i.pravatar.cc/150?u=elena"
  }
];

const Testimonials = () => {
  return (
    <section className="py-20 px-6 bg-background-dark/30" id="testimonials">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] mb-4">Testimonials</h2>
          <h3 className="text-3xl md:text-5xl font-black text-white">What Our Readers Say</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div key={index} className="glass-panel p-10 rounded-3xl border border-white/5 bg-white/5 relative group">
              <div className="flex gap-1 text-primary mb-6">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-sm">
                    {i < t.rating ? 'star' : 'star_outline'}
                  </span>
                ))}
              </div>
              <p className="text-gray-300 italic mb-8 text-lg leading-relaxed">"{t.content}"</p>
              <div className="flex items-center gap-4">
                <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border-2 border-primary/30" />
                <div>
                  <h4 className="text-white font-bold">{t.name}</h4>
                  <p className="text-gray-500 text-sm">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
