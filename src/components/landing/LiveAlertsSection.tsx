import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const alerts = [
  {
    location: "Guwahati, 781001",
    district: "Kamrup Metro",
    risk: "HIGH RISK",
    riskKey: "high",
    factor: "🦠 Cholera Cases Reported",
    tds: "842 ppm",
    ph: "5.2",
    turbidity: "HIGH",
    time: "Predicted 3h ago",
  },
  {
    location: "Jorhat, 785001",
    district: "Jorhat",
    risk: "MEDIUM RISK",
    riskKey: "medium",
    factor: "💧 High Turbidity",
    tds: "620 ppm",
    ph: "6.1",
    turbidity: "MODERATE",
    time: "Predicted 4h ago",
  },
  {
    location: "Dibrugarh, 786001",
    district: "Dibrugarh",
    risk: "LOW RISK",
    riskKey: "low",
    factor: "✅ All Parameters Normal",
    tds: "310 ppm",
    ph: "7.0",
    turbidity: "LOW",
    time: "Predicted 2h ago",
  },
  {
    location: "Tezpur, 784001",
    district: "Sonitpur",
    risk: "HIGH RISK",
    riskKey: "high",
    factor: "⚠️ pH Anomaly Detected",
    tds: "910 ppm",
    ph: "4.8",
    turbidity: "HIGH",
    time: "Predicted 1h ago",
  },
  {
    location: "Silchar, 788001",
    district: "Cachar",
    risk: "MEDIUM RISK",
    riskKey: "medium",
    factor: "💧 High Turbidity",
    tds: "580 ppm",
    ph: "5.9",
    turbidity: "MODERATE",
    time: "Predicted 5h ago",
  },
  {
    location: "Nagaon, 782001",
    district: "Nagaon",
    risk: "LOW RISK",
    riskKey: "low",
    factor: "✅ All Parameters Normal",
    tds: "280 ppm",
    ph: "7.2",
    turbidity: "LOW",
    time: "Predicted 6h ago",
  },
];

const riskStyles: Record<string, { strip: string; badge: string; badgeText: string; ping: boolean }> = {
  high: {
    strip: "bg-destructive",
    badge: "bg-destructive/10 text-destructive",
    badgeText: "text-destructive",
    ping: true,
  },
  medium: {
    strip: "bg-alert-orange",
    badge: "bg-alert-orange/10 text-alert-orange",
    badgeText: "text-alert-orange",
    ping: false,
  },
  low: {
    strip: "bg-alert-green",
    badge: "bg-alert-green/10 text-alert-green",
    badgeText: "text-alert-green",
    ping: false,
  },
};

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const LiveAlertsSection = () => {
  return (
    <section id="alerts" className="py-20" style={{ backgroundColor: "#F0F7F4" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12 gap-6"
        >
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">
              Real-Time Monitoring
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold text-foreground leading-tight mb-3">
              Live outbreak risk across Northeast India
            </h2>
            <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
              AI predictions updated every 6 hours based on IoT sensor readings
              and community case reports.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-green opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-alert-green" />
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              Last updated 2 mins ago
            </span>
          </div>
        </motion.div>

        {/* Alert Cards Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10"
        >
          {alerts.map((alert) => {
            const style = riskStyles[alert.riskKey];
            return (
              <motion.div
                key={alert.location}
                variants={cardVariant}
                whileHover={{
                  y: -8,
                  boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="group rounded-xl bg-card border border-border overflow-hidden shadow-sm cursor-pointer"
              >
                {/* Top strip */}
                <div className={`h-1 ${style.strip}`} />

                <div className="p-4 space-y-3">
                  {/* Location + district */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{alert.location}</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {alert.district}
                    </span>
                  </div>

                  {/* Risk badge */}
                  <div className="flex justify-center">
                    <span className={`relative inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${style.badge}`}>
                      {alert.risk}
                      {style.ping && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Risk factor */}
                  <p className="text-xs text-center text-muted-foreground font-medium">
                    {alert.factor}
                  </p>

                  {/* Sensor readings */}
                  <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-muted-foreground">
                    <span>TDS: {alert.tds}</span>
                    <span className="text-border">|</span>
                    <span>pH: {alert.ph}</span>
                    <span className="text-border">|</span>
                    <span>Turbidity: {alert.turbidity}</span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                    <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      View Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View All button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Button
              variant="outline"
              className="rounded-full px-6 border-primary text-primary hover:bg-primary/5 font-semibold"
            >
              View All Alerts <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default LiveAlertsSection;
