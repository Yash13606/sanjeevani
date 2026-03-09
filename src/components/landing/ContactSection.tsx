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
    <section id="contact" className="py-12 lg:py-16 bg-background">
      <div className="max-w-[520px] mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="rounded-2xl bg-card shadow-xl border border-border/40 overflow-hidden"
        >
          <div className="p-5 sm:p-7">
            {/* Header */}
            <div className="text-center mb-5">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">
                Get in Touch
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight mb-1.5">
                Bring Sanjeevani to your district
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reach out to deploy the system in your region or partner with our team.
              </p>
            </div>

            {/* Form */}
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Organization</label>
                  <input
                    type="text"
                    placeholder="District Health Office"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Role</label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
                  defaultValue=""
                >
                  <option value="" disabled>Select your role</option>
                  <option>District Health Officer</option>
                  <option>ASHA Coordinator</option>
                  <option>Hospital Administrator</option>
                  <option>Researcher</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Message</label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your district and how we can help…"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm"
              >
                Send Message <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Trust signals */}
            <div className="mt-6 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-6">
              {trustSignals.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5 text-primary" />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;