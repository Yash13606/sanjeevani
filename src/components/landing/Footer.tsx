import { motion } from "framer-motion";
import { Droplets } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Alerts", "Dashboard", "AI Chat"],
  Resources: ["Docs", "Privacy Policy", "Terms of Use", "Support"],
  Company: ["About", "Team", "Contact", "Blog"],
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const Footer = () => {
  return (
    <section className="relative px-4 sm:px-6 lg:px-10 pt-4 pb-16 overflow-hidden bg-background">
      {/* Watermark */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none select-none z-0">
        <span
          className="font-display font-bold whitespace-nowrap"
          style={{ fontSize: "clamp(120px, 15vw, 180px)", color: "#EBEBEB", lineHeight: 0.85 }}
        >
          Sanjeevani
        </span>
      </div>

      {/* Footer card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        className="relative z-10 max-w-6xl mx-auto rounded-2xl bg-card shadow-xl border border-border/40 overflow-hidden"
      >
        <div className="px-6 sm:px-10 lg:px-12 py-10 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:min-w-[220px] shrink-0"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-lg font-bold text-foreground">Sanjeevani</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered health surveillance for Northeast India.
              </p>
            </motion.div>

            {/* Link columns */}
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-8 lg:gap-14 flex-1"
            >
              {Object.entries(footerLinks).map(([title, links]) => (
                <motion.div key={title} variants={item}>
                  <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
                  <ul className="space-y-2.5">
                    {links.map((link) => (
                      <li key={link}>
                        <motion.a
                          href="#"
                          whileHover={{ x: 3 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-block"
                        >
                          {link}
                        </motion.a>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Divider */}
          <div className="mt-10 mb-6 border-t border-border" />

          {/* Bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <p className="text-sm text-muted-foreground">© 2026 Sanjeevani. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Footer;
