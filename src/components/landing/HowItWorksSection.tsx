import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const SensorPanel = () => (
  <div className="rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]" style={{ background: "#F0F7F3" }}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Device ID</p>
        <p className="font-mono text-sm font-semibold" style={{ fontFamily: "JetBrains Mono" }}>SNS-781001-A</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-muted-foreground">Location</p>
        <p className="text-sm font-medium">Kamrup District</p>
      </div>
    </div>
    <div className="rounded-xl border border-border/40 bg-white/80 divide-y divide-border/30">
      {[
        { label: "TDS", value: "842 ppm", status: "⚠️ HIGH", color: "text-alert-orange" },
        { label: "pH", value: "5.2", status: "⚠️ LOW", color: "text-alert-orange" },
        { label: "Turbidity", value: "78 NTU", status: "🔴 ALERT", color: "text-destructive" },
        { label: "Temp", value: "28.4°C", status: "✅ NORMAL", color: "text-alert-green" },
        { label: "Humidity", value: "84%", status: "✅ NORMAL", color: "text-alert-green" },
      ].map((r) => (
        <div key={r.label} className="flex items-center justify-between px-4 py-2.5" style={{ fontFamily: "JetBrains Mono" }}>
          <span className="text-xs text-muted-foreground w-20">{r.label}</span>
          <span className="text-sm font-semibold">{r.value}</span>
          <span className={`text-xs font-medium ${r.color}`}>{r.status}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2 mt-4">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-green opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-alert-green" />
      </span>
      <span className="text-xs text-muted-foreground">Live · Updated 2m ago</span>
    </div>
  </div>
);

const CommunityPanel = () => (
  <div className="rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]" style={{ background: "#FBF8F3" }}>
    <p className="text-sm font-semibold mb-4">📋 New Case Reported</p>
    <div className="space-y-3 text-sm">
      {[
        { label: "Reported by", value: "Priya Sharma (ASHA Worker)" },
        { label: "Location", value: "Jorhat, 785001" },
        { label: "Symptoms", value: "Diarrhea, Vomiting, Fever" },
      ].map((r) => (
        <div key={r.label} className="flex justify-between">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="font-medium text-right">{r.value}</span>
        </div>
      ))}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Severity</span>
        <span className="font-medium">🟠 Moderate</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Cases this week</span>
        <span className="font-semibold">14</span>
      </div>
    </div>
    <button disabled className="mt-5 w-full rounded-xl bg-primary/10 text-primary py-2 text-sm font-medium cursor-default">
      Submitted ✓
    </button>
  </div>
);

const PredictionPanel = () => (
  <div className="rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]" style={{ background: "#F0F4FB" }}>
    <p className="text-sm font-semibold mb-4">🤖 Prediction Engine · Run #4821</p>
    <div className="rounded-xl border border-border/40 bg-white/80 divide-y divide-border/30">
      <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Pincode</span><span>Risk Score</span><span className="text-right">Level</span>
      </div>
      {[
        { pin: "781001", score: "0.89", level: "🔴 HIGH", color: "text-destructive" },
        { pin: "785001", score: "0.61", level: "🟠 MEDIUM", color: "text-alert-orange" },
        { pin: "786001", score: "0.23", level: "🟢 LOW", color: "text-alert-green" },
        { pin: "784001", score: "0.71", level: "🟠 MEDIUM", color: "text-alert-orange" },
      ].map((r) => (
        <div key={r.pin} className="grid grid-cols-3 px-4 py-2.5" style={{ fontFamily: "JetBrains Mono" }}>
          <span className="text-sm font-medium">{r.pin}</span>
          <span className="text-sm font-semibold">{r.score}</span>
          <span className={`text-xs font-medium text-right ${r.color}`}>{r.level}</span>
        </div>
      ))}
    </div>
    <div className="mt-4 space-y-1 text-xs text-muted-foreground" style={{ fontFamily: "JetBrains Mono" }}>
      <p>Primary factor: <span className="font-medium text-foreground">High TDS + 14 cases reported</span></p>
      <p>Confidence: <span className="font-semibold text-foreground">94.2%</span></p>
    </div>
  </div>
);

const AlertPanel = () => (
  <div className="rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]" style={{ background: "#FFF0F0" }}>
    <p className="text-sm font-bold text-destructive mb-1">🔴 HIGH ALERT ISSUED</p>
    <p className="text-sm font-medium mb-4">Area: Guwahati East, 781001</p>
    <div className="border-t border-border/30 pt-4 space-y-2.5 text-sm">
      <p>📱 SMS sent to <span className="font-semibold">1,240</span> citizens</p>
      <p>📧 Email sent to District Officer</p>
      <p>💬 WhatsApp advisory dispatched</p>
      <p>🗺️ Heatmap updated</p>
    </div>
    <div className="border-t border-border/30 mt-4 pt-4">
      <p className="text-xs text-muted-foreground mb-1">Advice</p>
      <p className="text-sm font-medium italic">"Boil water for 10+ minutes. Report symptoms to your ASHA worker."</p>
      <p className="text-xs text-muted-foreground mt-3">Today, 06:42 AM</p>
    </div>
  </div>
);

const steps = [
  {
    num: "01",
    numColor: "#E8F0EC",
    tag: "IoT Monitoring",
    title: "Sensors continuously monitor your water supply",
    body: "Low-cost IoT sensors measure TDS, pH, turbidity, temperature, and humidity in real time — transmitting data every 15 minutes from remote water sources across the region.",
    icons: ["💧 Real-time TDS & pH readings", "🌡️ Temperature & humidity tracking", "📡 MQTT data transmission"],
    visual: <SensorPanel />,
    textLeft: true,
  },
  {
    num: "02",
    numColor: "#F0EBE3",
    tag: "Community Reporting",
    title: "ASHA workers and hospitals report cases instantly",
    body: "Field health workers, hospitals, and citizens submit symptom reports and water quality complaints through their role-specific dashboards — feeding real data into the AI model continuously.",
    icons: ["👩‍⚕️ ASHA worker mobile reports", "🏥 Hospital case submissions", "👥 Citizen symptom alerts"],
    visual: <CommunityPanel />,
    textLeft: false,
  },
  {
    num: "03",
    numColor: "#E8F0EC",
    tag: "AI Prediction",
    title: "The AI model predicts outbreak risk by pincode",
    body: "Our Random Forest model correlates sensor anomalies with case report spikes to generate a risk score for every pincode — updated every 6 hours, with explainable prediction factors.",
    icons: ["🤖 Random Forest ML model", "📍 Pincode-level risk scoring", "🔍 Explainable AI predictions"],
    visual: <PredictionPanel />,
    textLeft: true,
  },
  {
    num: "04",
    numColor: "#FBE8E8",
    tag: "Instant Alerts",
    title: "Citizens and health workers are alerted immediately",
    body: "The moment risk crosses a threshold, Sanjeevani dispatches SMS, email, and WhatsApp alerts to every registered citizen, ASHA worker, and hospital in the affected pincode — with clear actionable advice.",
    icons: ["📲 SMS + WhatsApp alerts", "🗺️ Live heatmap updated", "💊 Actionable health advice"],
    visual: <AlertPanel />,
    textLeft: false,
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="bg-white py-20 lg:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase mb-4">
            How It Works
          </span>
          <h2 className="font-fraunces text-3xl md:text-[48px] md:leading-[1.15] font-semibold text-foreground mb-4">
            From sensor to safety in four steps
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Here's how Sanjeevani detects, predicts, and prevents outbreaks — automatically.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, i) => {
            const textBlock = (
              <div className="relative flex flex-col justify-center">
                <span
                  className="absolute -top-6 -left-2 font-fraunces text-[120px] font-bold leading-none select-none pointer-events-none"
                  style={{ color: step.numColor }}
                >
                  {step.num}
                </span>
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-widest uppercase mb-3">
                    {step.tag}
                  </span>
                  <h3 className="font-fraunces text-xl md:text-2xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-md">
                    {step.body}
                  </p>
                  <div className="space-y-2">
                    {step.icons.map((ic) => (
                      <p key={ic} className="text-sm text-foreground/80">{ic}</p>
                    ))}
                  </div>
                </div>
              </div>
            );

            const visualBlock = <div>{step.visual}</div>;

            return (
              <div key={step.num}>
                <div className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center py-16 md:py-20`}>
                  {step.textLeft ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
                      >
                        {textBlock}
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as const }}
                      >
                        {visualBlock}
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div
                        className="order-2 md:order-1"
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] as const }}
                      >
                        {visualBlock}
                      </motion.div>
                      <motion.div
                        className="order-1 md:order-2"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
                      >
                        {textBlock}
                      </motion.div>
                    </>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className="border-t" style={{ borderColor: "#EAEAEA" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
