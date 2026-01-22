"use client";

import { motion } from "framer-motion";
import { UserCheck, Coins, Globe, ArrowRight } from "lucide-react";
import CircuitBackground from "./CircuitBackground";

const steps = [
  {
    icon: UserCheck,
    title: "Vérification d'identité",
    description:
      "Validez votre identité professionnelle via notre processus KYC sécurisé avec vérification SIRET.",
    step: "01",
    color: "primary" as const,
  },
  {
    icon: Coins,
    title: "Mint certificat blockchain",
    description:
      "Votre certificat est créé sur la blockchain Polygon, garantissant son authenticité éternelle.",
    step: "02",
    color: "secondary" as const,
  },
  {
    icon: Globe,
    title: "Badge public vérifiable",
    description:
      "Affichez votre badge certifié sur votre site. N'importe qui peut le scanner pour vérifier.",
    step: "03",
    color: "primary" as const,
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-24 overflow-hidden">
      <CircuitBackground className="opacity-20" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comment ça{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
              marche
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            En 3 étapes simples, obtenez votre certification blockchain et protégez votre identité numérique.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="relative"
            >
              <div className="glass-card p-8 rounded-2xl border border-border/50 h-full hover:neon-border-cyan transition-all duration-300 group">
                {/* Step Number */}
                <div className="absolute -top-4 left-8">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      step.color === "primary"
                        ? "bg-primary/20 text-primary neon-border-cyan"
                        : "bg-secondary/20 text-secondary neon-border-gold"
                    }`}
                  >
                    {step.step}
                  </span>
                </div>

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                    step.color === "primary"
                      ? "bg-primary/20 neon-border-cyan"
                      : "bg-secondary/20 neon-border-gold"
                  }`}
                >
                  <step.icon
                    className={`w-8 h-8 ${
                      step.color === "primary"
                        ? "text-primary"
                        : "text-secondary"
                    }`}
                  />
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 text-center">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-center">
                  {step.description}
                </p>

                {/* Arrow indicator (except last) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center border border-border">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
