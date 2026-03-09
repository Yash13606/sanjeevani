import { motion } from "framer-motion";
import { ChevronRight, Activity, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { icon: MapPin, value: "12", label: "Districts Monitored" },
  { icon: Activity, value: "97.3%", label: "Early Detection Rate" },
  { icon: Users, value: "2,400+", label: "ASHA Workers" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden pt-20"
      style={{ backgroundColor: "hsl(40, 50%, 97%)" }}
    >
      {/* Radial glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(161, 68%, 51%) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {/* Eyebrow */}
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                </span>
                AI-Powered Early Warning
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.1] tracking-tight text-foreground"
            >
              Detect Water-Borne Outbreaks{" "}
              <span className="text-accent">Before They Strike</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-lg text-muted-foreground leading-relaxed max-w-xl"
            >
              Sanjeevani integrates real-time IoT water sensors, ASHA community
              reports, and a Random Forest AI model to predict and prevent disease
              outbreaks in Northeast India's remote tribal regions.
            </motion.p>

            {/* CTAs */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold px-8 h-12 rounded-lg shadow-lg shadow-accent/20"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base font-medium px-8 h-12 rounded-lg border-border"
              >
                See How It Works
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>

            {/* Trust stats */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-8 pt-4"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-lg font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Dashboard mockup */}
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="relative hidden lg:block"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border bg-card">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-alert-orange/60" />
                <div className="w-3 h-3 rounded-full bg-alert-green/60" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">
                  sanjeevani.app/dashboard
                </span>
              </div>
              <img
                src="/images/hero-visual.png"
                alt="Sanjeevani Dashboard Preview showing heatmap and alerts"
                className="w-full h-auto"
                loading="eager"
              />
            </div>
            {/* Glow beneath */}
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full opacity-30 blur-2xl"
              style={{ background: "hsl(161, 68%, 51%)" }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
