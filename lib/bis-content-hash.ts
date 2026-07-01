/**
 * Empreinte SHA-256 côté client pour signatures BIS (fichier jamais uploadé).
 */

export const BIS_MAX_FILE_BYTES = 10 * 1024 * 1024

export const BIS_ACCEPTED_FILE_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.docx',
  '.xlsx',
  '.txt',
] as const

export const BIS_ACCEPTED_FILE_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

export const BIS_FILE_ACCEPT_ATTR =
  '.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.txt,application/pdf,image/png,image/jpeg,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function sha256Text(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(hash)
}

export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return bytesToHex(hash)
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isAcceptedBisFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const extOk = BIS_ACCEPTED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))
  const mimeOk = !file.type || BIS_ACCEPTED_FILE_MIME.includes(file.type as (typeof BIS_ACCEPTED_FILE_MIME)[number])
  return extOk && mimeOk
}

export function formatBisFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
