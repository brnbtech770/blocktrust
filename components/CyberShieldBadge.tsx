"use client";

import { motion } from "framer-motion";
import { Shield, CheckCircle2, Lock } from "lucide-react";

const CyberShieldBadge = () => {
  return (
    <div className="relative w-80 h-96">
      {/* Glow Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-secondary/30 rounded-3xl blur-2xl" />

      {/* Main Badge */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotateY: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative glass-card rounded-3xl p-8 border border-primary/30 neon-border-cyan"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/50 mb-4"
          >
            <Shield className="w-10 h-10 text-primary" />
          </motion.div>
          <h3 className="text-xl font-bold text-foreground">BLOCKTRUST</h3>
          <p className="text-sm text-primary">Certificat Vérifié</p>
        </div>

        {/* Certificate Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Identité</p>
              <p className="text-sm font-medium">Vérifiée</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <Lock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Blockchain</p>
              <p className="text-sm font-medium">Polygon</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/30">
            <p className="text-xs text-center text-muted-foreground mb-1">
              ID Certificat
            </p>
            <p className="text-xs font-mono text-center text-primary truncate">
              0x7f3d...8a2b
            </p>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mt-6 flex justify-center"
        >
          <div className="w-16 h-16 bg-white rounded-lg p-2">
            <div className="w-full h-full grid grid-cols-4 gap-0.5">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className={`${
                    Math.random() > 0.5 ? "bg-black" : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating Elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
        className="absolute -top-4 -right-4 w-12 h-12 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center"
      >
        <CheckCircle2 className="w-6 h-6 text-primary" />
      </motion.div>

      <motion.div
        animate={{
          y: [0, 20, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        className="absolute -bottom-4 -left-4 w-12 h-12 rounded-xl bg-secondary/20 border border-secondary/50 flex items-center justify-center"
      >
        <Lock className="w-6 h-6 text-secondary" />
      </motion.div>
    </div>
  );
};

export default CyberShieldBadge;
