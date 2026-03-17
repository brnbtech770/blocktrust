import { Syne, IBM_Plex_Mono } from "next/font/google";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${syne.variable} ${ibmPlexMono.variable}`}
      style={{
        minHeight: "100vh",
        backgroundColor: "#001a33",
        fontFamily: "var(--font-ibm-plex-mono), monospace",
      }}
    >
      {children}
    </div>
  );
}
