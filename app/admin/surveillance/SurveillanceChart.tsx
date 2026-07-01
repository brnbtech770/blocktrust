'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type SurveillanceChartProps = {
  data: { hour: string; count: number }[]
}

export default function SurveillanceChart({ data }: SurveillanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis
          dataKey="hour"
          tick={{ fill: 'var(--bt-muted)', fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: 'var(--bt-muted)', fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: '#0a1628',
            border: '1px solid var(--bt-border)',
            borderRadius: 8,
          }}
          labelStyle={{ color: 'var(--bt-muted)' }}
        />
        <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} name="Vérifications" />
      </BarChart>
    </ResponsiveContainer>
  )
}
