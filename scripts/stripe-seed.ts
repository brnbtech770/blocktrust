import Stripe from "stripe";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ STRIPE_SECRET_KEY manquant dans .env.local");
    process.exit(1);
  }

  console.log("🔄 Création des prix Stripe...\n");

  try {
    // Plans B2C - Mensuel
    console.log("📦 Création des plans B2C (Mensuel)...\n");

    // Essentiel - 3,99€/mois (aligné lib/pricing.ts)
    const essentielProduct = await stripe.products.create({
      name: "BlockTrust Essentiel",
      description: "Plan Essentiel - Certificats de base pour particuliers",
    });
    const essentielPrice = await stripe.prices.create({
      unit_amount: 399, // 3,99€
      currency: "eur",
      recurring: {
        interval: "month",
      },
      product: essentielProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_ESSENTIEL_MONTHLY=${essentielPrice.id}`);

    // Premium - 9,99€/mois
    const premiumProduct = await stripe.products.create({
      name: "BlockTrust Premium",
      description: "Plan Premium - Certificats avancés pour particuliers",
    });
    const premiumPrice = await stripe.prices.create({
      unit_amount: 999, // 9,99€
      currency: "eur",
      recurring: {
        interval: "month",
      },
      product: premiumProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_PREMIUM_MONTHLY=${premiumPrice.id}`);

    // Famille - 14,99€/mois
    const familleProduct = await stripe.products.create({
      name: "BlockTrust Famille",
      description: "Plan Famille - Pour plusieurs membres",
    });
    const famillePrice = await stripe.prices.create({
      unit_amount: 1499, // 14,99€
      currency: "eur",
      recurring: {
        interval: "month",
      },
      product: familleProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_FAMILLE_MONTHLY=${famillePrice.id}`);

    // Plans B2C - Annuel
    console.log("\n📦 Création des plans B2C (Annuel)...\n");

    const essentielYearly = await stripe.prices.create({
      unit_amount: 3830, // 38,30€ / an (-20% vs 12×3,99), aligné lib/pricing
      currency: "eur",
      recurring: {
        interval: "year",
      },
      product: essentielProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_ESSENTIEL_YEARLY=${essentielYearly.id}`);

    const premiumYearly = await stripe.prices.create({
      unit_amount: 9590, // 95,90€ (annuel)
      currency: "eur",
      recurring: {
        interval: "year",
      },
      product: premiumProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_PREMIUM_YEARLY=${premiumYearly.id}`);

    const familleYearly = await stripe.prices.create({
      unit_amount: 14390, // 143,90€ (annuel)
      currency: "eur",
      recurring: {
        interval: "year",
      },
      product: familleProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_FAMILLE_YEARLY=${familleYearly.id}`);

    // Plans B2B - Mensuel
    console.log("\n📦 Création des plans B2B (Mensuel)...\n");

    // Starter B2B — legacy seed (forfait plate mensuel) ; grille live = HT/user dans lib/pricing.ts
    const starterProduct = await stripe.products.create({
      name: "BlockTrust Starter",
      description: "Plan Starter - Pour petites entreprises",
    });
    const starterPrice = await stripe.prices.create({
      unit_amount: 2900, // 29€
      currency: "eur",
      recurring: {
        interval: "month",
      },
      product: starterProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_STARTER_MONTHLY=${starterPrice.id}`);

    // Team - 59€/mois
    const teamProduct = await stripe.products.create({
      name: "BlockTrust Team",
      description: "Plan Team - Pour équipes",
    });
    const teamPrice = await stripe.prices.create({
      unit_amount: 5900, // 59€
      currency: "eur",
      recurring: {
        interval: "month",
      },
      product: teamProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_TEAM_MONTHLY=${teamPrice.id}`);

    // Plans B2B - Annuel
    console.log("\n📦 Création des plans B2B (Annuel)...\n");

    const starterYearly = await stripe.prices.create({
      unit_amount: 27840, // 278,40€ (annuel)
      currency: "eur",
      recurring: {
        interval: "year",
      },
      product: starterProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_STARTER_YEARLY=${starterYearly.id}`);

    const teamYearly = await stripe.prices.create({
      unit_amount: 56640, // 566,40€ (annuel)
      currency: "eur",
      recurring: {
        interval: "year",
      },
      product: teamProduct.id,
    });
    console.log(`✅ STRIPE_PRICE_TEAM_YEARLY=${teamYearly.id}`);

    console.log("\n✨ Tous les prix ont été créés avec succès!");
    console.log("\n📋 Ajoutez ces lignes à votre .env.local:\n");
    console.log("# Plans B2C - Mensuel");
    console.log(`STRIPE_PRICE_ESSENTIEL_MONTHLY=${essentielPrice.id}`);
    console.log(`STRIPE_PRICE_PREMIUM_MONTHLY=${premiumPrice.id}`);
    console.log(`STRIPE_PRICE_FAMILLE_MONTHLY=${famillePrice.id}`);
    console.log("\n# Plans B2C - Annuel");
    console.log(`STRIPE_PRICE_ESSENTIEL_YEARLY=${essentielYearly.id}`);
    console.log(`STRIPE_PRICE_PREMIUM_YEARLY=${premiumYearly.id}`);
    console.log(`STRIPE_PRICE_FAMILLE_YEARLY=${familleYearly.id}`);
    console.log("\n# Plans B2B - Mensuel");
    console.log(`STRIPE_PRICE_STARTER_MONTHLY=${starterPrice.id}`);
    console.log(`STRIPE_PRICE_TEAM_MONTHLY=${teamPrice.id}`);
    console.log("\n# Plans B2B - Annuel");
    console.log(`STRIPE_PRICE_STARTER_YEARLY=${starterYearly.id}`);
    console.log(`STRIPE_PRICE_TEAM_YEARLY=${teamYearly.id}`);
  } catch (error: any) {
    console.error("❌ Erreur lors de la création des prix:", error.message);
    process.exit(1);
  }
}

main();
