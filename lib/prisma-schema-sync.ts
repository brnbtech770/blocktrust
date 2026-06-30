// lib/prisma-schema-sync.ts
// Parse prisma/schema.prisma → DDL ADD COLUMN IF NOT EXISTS (PostgreSQL)
// ============================================================

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SCALAR_TYPES = new Set([
  'String',
  'Int',
  'Boolean',
  'DateTime',
  'Float',
  'Decimal',
  'Json',
  'BigInt',
  'Bytes',
])

export type ParsedColumn = {
  table: string
  column: string
  ddl: string
}

function stripComments(line: string): string {
  const idx = line.indexOf('//')
  return idx >= 0 ? line.slice(0, idx).trim() : line.trim()
}

function parseDefault(defaultPart: string, sqlType: string): string | undefined {
  const d = defaultPart.trim()
  if (!d.startsWith('@default')) return undefined

  if (d.includes('now()')) return 'DEFAULT CURRENT_TIMESTAMP'
  if (d.includes('@default(false)')) return 'DEFAULT false'
  if (d.includes('@default(true)')) return 'DEFAULT true'
  if (d.includes('@default(0)')) return 'DEFAULT 0'

  const strMatch = d.match(/@default\("([^"]*)"\)/)
  if (strMatch) return `DEFAULT '${strMatch[1].replace(/'/g, "''")}'`

  const enumMatch = d.match(/@default\(([A-Z_][A-Z0-9_]*)\)/)
  if (enumMatch) return `DEFAULT '${enumMatch[1]}'`

  if (d.includes('@default([])')) {
    if (sqlType.endsWith('[]')) return "DEFAULT ARRAY[]::TEXT[]"
  }

  return undefined
}

function prismaScalarToSql(baseType: string, attributes: string): string {
  if (attributes.includes('@db.Text')) return 'TEXT'
  if (baseType === 'String') return 'TEXT'
  if (baseType === 'Int') return 'INTEGER'
  if (baseType === 'Boolean') return 'BOOLEAN'
  if (baseType === 'DateTime') return 'TIMESTAMP(3)'
  if (baseType === 'Float') return 'DOUBLE PRECISION'
  if (baseType === 'Decimal') return 'DECIMAL(10,2)'
  if (baseType === 'Json') return 'JSONB'
  if (baseType === 'BigInt') return 'BIGINT'
  if (baseType === 'Bytes') return 'BYTEA'
  return 'TEXT'
}

export function parsePrismaSchemaColumns(schemaContent: string): ParsedColumn[] {
  const enumNames = new Set<string>()
  for (const match of schemaContent.matchAll(/^enum\s+(\w+)\s+\{/gm)) {
    enumNames.add(match[1])
  }

  const modelNames = new Set<string>()
  for (const match of schemaContent.matchAll(/^model\s+(\w+)\s+\{/gm)) {
    modelNames.add(match[1])
  }

  const columns: ParsedColumn[] = []

  const modelBlocks = schemaContent.split(/^model\s+/gm).slice(1)
  for (const block of modelBlocks) {
    const modelMatch = block.match(/^(\w+)\s+\{/)
    if (!modelMatch) continue
    const table = modelMatch[1]
    const body = block.slice(modelMatch[0].length)
    const bodyEnd = body.indexOf('\n}')
    const lines = (bodyEnd >= 0 ? body.slice(0, bodyEnd) : body).split('\n')

    for (const rawLine of lines) {
      const line = stripComments(rawLine)
      if (!line || line.startsWith('@@')) continue

      const fieldMatch = line.match(/^(\w+)\s+([A-Za-z][A-Za-z0-9_]*)(\[\])?(\?)?\s*(.*)$/)
      if (!fieldMatch) continue

      const [, column, baseType, isArray, optionalMark, attributes] = fieldMatch
      if (attributes.includes('@relation')) continue
      if (modelNames.has(baseType)) continue

      const isScalar = SCALAR_TYPES.has(baseType)
      const isEnum = enumNames.has(baseType)
      if (!isScalar && !isEnum) continue

      let sqlType = isEnum ? 'TEXT' : prismaScalarToSql(baseType, attributes)
      if (isArray) sqlType = `${sqlType}[]`

      const nullable = Boolean(optionalMark) || attributes.includes('?')
      const defaultSql = parseDefault(attributes, sqlType)

      let ddl = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${sqlType}`
      if (defaultSql) {
        ddl += ` ${defaultSql}`
        if (!nullable) ddl += ' NOT NULL'
      }

      columns.push({ table, column, ddl })
    }
  }

  return columns
}

export function loadPrismaSchemaColumns(schemaPath?: string): ParsedColumn[] {
  const path = schemaPath ?? resolve(process.cwd(), 'prisma/schema.prisma')
  const content = readFileSync(path, 'utf8')
  return parsePrismaSchemaColumns(content)
}

export function resolveDirectDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    url.hostname = url.hostname.replace(/-pooler\./, '.')
    url.searchParams.delete('pgbouncer')
    url.searchParams.set('connect_timeout', url.searchParams.get('connect_timeout') ?? '30')
    return url.toString()
  } catch {
    return rawUrl.replace('-pooler.', '.')
  }
}
