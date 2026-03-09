import { motion, useScroll, useTransform } from "framer-motion";
import { Play, Map, AlertTriangle, MessageCircle, BarChart3, LayoutDashboard, Bell, FileText, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const },
  }),
};

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Bell, label: "Alerts", active: false },
  { icon: Map, label: "Map", active: false },
  { icon: FileText, label: "Reports", active: false },
  { icon: Bot, label: "Chatbot", active: false },
  { icon: User, label: "Profile", active: false },
];

const alertCards = [
  { emoji: "🔴", level: "High", location: "Kamrup, 781001", desc: "Cholera risk detected in water samples", time: "2 min ago", color: "border-l-destructive bg-destructive/5" },
  { emoji: "🟠", level: "Medium", location: "Jorhat, 785001", desc: "Elevated turbidity in municipal supply", time: "18 min ago", color: "border-l-alert-orange bg-alert-orange/5" },
  { emoji: "🟢", level: "Low", location: "Dibrugarh, 786001", desc: "All parameters within safe range", time: "1 hr ago", color: "border-l-alert-green bg-alert-green/5" },
];

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const dashboardY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-screen flex flex-col overflow-hidden"
    >
      {/* Background landscape image with parallax */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        <img
          src="/images/hero-landscape.jpg"
          alt=""
          className="w-full h-[120%] object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-transparent" />
      </motion.div>

      {/* Content with fade on scroll */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-8"
      >
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 glass-nav border border-border/50 text-foreground text-sm font-medium shadow-sm cursor-default"
          >
            AI-Powered Early Warning System 🌿
          </motion.span>
        </motion.div>

        <motion.h1
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold leading-[1.05] tracking-tight text-foreground text-center max-w-5xl"
        >
          Your Shield Against{" "}
          <br className="hidden sm:block" />
          <em className="italic">Water-Borne</em> Outbreaks
        </motion.h1>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="mt-6 text-base sm:text-lg text-muted-foreground text-center max-w-2xl leading-relaxed"
        >
          Empowering communities with intelligent, real-time surveillance tools
          to detect outbreaks, enhance response, and protect lives — seamlessly.
        </motion.p>

        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mt-8 flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-base font-semibold px-8 h-12 rounded-full shadow-lg">
              Get Started
            </Button>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg"
            aria-label="Watch demo"
          >
            <Play className="w-5 h-5 ml-0.5" />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Floating dashboard mockup with parallax */}
      <motion.div
        custom={4} variants={fadeUp} initial="hidden" animate="visible"
        style={{ y: dashboardY }}
        className="relative z-10 w-[90%] max-w-[900px] mx-auto -mb-32 lg:-mb-48"
      >
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 35px 70px -15px rgba(0,0,0,0.3)" }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="rounded-2xl overflow-hidden shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] border border-border/40 bg-card"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-[hsl(1,77%,55%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(45,100%,51%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(123,41%,45%)]" />
            <div className="ml-3 flex-1 max-w-sm">
              <div className="h-6 rounded-md bg-muted flex items-center px-3">
                <span className="text-[11px] text-muted-foreground font-mono">sanjeevani.health/dashboard</span>
              </div>
            </div>
          </div>

          {/* Dashboard body */}
          <div className="flex min-h-[320px]">
            {/* LEFT: Sidebar */}
            <div className="hidden sm:flex flex-col w-[140px] shrink-0 py-4 px-2 gap-1" style={{ background: "#1A3D2B" }}>
              <div className="flex items-center gap-2 px-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                  <span className="text-[10px] font-bold text-foreground">S</span>
                </div>
                <span className="text-[11px] font-display font-bold text-white/90">Sanjeevani</span>
              </div>
              {sidebarItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                    item.active
                      ? "bg-accent/20 text-accent"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
              ))}
            </div>

            {/* CENTER: Main content */}
            <div className="flex-1 p-4 space-y-3 bg-card">
              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { emoji: "🔴", label: "Active Alerts", value: "7", color: "text-destructive" },
                  { emoji: "📍", label: "Districts Monitored", value: "12", color: "text-primary" },
                  { emoji: "✅", label: "Detection Rate", value: "97.3%", color: "text-alert-green" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-2.5 bg-card">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.emoji} {s.label}</p>
                    <p className={`font-mono text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Heatmap */}
              <div className="rounded-lg border border-border p-3 bg-card">
                <p className="text-[10px] font-semibold text-foreground mb-2">Risk Heatmap — Guwahati Region</p>
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const colors = [
                      "bg-alert-green/40", "bg-alert-green/60", "bg-alert-orange/40",
                      "bg-destructive/30", "bg-alert-green/30", "bg-alert-orange/60",
                      "bg-destructive/50", "bg-alert-green/50", "bg-alert-orange/30",
                      "bg-destructive/40",
                    ];
                    return <div key={i} className={`aspect-square rounded-sm ${colors[i % colors.length]}`} />;
                  })}
                </div>
              </div>

              {/* Alert list items */}
              <div className="space-y-1.5">
                {[
                  { title: "Cholera Risk — Kamrup, 781001", level: "High", borderColor: "border-l-destructive" },
                  { title: "Turbidity Alert — Jorhat, 785001", level: "Medium", borderColor: "border-l-alert-orange" },
                ].map((a) => (
                  <div key={a.title} className={`flex items-center gap-2 text-[10px] border-l-2 ${a.borderColor} pl-2 py-1`}>
                    <span className="font-semibold text-foreground">{a.level}</span>
                    <span className="text-muted-foreground">{a.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Alert panel */}
            <div className="hidden md:block w-[200px] shrink-0 border-l border-border p-3 bg-muted/20 space-y-2">
              <p className="text-[11px] font-semibold text-foreground mb-2">Active Alerts</p>
              {alertCards.map((a) => (
                <div key={a.location} className={`rounded-lg border-l-[3px] ${a.color} p-2 border border-border`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px]">{a.emoji}</span>
                    <span className="text-[10px] font-bold text-foreground">{a.level}</span>
                  </div>
                  <p className="text-[10px] font-semibold text-foreground">{a.location}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{a.desc}</p>
                  <p className="text-[8px] text-muted-foreground mt-1">{a.time}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent rounded-b-2xl pointer-events-none" />
      </motion.div>
    </section>
  );
};

export default HeroSection;
