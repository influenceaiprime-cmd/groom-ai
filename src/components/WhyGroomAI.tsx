export default function WhyGroomAI() {
  const features = [
    { icon: '🧔', title: '5 Beard Styles', desc: 'From clean shaven to full beard, mapped to your real jawline.' },
    { icon: '🎨', title: 'Auto Hair-Color Match', desc: 'AI samples your real hair color - no guessing shades.' },
    { icon: '📋', title: 'Barber Card Export', desc: 'Exact lengths, cheek line, and neckline your barber can follow.' },
    { icon: '🔒', title: '100% On-Device', desc: 'Your photo never uploads anywhere. Processed in your browser only.' },
    { icon: '⚡', title: '10-Second Preview', desc: 'Upload, tap a style, see it - no waiting, no sign-up.' },
    { icon: '💸', title: 'One-Time $6.99', desc: 'Pay once, unlock everything. No subscription, no auto-renewal.' },
  ];

  return (
    <div className="bg-[#111827] rounded-2xl p-6">
      <h2 className="text-xl font-black text-white text-center mb-5">Why GroomAI</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.title} className="text-center space-y-1">
            <p className="text-3xl">{f.icon}</p>
            <p className="text-xs font-extrabold text-amber-300">{f.title}</p>
            <p className="text-[11px] text-gray-400 leading-snug">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
