// emails/VerifyEmailEmail.tsx
// Confirmation d'adresse email à l'inscription
// ============================================================

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { CertifiedEmailFooter } from "./components/CertifiedEmailFooter";

export const subject = "Confirmez votre adresse email — BLOCKTRUST™";

type VerifyEmailEmailProps = {
  firstName: string;
  verifyUrl: string;
};

export function VerifyEmailEmail({ firstName, verifyUrl }: VerifyEmailEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirmez votre adresse email BLOCKTRUST™</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Confirmez votre email</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer
            toutes les fonctionnalités BLOCKTRUST™.
          </Text>
          <Section style={buttonContainer}>
            <Link href={verifyUrl} style={button}>
              Confirmer mon email
            </Link>
          </Section>
          <Text style={muted}>Ce lien est valable 24 heures.</Text>
          <Text style={muted}>
            Si vous n&apos;avez pas créé de compte BLOCKTRUST, ignorez cet email.
          </Text>
          <CertifiedEmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f6f9fc", fontFamily: "Inter, sans-serif" };
const container = { margin: "0 auto", padding: "24px", maxWidth: "560px" };
const h1 = { color: "#0a1628", fontSize: "22px", fontWeight: "700", margin: "0 0 16px" };
const text = { color: "#334155", fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" };
const muted = { color: "#64748b", fontSize: "13px", lineHeight: "20px", margin: "12px 0 0" };
const buttonContainer = { margin: "24px 0" };
const button = {
  backgroundColor: "#00d4ff",
  color: "#0a1628",
  fontWeight: "700",
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};
