import { AuthenticatedProviders } from '@/app/authenticated-providers'

export default function CheckoutConfirmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedProviders>{children}</AuthenticatedProviders>
}
