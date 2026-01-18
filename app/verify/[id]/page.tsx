import { prisma } from "@/app/lib/db";
import { notFound, redirect } from "next/navigation";

export default async function VerifyBadge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  let entity = await prisma.entity.findUnique({
    where: { id },
  });

  if (!entity) {
    entity = await prisma.entity.findUnique({
      where: { siret: id },
    });
  }

  if (!entity) {
    notFound();
  }

  redirect(`/badge-v2/${entity.id}`);
}