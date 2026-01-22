"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CircuitBackground from "./CircuitBackground";
import CyberShieldBadge from "./CyberShieldBadge";

const Hero = () => {
  const features = [
    "Certification blockchain infalsifiable",
    "Protection anti-fraude 24/7",
    "Vérification instantanée",
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <CircuitBackground className="opacity-30" />

      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-primary/30 mb-6"
            >
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">
                Certification Blockchain Anti-Fraude
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            >
              Protégez votre{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400 animate-glow-pulse">
                identité numérique
              </span>{" "}
              avec la blockchain
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground mb-8 max-w-xl"
            >
              BlockTrust certifie votre identité professionnelle sur la blockchain,
              offrant une protection infalsifiable contre les fraudes et usurpations.
            </motion.p>

            {/* Features List */}
            <motion.ul
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3 mb-8"
            >
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-muted-foreground"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </motion.ul>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/inscription">
                <Button variant="hero" size="lg" className="group">
                  Créer mon certificat
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="glassCyan" size="lg">
                  Comment ça marche
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Content - Badge Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex items-center justify-center"
          >
            <CyberShieldBadge />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
