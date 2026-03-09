import { motion } from "framer-motion";
import { Map, MessageCircle, Radio, ClipboardList } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const FeatureShowcase = () => {
  return (
    <section id="features" className="py-20 lg:py-28" style={{ backgroundColor: "hsl(43, 33%, 95%)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-foreground mb-4 leading-tight">
            Protect communities 24/7 with intelligent health surveillance
          </h2>
          <p className="text-lg text-muted-foreground">
            Sanjeevani gives every citizen, ASHA worker, and hospital access to
            real-time risk intelligence and actionable health guidance.
          </p>
        </motion.div>

        {/* Two large cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-16">
          {/* Card 1 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-xl transition-shadow duration-300"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center relative overflow-hidden">
              {/* Mock dashboard */}
              <div className="w-[85%] rounded-xl bg-card border border-border shadow-lg overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Map className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Risk Heatmap — Guwahati</span>
                </div>
                <div className="p-4 grid grid-cols-3 gap-2">
                  {["High", "Medium", "Low", "Medium", "Low", "High"].map((level, i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-3 text-center text-xs font-mono font-semibold text-primary-foreground ${
                        level === "High"
                          ? "bg-destructive"
                          : level === "Medium"
                          ? "bg-alert-orange"
                          : "bg-alert-green"
                      }`}
                    >
                      {level}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                Citizen Alert Dashboard
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Real-time pincode-level risk alerts delivered instantly to every
                registered citizen.
              </p>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="group rounded-2xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-xl transition-shadow duration-300"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-accent/5 to-primary/10 flex items-center justify-center">
              {/* Mock chat */}
              <div className="w-[85%] rounded-xl bg-card border border-border shadow-lg overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">Health Assistant</span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-alert-green">
                    <span className="w-2 h-2 rounded-full bg-alert-green" /> Online
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground max-w-[80%]">
                      Hello! I can help you with health alerts and prevention advice. What would you like to know?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-accent rounded-xl rounded-tr-sm px-3 py-2 text-xs text-accent-foreground max-w-[70%]">
                      Is the water safe in my area?
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground max-w-[80%]">
                      Based on sensor data, your area (781001) has <span className="font-semibold text-alert-orange">Medium Risk</span>. Boil water before use.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                AI Health Chatbot
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Instant answers on symptoms, prevention, and alerts — available
                24/7 in local languages.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom feature rows */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-foreground mb-1">
                IoT Sensor Monitoring
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real-time water quality data — TDS, pH, turbidity — streamed from
                sensor nodes deployed at community water sources.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-foreground mb-1">
                ASHA Worker Tools
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Community case reporting and survey management tools designed for
                low-connectivity environments.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
