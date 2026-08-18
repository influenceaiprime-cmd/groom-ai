export default function WhyGroomAI() {
  const features = [
    { num: '01', title: 'Five beard styles', desc: 'From clean shaven to full beard, mapped to your real jawline.' },
    { num: '02', title: 'Auto hair-color match', desc: 'AI samples your real hair color - no guessing shades.' },
    { num: '03', title: 'Barber Card export', desc: 'Exact lengths, cheek line, and neckline your barber can follow.' },
    { num: '04', title: '100% on-device', desc: 'Your photo never uploads anywhere. Processed in your browser only.' },
    { num: '05', title: 'Ten-second preview', desc: 'Upload, tap a style, see it - no waiting, no sign-up.' },
    { num: '06', title: 'One-time $6.99', desc: 'Pay once, unlock everything. No subscription, no auto-renewal.' },
  ];

  return (
    <div className="p-6" style={{ background: 'var(--ink-1)', border: '1px solid var(--hairline)' }}>
      <p className="text-xs tracking-wider uppercase text-center mb-5" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--steel-1)' }}>Why GroomAI</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
        {features.map((f) => (
          <div key={f.num} className="text-left">
            <p className="mono text-[10px]" style={{ color: 'var(--steel-3)' }}>{f.num}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--steel-1)' }}>{f.title}</p>
            <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--steel-3)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
