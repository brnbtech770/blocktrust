import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = ["brnrtech@gmail.com"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { userId, status } = await req.json();

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  return NextResponse.json({ success: true, user });
}
