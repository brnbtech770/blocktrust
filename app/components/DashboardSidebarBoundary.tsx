'use client'

import { ErrorBoundary } from 'react-error-boundary'

export default function DashboardSidebarBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  return <ErrorBoundary fallback={<div />}>{children}</ErrorBoundary>
}
