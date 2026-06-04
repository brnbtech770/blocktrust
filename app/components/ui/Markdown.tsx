// Rendu Markdown minimal et sûr (sans dépendance externe, sans dangerouslySetInnerHTML).
// Supporte : titres #/##/###, listes "- ", gras **, italique *, liens [txt](url),
// auto-lien des URLs http(s) et des emails, séparateurs ---.
// Chaque ligne de texte non vide devient un paragraphe (adapté aux textes juridiques).
// ============================================================

import React from 'react'

const LINK_CLASS = 'text-[#00d4ff] hover:underline break-words'

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex =
    /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s)]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g
  let lastIndex = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index))
    const key = `${keyPrefix}-${i++}`
    if (m[1]) {
      nodes.push(
        <strong key={key} className="font-semibold text-white">
          {m[2]}
        </strong>,
      )
    } else if (m[3]) {
      nodes.push(
        <em key={key} className="text-white/60 italic">
          {m[4]}
        </em>,
      )
    } else if (m[5]) {
      nodes.push(
        <a key={key} href={m[7]} className={LINK_CLASS} target="_blank" rel="noopener noreferrer">
          {m[6]}
        </a>,
      )
    } else if (m[8]) {
      nodes.push(
        <a key={key} href={m[8]} className={LINK_CLASS} target="_blank" rel="noopener noreferrer">
          {m[8]}
        </a>,
      )
    } else if (m[9]) {
      nodes.push(
        <a key={key} href={`mailto:${m[9]}`} className={LINK_CLASS}>
          {m[9]}
        </a>,
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

export default function Markdown({ source }: { source: string }) {
  const cleaned = source.replace(/<!--[\s\S]*?-->/g, '')
  const lines = cleaned.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (line === '') {
      i++
      continue
    }

    if (/^-{3,}$/.test(line)) {
      const prev = blocks[blocks.length - 1] as React.ReactElement | undefined
      if (prev?.type !== 'hr') {
        blocks.push(<hr key={`b-${key++}`} className="my-8 border-white/10" />)
      }
      i++
      continue
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={`b-${key++}`} className="font-syne mt-6 mb-2 text-lg font-semibold text-white">
          {renderInline(line.slice(4), `h3-${key}`)}
        </h3>,
      )
      i++
      continue
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={`b-${key++}`} className="font-syne mt-8 mb-3 text-xl font-bold text-white">
          {renderInline(line.slice(3), `h2-${key}`)}
        </h2>,
      )
      i++
      continue
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={`b-${key++}`} className="font-syne mt-2 mb-6 text-3xl font-bold text-white">
          {renderInline(line.slice(2), `h1-${key}`)}
        </h1>,
      )
      i++
      continue
    }

    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2))
        i++
      }
      blocks.push(
        <ul
          key={`b-${key++}`}
          className="mb-4 list-disc space-y-1 pl-6 text-sm leading-relaxed"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `li-${key}-${idx}`)}</li>
          ))}
        </ul>,
      )
      continue
    }

    blocks.push(
      <p key={`b-${key++}`} className="mb-4 text-sm leading-relaxed">
        {renderInline(line, `p-${key}`)}
      </p>,
    )
    i++
  }

  return <>{blocks}</>
}
