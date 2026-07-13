// emails/EmailVerificationReminderEmail.tsx
// Rappel de confirmation email (24h / 72h)
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

type Variant = "24h" | "72h";

export function subjectForVariant(variant: Variant): string {
  return variant === "72h"
    ? "Rappel — confirmez votre email BLOCKTRUST™"
    : "Confirmez votre email — BLOCKTRUST™";
}

type EmailVerificationReminderEmailProps = {
  firstName: string;
  verifyUrl: string;
  variant: Variant;
};

export function EmailVerificationReminderEmail({
  firstName,
  verifyUrl,
  variant,
}: EmailVerificationReminderEmailProps) {
  const intro =
    variant === "72h"
      ? "Vous n'avez pas encore confirmé votre adresse email. Sans confirmation, certaines fonctionnalités resteront limitées et votre compte pourra être suspendu."
      : "Vous n'avez pas encore confirmé votre adresse email. Confirmez-la pour débloquer la certification, le BIS et le Trust Circle.";

  return (
    <Html>
      <Head />
      <Preview>{subjectForVariant(variant)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Confirmation email en attente</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>{intro}</Text>
          <Section style={buttonContainer}>
            <Link href={verifyUrl} style={button}>
              Confirmer mon email
            </Link>
          </Section>
          <Text style={muted}>Ce lien est valable 24 heures.</Text>
          <CertifiedEmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export const subject = subjectForVariant("24h");

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
