"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(187,100%,50%)]/5 via-transparent to-transparent" />
      
      {/* Circuit Background - lignes animées */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-0 w-px h-64 bg-gradient-to-b from-transparent via-[hsl(187,100%,50%)] to-transparent animate-pulse" />
        <div
          className="absolute top-1/3 left-1/4 w-px h-48 bg-gradient-to-b from-transparent via-cyan-500 to-transparent animate-pulse"
          style={{ animationDelay: "0.3s" }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-px h-56 bg-gradient-to-b from-transparent via-[hsl(187,100%,50%)] to-transparent animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-1/4 right-0 w-px h-72 bg-gradient-to-b from-transparent via-cyan-500 to-transparent animate-pulse"
          style={{ animationDelay: "0.7s" }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            {/* Tag */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
            >
              <Sparkles className="w-4 h-4 text-[hsl(43,74%,58%)]" />
              <span className="text-sm text-gray-300">
                Technologie <span className="text-[hsl(43,74%,58%)] font-semibold">Polygon</span> Blockchain
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              <span className="text-white">Certificat d&apos;identité</span>
              <br />
              <span className="text-[hsl(43,74%,58%)] text-glow-gold">
                infalsifiable
              </span>
              <span className="text-white"> sur</span>
              <br />
              <span className="text-[hsl(187,100%,50%)] text-glow-cyan">
                blockchain
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-400 mb-8"
            >
              Badge vérifié. QR code scannable.{" "}
              <span className="text-[hsl(43,74%,58%)] font-semibold">Impossible à copier.</span>
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4 mb-10"
            >
              <Link
                href="/inscription"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-[hsl(187,100%,50%)] hover:bg-[hsl(187,100%,45%)] text-[hsl(222.2,84%,4.9%)] font-semibold rounded-lg shadow-lg shadow-[hsl(187,100%,50%)]/25 hover:shadow-[hsl(187,100%,50%)]/40 transition-all duration-300"
              >
                Créer mon certificat gratuit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[hsl(43,74%,58%)] text-[hsl(43,74%,58%)] font-semibold rounded-lg hover:bg-[hsl(43,74%,58%)]/10 transition-all duration-300"
              >
                Voir une démo
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-8 text-sm text-gray-400"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[hsl(187,100%,50%)]" />
                <span>100% Sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[hsl(43,74%,58%)]" />
                <span>Conformité RGPD</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>+2,000 utilisateurs</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Badge Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex items-center justify-center"
          >
            {/* Glow Effect behind badge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-80 bg-gradient-to-r from-[hsl(187,100%,50%)]/30 to-[hsl(43,74%,58%)]/30 rounded-full blur-3xl" />
            </div>
            
            {/* Badge Image */}
            <motion.div
              animate={{
                y: [0, -15, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-10"
            >
              <Image
                src="/blocktrust-logo.png"
                alt="BlockTrust Badge"
                width={500}
                height={500}
                className="w-auto h-auto max-w-md drop-shadow-2xl"
                priority
              />
            </motion.div>

            {/* Floating elements around badge */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                x: [0, 5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="absolute top-10 right-10 w-3 h-3 bg-[hsl(187,100%,50%)] rounded-full"
            />
            <motion.div
              animate={{
                y: [0, 10, 0],
                x: [0, -5, 0],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute bottom-20 left-10 w-2 h-2 bg-[hsl(43,74%,58%)] rounded-full"
            />
            <motion.div
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.8,
              }}
              className="absolute top-1/2 right-0 w-4 h-4 border border-cyan-500 rounded-full"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
