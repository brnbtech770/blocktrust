import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import LoginClient from "./LoginClient";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
