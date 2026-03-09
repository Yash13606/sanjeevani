import { motion } from "framer-motion";

const partners = [
  "District Health Mission",
  "NHM Assam",
  "PHC Arunachal",
  "Ministry of Health (NE)",
  "ASHA Network India",
];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const TrustedBySection = () => {
  return (
    <section className="pt-40 lg:pt-56 pb-10 bg-section-white border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-xs font-body uppercase tracking-[0.2em] text-muted-foreground mb-8"
        >
          Deployed In
        </motion.p>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-8 lg:gap-14"
        >
          {partners.map((name) => (
            <motion.div
              key={name}
              variants={item}
              whileHover={{ scale: 1.08, color: "hsl(var(--foreground))" }}
              className="text-sm font-medium text-muted-foreground/60 transition-colors duration-300 cursor-default select-none"
            >
              {name}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustedBySection;
