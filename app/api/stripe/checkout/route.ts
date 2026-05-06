import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { stripe } from "@/lib/stripe";

const checkoutBodySchema = z
  .object({
    priceId: z.string().min(1).max(128).optional(),
    planId: z
      .enum([
        "essentiel",
        "premium",
        "famille",
        "famille-plus",
        "starter",
        "team",
        "business",
      ])
      .optional(),
    billingPeriod: z.enum(["monthly", "yearly"]).optional(),
  })
  .refine(
    (d) => !!(d.priceId || (d.planId && d.billingPeriod)),
    { message: "Données invalides" },
  );

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    // TODO: Remplacer par getServerSession(authOptions) quand NextAuth sera implémenté
    const user = await getAuthUser(req);
    
    if (!user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const parsedBody = checkoutBodySchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const { priceId, planId, billingPeriod } = parsedBody.data;

    // Si priceId est fourni directement, l'utiliser
    // Sinon, déterminer le priceId depuis planId et billingPeriod
    let finalPriceId = priceId;

    if (!finalPriceId && planId && billingPeriod) {
      const planMap: Record<string, string> = {
        essentiel: "ESSENTIEL",
        premium: "PREMIUM",
        famille: "FAMILLE",
        "famille-plus": "FAMILLE_PLUS",
        starter: "STARTER",
        team: "TEAM",
        business: "BUSINESS",
      };

      const planName = planMap[planId];
      if (!planName) {
        return NextResponse.json(
          { error: "Invalid planId" },
          { status: 400 }
        );
      }

      const periodSuffix = billingPeriod === "monthly" ? "MONTHLY" : "YEARLY";
      const envVarName = `STRIPE_PRICE_${planName}_${periodSuffix}`;
      finalPriceId = process.env[envVarName];

      if (!finalPriceId) {
        return NextResponse.json(
          { error: `Price ID not found for ${planId} - ${billingPeriod}` },
          { status: 400 }
        );
      }
    }

    if (!finalPriceId) {
      return NextResponse.json(
        { error: "priceId or (planId + billingPeriod) is required" },
        { status: 400 }
      );
    }

    // Vérifier que le priceId existe dans les variables d'environnement
    const validPriceIds = [
      process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY,
      process.env.STRIPE_PRICE_ESSENTIEL_YEARLY,
      process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
      process.env.STRIPE_PRICE_PREMIUM_YEARLY,
      process.env.STRIPE_PRICE_FAMILLE_MONTHLY,
      process.env.STRIPE_PRICE_FAMILLE_YEARLY,
      process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY,
      process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY,
      process.env.STRIPE_PRICE_STARTER_MONTHLY,
      process.env.STRIPE_PRICE_STARTER_YEARLY,
      process.env.STRIPE_PRICE_TEAM_MONTHLY,
      process.env.STRIPE_PRICE_TEAM_YEARLY,
      process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
      process.env.STRIPE_PRICE_BUSINESS_YEARLY,
    ].filter(Boolean);

    if (!validPriceIds.includes(finalPriceId)) {
      return NextResponse.json(
        { error: "Invalid priceId" },
        { status: 400 }
      );
    }

    // Récupérer ou créer un customer Stripe
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      // Créer un nouveau customer Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Sauvegarder le stripeCustomerId dans la table User
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    } else {
      // Vérifier que le customer existe toujours dans Stripe
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (error) {
        // Si le customer n'existe plus, en créer un nouveau
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: user.id,
          },
        });

        stripeCustomerId = customer.id;

        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId },
        });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Créer la session Stripe Checkout avec le customer ID
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: {
        priceId: finalPriceId,
        planId: planId || "",
        billingPeriod: billingPeriod || "",
        userId: user.id,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error("Erreur création session Stripe:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création de la session" },
      { status: 500 }
    );
  }
}
