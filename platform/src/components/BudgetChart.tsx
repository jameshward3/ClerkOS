'use client'
/** Horizontal stacked bars: rows = fiscal years, segments = additive categories. Zero baseline. */
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Row = { label: string; [k: string]: number | string | null }
const usd = (cents: number) => `$${(cents / 1e8).toFixed(0)}M`

export function StackedYears({ rows, series, title }: { rows: Row[]; series: { key: string; label: string; color: string }[]; title: string }) {
  return (
    <div>
    <ul className="map-legend" aria-hidden="true" style={{ listStyle: 'none', padding: 0 }}>
      {series.map((s) => <li key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 14, height: 14, background: s.color, display: 'inline-block', border: '1px solid #526171' }} />{s.label}</li>)}
    </ul>
    <div aria-hidden="true" style={{ width: '100%', height: 70 + rows.length * 56 }} data-chart={title}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} stroke="#CDD4DC" />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={usd} tick={{ fill: '#17283A', fontSize: 14 }} />
          <YAxis type="category" dataKey="label" width={150} tick={{ fill: '#17283A', fontSize: 14 }} />
          <Tooltip formatter={(v: any) => (v == null ? 'Not available' : `$${(Number(v) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`)} />
          {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="#FFFFFF" strokeWidth={1} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
    </div>
  )
}

export function SimpleBars({ rows, title }: { rows: { label: string; cents: number | null; color: string }[]; title: string }) {
  return (
    <div aria-hidden="true" style={{ width: '100%', height: 60 + rows.length * 48 }} data-chart={title}>
      <ResponsiveContainer>
        <BarChart data={rows.map((r) => ({ ...r, value: r.cents }))} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} stroke="#CDD4DC" />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={usd} tick={{ fill: '#17283A', fontSize: 14 }} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#17283A', fontSize: 14 }} />
          <Bar dataKey="value" name="Amount" fill="#0B2035" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
