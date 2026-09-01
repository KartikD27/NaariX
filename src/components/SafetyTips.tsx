import { Share2, Lightbulb, Car, Heart, Phone, Eye, Smartphone, Shield } from "lucide-react";

const TIPS = [
  {
    icon: Share2,
    title: "Share Location Before Solo Travel",
    text: "Always share your live location with a trusted contact before heading out alone.",
  },
  {
    icon: Lightbulb,
    title: "Avoid Poorly-Lit Shortcuts",
    text: "Stick to well-lit main roads even if the shortcut is faster, especially after dark.",
  },
  {
    icon: Car,
    title: "Verify Cab & Driver Details",
    text: "Check the vehicle number and driver ID before getting in. Share trip details with family.",
  },
  {
    icon: Heart,
    title: "Trust Your Instincts",
    text: "If a situation or person feels unsafe, leave immediately. Your intuition is your best defense.",
  },
  {
    icon: Phone,
    title: "Keep a Decoy Call Ready",
    text: "Have a fake call set up to exit uncomfortable situations gracefully.",
  },
  {
    icon: Smartphone,
    title: "Avoid Phone Distraction in Isolated Areas",
    text: "Stay alert in isolated spots — keep your phone accessible but don't lose situational awareness.",
  },
];

export default function SafetyTips() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-teal-950 to-slate-900 p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h2 className="text-teal-100 text-lg font-bold">Safety Tips</h2>
            <p className="text-teal-300/60 text-xs">NCW-style guidance for safer travel</p>
          </div>
        </div>

        <div className="space-y-3">
          {TIPS.map((tip, i) => (
            <div key={i} className="glass-card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0">
                <tip.icon className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-teal-100 font-semibold text-sm mb-1">{tip.title}</h3>
                <p className="text-teal-300/70 text-sm leading-relaxed">{tip.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-4 mt-4 border-l-4 border-coral-500">
          <h3 className="text-coral-400 font-semibold text-sm mb-2">Emergency Numbers</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Police", "100"],
              ["Women's Helpline", "1091"],
              ["Ambulance", "108"],
              ["Emergency", "112"],
            ].map(([name, num]) => (
              <a
                key={num}
                href={`tel:${num}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-teal-100 text-sm">{name}</span>
                <span className="text-coral-400 font-bold text-sm">{num}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
