import { motion } from "framer-motion";
import { BarChart3, AlertTriangle, Users, Clock } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const AICopilotSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-section-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold text-foreground mb-6 leading-tight">
              Upskill your health workers with an AI copilot
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Give your ASHA workers a powerful AI assistant that surfaces the
              right patient data, alerts, and guidance — reducing response time
              from days to minutes.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock, label: "90% faster response", desc: "Minutes, not days" },
                { icon: AlertTriangle, label: "Early warnings", desc: "AI-driven alerts" },
                { icon: Users, label: "Community reach", desc: "2,400+ ASHA workers" },
                { icon: BarChart3, label: "Data insights", desc: "Actionable analytics" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg">
                  <item.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — ASHA dashboard mockup in browser frame */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
          >
            <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-alert-orange/60" />
                <div className="w-3 h-3 rounded-full bg-alert-green/60" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">
                  sanjeevani.app/dashboard/asha
                </span>
              </div>

              {/* Mockup content */}
              <div className="p-5 space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Active Cases", value: "23", color: "text-destructive" },
                    { label: "Pending Surveys", value: "8", color: "text-alert-orange" },
                    { label: "Alerts Today", value: "5", color: "text-primary" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border p-3 bg-card">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                      <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Mini heatmap */}
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs font-semibold text-foreground mb-2">Community Risk Map</p>
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: 18 }).map((_, i) => {
                      const colors = ["bg-alert-green/40", "bg-alert-orange/50", "bg-destructive/40", "bg-alert-green/30"];
                      return (
                        <div
                          key={i}
                          className={`aspect-square rounded-sm ${colors[i % colors.length]}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-4 gap-2">
                  {["Post Survey", "Report Case", "Post Article", "Send Alert"].map((a) => (
                    <div key={a} className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="text-[10px] font-semibold text-primary">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AICopilotSection;
