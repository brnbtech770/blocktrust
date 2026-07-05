// Redirection vers la page abonnement / facturation (session NextAuth)
import { redirect } from "next/navigation";

export default function BillingRedirectPage() {
  redirect("/dashboard/subscription");
}
