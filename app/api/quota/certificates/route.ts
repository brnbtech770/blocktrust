import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { checkCertificateQuota } from "@/lib/checkQuota";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const plan = user.subscription?.plan ?? "ESSENTIEL";
    const quota = await checkCertificateQuota(user.id);

    return NextResponse.json({
      allowed: quota.allowed,
      plan,
      current: quota.current ?? 0,
      max: quota.max ?? 0,
    });
  } catch (e) {
    console.error("[quota/certificates]", e);
    return NextResponse.json(
      { error: "Erreur lors de la vérification du quota" },
      { status: 500 }
    );
  }
}
