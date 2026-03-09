import { motion } from "framer-motion";
import { Play, Map, AlertTriangle, MessageCircle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const },
  }),
};

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col overflow-hidden"
    >
      {/* Background landscape image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero-landscape.jpg"
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Subtle overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-8">
        {/* Announcement badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 glass-nav border border-border/50 text-foreground text-sm font-medium shadow-sm">
            AI-Powered Early Warning System 🌿
          </span>
        </motion.div>

        {/* Giant headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold leading-[1.05] tracking-tight text-foreground text-center max-w-5xl"
        >
          Your Shield Against{" "}
          <br className="hidden sm:block" />
          <em className="italic">Water-Borne</em> Outbreaks
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 text-base sm:text-lg text-muted-foreground text-center max-w-2xl leading-relaxed"
        >
          Empowering communities with intelligent, real-time surveillance tools
          to detect outbreaks, enhance response, and protect lives — seamlessly.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 flex items-center gap-4"
        >
          <Button
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90 text-base font-semibold px-8 h-12 rounded-full shadow-lg"
          >
            Get Started
          </Button>
          <button
            className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 transition-colors shadow-lg"
            aria-label="Watch demo"
          >
            <Play className="w-5 h-5 ml-0.5" />
          </button>
        </motion.div>
      </div>

      {/* Floating dashboard mockup at bottom */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mb-32 lg:-mb-48"
      >
        <div className="rounded-t-2xl lg:rounded-t-3xl overflow-hidden shadow-2xl shadow-foreground/10 border border-border/50 bg-card">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-destructive/50" />
            <div className="w-3 h-3 rounded-full bg-alert-orange/50" />
            <div className="w-3 h-3 rounded-full bg-alert-green/50" />
            <div className="ml-3 flex-1 max-w-xs">
              <div className="h-6 rounded-md bg-muted flex items-center px-3">
                <span className="text-[11px] text-muted-foreground font-mono">sanjeevani.app/dashboard</span>
              </div>
            </div>
          </div>

          {/* Dashboard content mockup */}
          <div className="p-4 sm:p-6 bg-card">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">S</span>
                </div>
                <span className="font-display text-sm font-bold text-foreground">Sanjeevani Dashboard</span>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-2">
                <div className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center">Welcome, Priya</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { label: "Districts Monitored", value: "12", icon: Map, color: "text-primary" },
                { label: "Active Alerts", value: "7", icon: AlertTriangle, color: "text-destructive" },
                { label: "Detection Rate", value: "97.3%", icon: BarChart3, color: "text-alert-green" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Mini heatmap */}
              <div className="sm:col-span-3 rounded-xl border border-border p-4 bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Map className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Risk Heatmap — Guwahati Region</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const levels = ["bg-alert-green/30", "bg-alert-green/50", "bg-alert-orange/40", "bg-destructive/30", "bg-alert-green/40", "bg-alert-orange/50"];
                    return (
                      <div key={i} className={`aspect-square rounded-sm ${levels[i % levels.length]}`} />
                    );
                  })}
                </div>
              </div>

              {/* Alert list */}
              <div className="sm:col-span-2 rounded-xl border border-border p-4 bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-semibold text-foreground">Active Alerts</span>
                </div>
                <div className="space-y-2">
                  {[
                    { title: "Cholera Risk — 781001", level: "High", color: "bg-destructive text-primary-foreground" },
                    { title: "Turbidity Alert — 781005", level: "Medium", color: "bg-alert-orange text-primary-foreground" },
                    { title: "Safe Zone — 781009", level: "Low", color: "bg-alert-green text-primary-foreground" },
                  ].map((alert) => (
                    <div key={alert.title} className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alert.color}`}>
                        {alert.level}
                      </span>
                      <span className="text-muted-foreground truncate">{alert.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
