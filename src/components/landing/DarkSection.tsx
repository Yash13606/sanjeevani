import { motion } from "framer-motion";
import NetworkGraph from "./NetworkGraph";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const pillContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};

const pillItem = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const pillItemRight = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const DarkSection = () => {
  return (
    <section
      id="about"
      className="relative py-20 overflow-hidden"
      style={{ backgroundColor: "hsl(163, 41%, 9%)" }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, hsla(161,40%,20%,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-white mb-4 leading-tight">
            Built for the unique needs of rural and tribal healthcare delivery
          </h2>
          <p className="text-lg" style={{ color: "hsl(161, 40%, 60%)" }}>
            Our platform was designed from the ground up for low-connectivity
            environments, multilingual use, and the specific disease burden of
            Northeast India.
          </p>
        </motion.div>

        {/* Three column layout */}
        <div className="grid lg:grid-cols-3 gap-8 items-center">
          {/* Left */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="space-y-6"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-3">
                Turn sensor and case data into a community health knowledge graph
              </h3>
              <motion.div
                variants={pillContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-wrap gap-2"
              >
                {["Sensor Network", "Case Reports", "AI Predictions"].map((pill) => (
                  <motion.span
                    key={pill}
                    variants={pillItem}
                    whileHover={{ scale: 1.08, backgroundColor: "hsl(161, 68%, 51%, 0.2)" }}
                    className="inline-flex px-3 py-1 rounded-full text-xs font-medium border cursor-default"
                    style={{
                      borderColor: "hsl(161, 68%, 51%, 0.3)",
                      color: "hsl(161, 68%, 51%)",
                      backgroundColor: "hsl(161, 68%, 51%, 0.1)",
                    }}
                  >
                    {pill}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Center — Network graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
            className="aspect-square max-h-[400px] w-full"
          >
            <NetworkGraph />
          </motion.div>

          {/* Right */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="space-y-6"
          >
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-3">
                Handle complex outbreak scenarios and escalation procedures
              </h3>
              <motion.div
                variants={pillContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-wrap gap-2"
              >
                {["Escalation Protocols", "Multi-agency Alerts", "Automated Reports"].map((pill) => (
                  <motion.span
                    key={pill}
                    variants={pillItemRight}
                    whileHover={{ scale: 1.08, backgroundColor: "hsl(161, 68%, 51%, 0.2)" }}
                    className="inline-flex px-3 py-1 rounded-full text-xs font-medium border cursor-default"
                    style={{
                      borderColor: "hsl(161, 68%, 51%, 0.3)",
                      color: "hsl(161, 68%, 51%)",
                      backgroundColor: "hsl(161, 68%, 51%, 0.1)",
                    }}
                  >
                    {pill}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DarkSection;
