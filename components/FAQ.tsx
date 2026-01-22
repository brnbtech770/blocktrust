"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Qu'est-ce que BlockTrust exactement ?",
    answer:
      "BlockTrust est une plateforme de certification d'identité numérique basée sur la blockchain. Nous créons des certificats infalsifiables qui prouvent l'authenticité de votre identité professionnelle, protégeant ainsi vos clients contre la fraude et l'usurpation d'identité.",
  },
  {
    question: "Comment fonctionne la certification blockchain ?",
    answer:
      "Votre certificat est créé sur la blockchain Polygon sous forme de signature cryptographique unique. Chaque vérification compare le hash du contenu avec celui stocké, garantissant qu'aucune falsification n'est possible. C'est comme un sceau numérique inviolable.",
  },
  {
    question: "Que se passe-t-il si quelqu'un copie mon badge ?",
    answer:
      "Notre système V2 anti-falsification détecte automatiquement si un badge est utilisé hors de son contexte original. Si quelqu'un copie votre QR code, la page de vérification affichera une alerte fraude car le hash du contexte ne correspondra pas.",
  },
  {
    question: "Puis-je intégrer le badge sur mon site web ?",
    answer:
      "Oui ! Nous fournissons un widget JavaScript simple à intégrer, ainsi qu'un badge statique avec QR code. Votre badge s'affiche avec une animation élégante et vos visiteurs peuvent vérifier votre certification en un clic.",
  },
  {
    question: "Les données sont-elles conformes au RGPD ?",
    answer:
      "Absolument. Seul le hash de vos informations est stocké sur la blockchain, pas vos données personnelles. Vous gardez le contrôle total et pouvez demander la suppression à tout moment. Nous sommes basés en France et respectons strictement le RGPD.",
  },
  {
    question: "Quelle est la différence entre les plans ?",
    answer:
      "Le plan Starter (1 certificat) convient aux indépendants. Le plan Pro (3 certificats) ajoute les analytics, la vérification SIRET et un badge premium. Le plan Business (10 certificats) inclut l'API, le multi-utilisateurs et un account manager dédié.",
  },
  {
    question: "Puis-je révoquer mon certificat ?",
    answer:
      "Oui, vous pouvez révoquer votre certificat à tout moment depuis votre espace client. La révocation est immédiatement visible sur la page de vérification. C'est utile si vous changez d'activité ou souhaitez créer un nouveau certificat.",
  },
  {
    question: "Comment puis-je contacter le support ?",
    answer:
      "Vous pouvez nous contacter par email à support@blocktrust.tech ou via le chat intégré dans votre espace client. Les clients Pro et Business bénéficient d'un support prioritaire avec réponse garantie sous 24h.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="relative py-24 overflow-hidden">
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
            Questions{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
              fréquentes
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tout ce que vous devez savoir sur BlockTrust et la certification blockchain.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-card border border-border/50 rounded-xl px-6 data-[state=open]:neon-border-cyan transition-all duration-300"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-lg">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
