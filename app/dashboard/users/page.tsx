import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserManagement from "./UserManagement";

const ADMIN_EMAILS = ["brnbtech@gmail.com"];

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    redirect("/mon-espace");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      status: true,
      plan: true,
      createdAt: true,
    },
  });

  const serializedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Gestion des utilisateurs</h1>
      <UserManagement users={serializedUsers} />
    </div>
  );
}
