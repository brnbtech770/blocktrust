// app/components/admin/IdCell.tsx
// ID tronqué avec tooltip (voir l'ID complet au hover).
// ============================================================

export default function IdCell({
  id,
  display,
}: {
  id: string
  display?: string
}) {
  const label = display ?? id
  return (
    <code
      title={id}
      className="block max-w-[120px] truncate rounded bg-bt-cyan/5 px-2 py-1 font-mono text-xs text-bt-cyan/70"
    >
      {label}
    </code>
  )
}
