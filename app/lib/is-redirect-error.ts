import { isRedirectError } from 'next/dist/client/components/redirect-error'

/** Re-lance les redirections / navigations Next.js (ne pas les avaler dans un catch). */
export function rethrowIfRedirect(error: unknown): void {
  if (isRedirectError(error)) {
    throw error
  }
}
