// emails/SecurityLockoutEmail.tsx
// Alerte lockout brute force
// ============================================================

import { Body, Container, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";
import * as React from "react";
import { CertifiedEmailFooter } from "./components/CertifiedEmailFooter";

export type SecurityLockoutEmailProps = {
  resetPasswordUrl: string;
};

export function SecurityLockoutEmail({ resetPasswordUrl }: SecurityLockoutEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Alerte sécurité — tentatives de connexion sur votre compte BLOCKTRUST™</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Alerte sécurité</Heading>
          <Text style={text}>
            Plusieurs tentatives de connexion échouées ont été détectées sur votre compte BLOCKTRUST™.
          </Text>
          <Text style={text}>
            Si ce n&apos;est pas vous, changez votre mot de passe immédiatement :
          </Text>
          <Link href={resetPasswordUrl} style={link}>
            {resetPasswordUrl}
          </Link>
          <Text style={muted}>
            Si vous êtes à l&apos;origine de ces tentatives, ignorez cet email. Votre compte est
            temporairement verrouillé par mesure de protection.
          </Text>
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
const muted = { color: "#6b7280", fontSize: "13px", lineHeight: "20px" };
