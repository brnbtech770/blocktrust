'use client'

import Link from 'next/link'

interface QuotaBannerProps {
  current:           number
  limit:             number | null
  percentage:        number
  shouldShowUpgrade: boolean
  upgradeMessage:    string | null
}

export function QuotaBanner({
  current, limit, percentage,
  shouldShowUpgrade, upgradeMessage,
}: QuotaBannerProps) {
  if (!limit) return null

  const pct      = Math.min(percentage, 1)
  const barColor =
    pct >= 1   ? '#E05252' :
    pct >= 0.8 ? '#E8943A' :
                 '#00d4ff'

  const borderColor =
    pct >= 1   ? 'rgba(224,82,82,0.3)' :
    pct >= 0.8 ? 'rgba(232,148,58,0.3)' :
                 'rgba(0,212,255,0.15)'

  return (
    <div style={{
      background:   'rgba(13,31,60,0.8)',
      border:       `1px solid ${borderColor}`,
      borderRadius: '10px',
      padding:      '12px 16px',
      marginBottom: '16px',
    }}>
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   '8px',
      }}>
        <span style={{
          fontFamily:    'var(--font-mono-bt), monospace',
          fontSize:      '10px',
          color:         'rgba(255,255,255,0.4)',
          letterSpacing: '0.12em',
        }}>
          TRUST CIRCLE
        </span>
        <span style={{
          fontFamily: 'var(--font-mono-bt), monospace',
          fontSize:   '11px',
          color:      barColor,
          fontWeight: 600,
        }}>
          {current} / {limit}
        </span>
      </div>

      <div style={{
        height:       '4px',
        background:   'rgba(255,255,255,0.08)',
        borderRadius: '2px',
        overflow:     'hidden',
        marginBottom: shouldShowUpgrade ? '10px' : '0',
      }}>
        <div style={{
          height:     '100%',
          width:      `${pct * 100}%`,
          background: barColor,
          transition: 'width 0.4s ease',
        }}/>
      </div>

      {shouldShowUpgrade && upgradeMessage && (
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '12px',
        }}>
          <span style={{
            fontSize: '12px',
            color:    'rgba(255,255,255,0.6)',
            flex:     1,
          }}>
            {upgradeMessage}
          </span>
          <Link
            href="/pricing"
            className="font-syne whitespace-nowrap rounded-md px-3.5 py-1 text-[11px] font-bold no-underline"
            style={{
              background: pct >= 1 ? '#E05252' : '#E8943A',
              color: '#0a1628',
            }}
          >
            Upgrader →
          </Link>
        </div>
      )}
    </div>
  )
}
