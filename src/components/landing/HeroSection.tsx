import { motion } from "framer-motion";
import { Play, Hospital, Droplets, Bot, BarChart3, Smartphone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const },
  }),
};

const floatingIcons = [
  { icon: BarChart3, top: "22%", left: "18%", rotate: -6, delay: 0 },
  { icon: Hospital, top: "12%", left: "32%", rotate: 4, delay: 0.4 },
  { icon: Droplets, top: "8%", left: "48%", rotate: -2, delay: 0.8 },
  { icon: Bot, top: "12%", left: "64%", rotate: 5, delay: 1.2 },
  { icon: Smartphone, top: "22%", left: "78%", rotate: -8, delay: 1.6 },
  { icon: MapPin, top: "30%", left: "24%", rotate: 7, delay: 2 },
];

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        background: `
          linear-gradient(to bottom, transparent 0%, rgba(34,85,34,0.08) 70%, rgba(20,60,20,0.25) 100%),
          linear-gradient(to bottom, #FAFAFA 0%, #EEF6F2 40%, #C5DDD5 65%, #4A7C59 85%, #2D5A3D 100%)
        `,
      }}
    >
      {/* SVG Tree silhouettes at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none">
        <svg viewBox="0 0 1440 320" className="w-full h-auto block" preserveAspectRatio="none">
          {/* Far treeline */}
          <path
            d="M0,280 Q60,200 120,240 Q180,180 240,220 Q300,160 360,200 Q420,140 480,190 Q540,130 600,180 Q660,120 720,170 Q780,110 840,160 Q900,100 960,150 Q1020,90 1080,140 Q1140,80 1200,130 Q1260,70 1320,120 Q1380,60 1440,100 L1440,320 L0,320 Z"
            fill="hsl(156, 40%, 22%)"
            opacity="0.6"
          />
          {/* Mid treeline */}
          <path
            d="M0,300 Q80,230 160,260 Q240,210 320,250 Q400,190 480,230 Q560,180 640,220 Q720,170 800,210 Q880,160 960,200 Q1040,150 1120,190 Q1200,140 1280,180 Q1360,120 1440,160 L1440,320 L0,320 Z"
            fill="hsl(156, 45%, 18%)"
            opacity="0.75"
          />
          {/* Front treeline */}
          <path
            d="M0,310 Q100,260 200,280 Q300,240 400,270 Q500,230 600,260 Q700,220 800,250 Q900,210 1000,240 Q1100,200 1200,230 Q1300,190 1440,220 L1440,320 L0,320 Z"
            fill="hsl(163, 41%, 9%)"
            opacity="0.9"
          />
          {/* Individual tree shapes */}
          {[100, 300, 520, 750, 980, 1150, 1350].map((x, i) => (
            <polygon
              key={i}
              points={`${x},${290 - (i % 3) * 15} ${x - 18},320 ${x + 18},320`}
              fill="hsl(163, 41%, 9%)"
              opacity={0.7 + (i % 3) * 0.1}
            />
          ))}
        </svg>
      </div>

      {/* Floating Icon Halo */}
      {floatingIcons.map(({ icon: Icon, top, left, rotate, delay }, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 + delay * 0.3, duration: 0.6, ease: "easeOut" as const }}
          className="absolute z-[5] hidden md:flex"
          style={{ top, left }}
        >
          <div
            className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-background flex items-center justify-center shadow-lg border border-border/30"
            style={{
              transform: `rotate(${rotate}deg)`,
              animation: `floatBob 3s ease-in-out ${delay}s infinite`,
            }}
          >
            <Icon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
          </div>
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-[160px] pb-[200px]">
        {/* Announcement badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-5"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-background border border-border/60 text-foreground text-sm font-medium shadow-sm">
            AI-Powered Early Warning 🌿
          </span>
        </motion.div>

        {/* Giant headline */}
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold leading-[1.05] tracking-tight text-center max-w-5xl"
          style={{ color: "#12201A" }}
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
          className="mt-6 text-base sm:text-lg text-center max-w-[560px] leading-relaxed"
          style={{ color: "#5A6E64" }}
        >
          Sanjeevani integrates IoT water sensors, ASHA community reports,
          and Random Forest AI to predict and prevent disease outbreaks
          across Northeast India.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 flex items-center gap-3"
        >
          <Button
            size="lg"
            className="text-base font-semibold px-8 h-12 rounded-full shadow-lg"
            style={{ backgroundColor: "#12201A", color: "#FFFFFF" }}
          >
            Get Started
          </Button>
          <button
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg"
            style={{ backgroundColor: "#12201A", color: "#FFFFFF" }}
            aria-label="Watch demo"
          >
            <Play className="w-5 h-5 ml-0.5" />
          </button>
        </motion.div>
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes floatBob {
          0%, 100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
          50% { transform: translateY(-12px) rotate(var(--rotate, 0deg)); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
