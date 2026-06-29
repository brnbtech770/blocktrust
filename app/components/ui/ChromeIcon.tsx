type ChromeIconProps = {
  className?: string;
};

/** Icône Chrome (couleurs Google) — usage UI promotion extension. */
export default function ChromeIcon({ className }: ChromeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" fill="#4285F4" />
      <path d="M12 6.5a5.5 5.5 0 0 0-4.76 2.75h9.52A5.5 5.5 0 0 0 12 6.5Z" fill="#EA4335" />
      <path d="M6.24 9.25 4.1 13.95A5.5 5.5 0 0 0 12 17.5V12L6.24 9.25Z" fill="#34A853" />
      <path d="M12 12 5.76 9.25A5.5 5.5 0 0 0 12 17.5c2.21 0 4.12-1.31 4.99-3.2L12 12Z" fill="#FBBC05" />
      <circle cx="12" cy="12" r="3.25" fill="#fff" />
      <circle cx="12" cy="12" r="2.1" fill="#4285F4" />
    </svg>
  );
}
