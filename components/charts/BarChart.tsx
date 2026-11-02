'use client';

import { useState } from 'react';

/** Single-series bar colour: brand teal, validated for contrast and chroma on the light card surface. */
const BAR = '#3b82f6';

export type BarDatum = { label: string; value: number; /** Shown in the tooltip/table instead of the raw value. */ display?: string };

/**
 * Minimal single-series bar chart: thin bars with rounded tops on a zero baseline, a recessive grid,
 * a hover/focus tooltip on every bar, and a table view for screen readers and exact numbers.
 */
export default function BarChart({
  title,
  data,
  height = 160,
  labelEvery = 1,
}: {
  title: string;
  data: BarDatum[];
  height?: number;
  /** Show every Nth x-axis label so dense series (30 days, 24 hours) stay readable. */
  labelEvery?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const empty = data.every((d) => d.value === 0);

  return (
    <figure style={{ margin: 0, display: 'grid', gap: 8 }}>
      <figcaption style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: '0.95rem' }}>{title}</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Chart' : 'Table'}
        </button>
      </figcaption>

      {asTable ? (
        <div style={{ maxHeight: height + 40, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '4px 0' }}>{d.label}</td>
                  <td style={{ padding: '4px 0', textAlign: 'right' }}>{d.display ?? d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : empty ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', height, display: 'grid', placeItems: 'center' }}>
          No data for this period yet.
        </p>
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            role="img"
            aria-label={`${title}. Highest: ${data.reduce((a, b) => (b.value > a.value ? b : a)).label}. Use Table for all values.`}
            style={{
              height,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 2,
              borderBottom: '1px solid var(--border-color)',
              backgroundImage: 'linear-gradient(to top, var(--border-color) 1px, transparent 1px)',
              backgroundSize: `100% ${height / 2}px`,
            }}
          >
            {data.map((d, i) => (
              <div
                key={d.label}
                tabIndex={0}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${d.label}: ${d.display ?? d.value}`}
                // Full-height hit target so thin bars are easy to hover or tap.
                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default', outline: 'none' }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 28,
                    margin: '0 auto',
                    height: `${(d.value / max) * 100}%`,
                    minHeight: d.value > 0 ? 2 : 0,
                    background: BAR,
                    opacity: active === null || active === i ? 1 : 0.55,
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              </div>
            ))}
          </div>
          {active !== null && (
            <div
              role="status"
              style={{
                position: 'absolute',
                top: -6,
                left: `${((active + 0.5) / data.length) * 100}%`,
                transform: 'translate(-50%, -100%)',
                background: 'var(--text-primary, #111827)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {data[active].label}: <strong>{data[active].display ?? data[active].value}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
            {data.map((d, i) => (
              <span
                key={d.label}
                style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                {i % labelEvery === 0 ? d.label : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}
