import { motion } from "framer-motion";
import { Lock, Zap, Handshake, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const trustSignals = [
  { icon: Lock, label: "Data stays in India" },
  { icon: Zap, label: "Response within 24h" },
  { icon: Handshake, label: "Free pilot program" },
];

const ContactSection = () => {
  return (
    <section id="contact" className="py-6 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="rounded-2xl bg-card shadow-xl border border-border/40 overflow-hidden"
        >
          <div className="p-5 sm:p-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-center mb-4"
            >
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-2">
                Get in Touch
              </p>
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight mb-1">
                Bring Sanjeevani to your district
              </h2>
              <p className="text-xs text-muted-foreground">
                Reach out to deploy the system in your region or partner with our team.
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="space-y-2.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-0.5">Name</label>
                  <input type="text" placeholder="Your full name"
                    className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-0.5">Organization</label>
                  <input type="text" placeholder="District Health Office"
                    className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-0.5">Email</label>
                  <input type="email" placeholder="you@example.com"
                    className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-0.5">Role</label>
                  <select
                    className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                    defaultValue="">
                    <option value="" disabled>Select role</option>
                    <option>District Health Officer</option>
                    <option>ASHA Coordinator</option>
                    <option>Hospital Administrator</option>
                    <option>Researcher</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2.5 items-end">
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-0.5">Message</label>
                  <input type="text" placeholder="Tell us about your district…"
                    className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button type="submit" className="h-8 px-6 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs whitespace-nowrap">
                    Send Message <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </motion.div>
              </div>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-center gap-5"
            >
              {trustSignals.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <s.icon className="w-3 h-3 text-primary" />
                  <span>{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
