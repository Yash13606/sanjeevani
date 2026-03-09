import { motion } from "framer-motion";

const partners = [
  "District Health Mission",
  "NHM Assam",
  "PHC Arunachal",
  "Ministry of Health (NE)",
  "ASHA Network India",
];

const TrustedBySection = () => {
  return (
    <section className="py-10 bg-section-white border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-body uppercase tracking-[0.2em] text-muted-foreground mb-8">
          Deployed In
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-14">
          {partners.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="text-sm font-medium text-muted-foreground/60 hover:text-foreground transition-colors duration-300 cursor-default select-none"
            >
              {name}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedBySection;
