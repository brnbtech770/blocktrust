import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = ["brnbtech@gmail.com"];

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { userId, status } = await request.json();

  if (!userId || !["ACTIVE", "SUSPENDED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  return NextResponse.json({ success: true });
}
