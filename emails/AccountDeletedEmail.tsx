// emails/AccountDeletedEmail.tsx
// Confirmation suppression compte
// ============================================================

import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import * as React from "react";
import { CertifiedEmailFooter } from "./components/CertifiedEmailFooter";

export function AccountDeletedEmail() {
  return (
    <Html>
      <Head />
      <Preview>Votre compte BLOCKTRUST™ a été supprimé</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Compte supprimé</Heading>
          <Text style={text}>Votre compte BLOCKTRUST™ a été supprimé conformément à votre demande.</Text>
          <Text style={text}>
            Vos données personnelles ont été effacées ou anonymisées. Certaines traces techniques
            peuvent être conservées pour l&apos;intégrité des vérifications déjà effectuées par des
            tiers.
          </Text>
          <Text style={muted}>L&apos;équipe BLOCKTRUST™</Text>
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
const muted = { color: "#6b7280", fontSize: "13px" };
