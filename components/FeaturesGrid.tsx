import { Scissors, Palette, FileText, ShieldCheck, Zap, CreditCard } from 'lucide-react';

export function FeaturesGrid() {
  const features = [
    {
      icon: <Scissors className="w-6 h-6 text-cyan-400" />,
      title: "5 Beard Styles",
      desc: "From clean shaven to full beard, mapped to your real jawline."
    },
    {
      icon: <Palette className="w-6 h-6 text-cyan-400" />,
      title: "Auto Hair-Color Match",
      desc: "AI samples your real hair color—no guessing shades."
    },
    {
      icon: <FileText className="w-6 h-6 text-cyan-400" />,
      title: "Barber Card Export",
      desc: "Exact lengths, cheek line, and neckline your barber can follow."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-cyan-400" />,
      title: "100% On-Device",
      desc: "Your photo never uploads anywhere. Processed in your browser only."
    },
    {
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      title: "10-Second Preview",
      desc: "Upload, tap a style, see it—no waiting, no sign-up."
    },
    {
      icon: <CreditCard className="w-6 h-6 text-cyan-400" />,
      title: "One-Time $6.99",
      desc: "Pay once, unlock everything. No subscription, no auto-renewal."
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-12">
      {features.map((item, idx) => (
        <div key={idx} className="bg-[#121216] border border-gray-800/80 p-5 rounded-xl text-left">
          <div className="p-2.5 bg-cyan-950/40 border border-cyan-900/50 rounded-lg w-fit mb-3">
            {item.icon}
          </div>
          <h4 className="font-semibold text-white text-base">{item.title}</h4>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}
