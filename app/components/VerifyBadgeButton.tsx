import { ScanLine } from 'lucide-react'

/** Lien vers la page de vérification (nouvel onglet), sous un QR badge/certificat */
export default function VerifyBadgeButton({
  certId,
  href,
}: {
  certId: string
  /** Si fourni (ex. `/verify/<jti>?h=…`), prévaut sur `?certId=` pour une vérif avec contexte */
  href?: string
}) {
  const target = href ?? `/verify?certId=${encodeURIComponent(certId)}`
  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-2.5 mt-3 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-semibold rounded-lg transition"
    >
      <ScanLine className="w-4 h-4 shrink-0" aria-hidden />
      Vérifier ce badge
    </a>
  )
}
