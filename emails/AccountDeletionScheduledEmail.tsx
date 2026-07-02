// emails/AccountDeletionScheduledEmail.tsx
// Compte programmé pour suppression (délai 30 jours)
// ============================================================

import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";
import * as React from "react";
import { CertifiedEmailFooter } from "./components/CertifiedEmailFooter";

export type AccountDeletionScheduledEmailProps = {
  deletionDate: string;
  dashboardUrl: string;
};

export function AccountDeletionScheduledEmail({
  deletionDate,
  dashboardUrl,
}: AccountDeletionScheduledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre compte BLOCKTRUST™ sera supprimé dans 30 jours</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Suppression programmée</Heading>
          <Text style={text}>
            Votre compte BLOCKTRUST™ sera supprimé le {deletionDate}.
          </Text>
          <Text style={text}>
            Connectez-vous avant cette date pour annuler la suppression :
          </Text>
          <Link href={dashboardUrl} style={link}>
            {dashboardUrl}
          </Link>
          <CertifiedEmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f3f4f6", fontFamily: "Inter, sans-serif" };
const container = { margin: "0 auto", padding: "32px 24px", maxWidth: "560px", backgroundColor: "#fff" };
const h1 = { color: "#0a1628", fontSize: "22px", fontWeight: "700" as const };
const text = { color: "#374151", fontSize: "15px", lineHeight: "24px" };
const link = { color: "#0a1628", textDecoration: "underline", fontWeight: "600" as const };
