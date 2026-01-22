"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CircuitBackground from "./CircuitBackground";

const plans = [
  {
    name: "Starter",
    price: "3,99",
    period: "/mois",
    description: "Parfait pour les indépendants",
    icon: Zap,
    features: [
      "1 certificat blockchain",
      "Badge vérifiable",
      "QR Code personnalisé",
      "Page de vérification",
      "Support email",
    ],
    cta: "Commencer",
    popular: false,
    color: "primary" as const,
  },
  {
    name: "Pro",
    price: "9,99",
    period: "/mois",
    description: "Pour les professionnels exigeants",
    icon: Crown,
    features: [
      "3 certificats blockchain",
      "Badge premium animé",
      "QR Code dynamique",
      "Analytics avancées",
      "Vérification SIRET",
      "Support prioritaire",
      "Widget intégrable",
    ],
    cta: "Choisir Pro",
    popular: true,
    color: "secondary" as const,
  },
  {
    name: "Business",
    price: "29,99",
    period: "/mois",
    description: "Pour les entreprises",
    icon: Building2,
    features: [
      "10 certificats blockchain",
      "Multi-utilisateurs",
      "API d'intégration",
      "Marque blanche",
      "SLA garanti",
      "Account manager dédié",
      "Formation incluse",
    ],
    cta: "Contacter",
    popular: false,
    color: "primary" as const,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
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
            Tarifs{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-yellow-400">
              transparents
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choisissez le plan qui correspond à vos besoins. Tous les plans incluent une certification blockchain authentique.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Populaire
                  </span>
                </div>
              )}

              <div
                className={`glass-card p-8 rounded-2xl border h-full flex flex-col ${
                  plan.popular
                    ? "border-secondary/50 neon-border-gold"
                    : "border-border/50 hover:neon-border-cyan"
                } transition-all duration-300`}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                    plan.color === "primary" ? "bg-primary/20" : "bg-secondary/20"
                  }`}
                >
                  <plan.icon
                    className={`w-7 h-7 ${
                      plan.color === "primary" ? "text-primary" : "text-secondary"
                    }`}
                  />
                </div>

                {/* Plan Info */}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}€</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check
                        className={`w-5 h-5 ${
                          plan.color === "primary"
                            ? "text-primary"
                            : "text-secondary"
                        }`}
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/inscription" className="w-full">
                  <Button
                    variant={plan.popular ? "gold" : "glassCyan"}
                    size="lg"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
