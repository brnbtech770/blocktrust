// emails/blocktrust-charte.ts
// Charte graphique BlockTrust pour les templates React Email
// ============================================================

export const COLORS = {
  background: '#0a1628',
  accentCyan: '#00d4ff',
  accentGold: '#BDA76B',
  bodyBg: '#ffffff',
  bodyText: '#1a1a2e',
  muted: '#6b7280',
} as const

export const fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

export const headerSection = {
  backgroundColor: COLORS.background,
  padding: '24px 24px 20px',
  textAlign: 'center' as const,
}

export const logoTitle = {
  color: COLORS.accentCyan,
  fontSize: '18px',
  fontWeight: '700',
  letterSpacing: '0.12em',
  margin: '0 0 4px',
  fontFamily,
}

export const logoSub = {
  color: COLORS.muted,
  fontSize: '11px',
  margin: 0,
  fontFamily,
}

export const bodySection = {
  backgroundColor: COLORS.bodyBg,
  padding: '32px 24px',
  fontFamily,
}

export const titleStyle = {
  color: COLORS.bodyText,
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px',
  fontFamily,
}

export const textStyle = {
  color: COLORS.bodyText,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
  fontFamily,
}

export const buttonCyan = {
  backgroundColor: COLORS.accentCyan,
  color: '#0a1628',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
  display: 'inline-block',
  fontFamily,
}

export const buttonGold = {
  backgroundColor: COLORS.accentGold,
  color: '#0a1628',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
  display: 'inline-block',
  fontFamily,
}

export const footerSection = {
  backgroundColor: COLORS.background,
  padding: '20px 24px',
  textAlign: 'center' as const,
}

export const footerText = {
  color: COLORS.muted,
  fontSize: '11px',
  margin: 0,
  fontFamily,
}

export const hrStyle = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}
