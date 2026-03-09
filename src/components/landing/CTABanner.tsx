import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const CTABanner = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-10 pt-4 pb-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
        className="relative max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-xl"
        style={{ backgroundColor: "hsl(var(--dark-surface))" }}
      >
        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, hsla(161,40%,20%,0.4) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 px-6 sm:px-12 lg:px-20 py-16 lg:py-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-display text-3xl sm:text-4xl lg:text-[40px] font-bold text-white mb-5 leading-tight max-w-2xl mx-auto"
          >
            Protect your community before outbreaks strike
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-base max-w-xl mx-auto mb-8 leading-relaxed"
            style={{ color: "hsl(161,40%,60%)" }}
          >
            AI + IoT + Community. The complete early warning system.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Button
                size="lg"
                className="bg-white text-foreground hover:bg-white/90 text-sm font-semibold px-8 h-11 rounded-full shadow-lg"
              >
                Get Started Free
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default CTABanner;
