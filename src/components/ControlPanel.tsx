'use client';

import { useState } from 'react';
import { useControlsStore } from '@/store/controlsStore';

// ─── toggle ──────────────────────────────────────────────────────────────────

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ color: '#888888', fontSize: 12, letterSpacing: '0.02em' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          border: '1px solid ' + (value ? '#333333' : '#1a1a1a'),
          background: value ? '#1e1e1e' : '#0d0d0d',
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 17 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: value ? '#e8e8e8' : '#333333',
            transition: 'left 0.15s, background 0.15s',
          }}
        />
      </button>
    </div>
  );
}

// ─── slider ───────────────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  unit = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#888888', fontSize: 11, letterSpacing: '0.02em' }}>{label}</span>
        <span style={{ color: '#555555', fontSize: 11, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
          {value.toFixed(2)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 3 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 2, background: '#141414' }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${pct}%`,
            height: '100%',
            borderRadius: 2,
            background: '#ffffff',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', inset: '-6px 0', opacity: 0, cursor: 'pointer', width: '100%' }}
        />
      </div>
    </div>
  );
}

// ─── section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.14em',
          color: '#333333',
          textTransform: 'uppercase',
          marginBottom: 12,
          paddingBottom: 6,
          borderBottom: '1px solid #111111',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── panel ────────────────────────────────────────────────────────────────────

export default function ControlPanel() {
  const [open, setOpen] = useState(false);
  const ctrl = useControlsStore();
  const s = ctrl.set;

  return (
    <>
      {/* Tab */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Controls"
        style={{
          position: 'fixed',
          top: '50%',
          right: open ? 268 : 0,
          transform: 'translateY(-50%)',
          zIndex: 30,
          background: 'rgba(6,6,6,0.96)',
          borderTop: '1px solid #181818',
          borderBottom: '1px solid #181818',
          borderLeft: '1px solid #181818',
          borderRight: open ? '1px solid #181818' : 'none',
          borderRadius: '3px 0 0 3px',
          color: '#444444',
          width: 22,
          height: 60,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'right 0.25s ease',
          fontSize: 10,
          letterSpacing: '0.08em',
        }}
      >
        {open ? '›' : '‹'}
      </button>

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 72,
          right: open ? 0 : -268,
          width: 268,
          zIndex: 20,
          background: 'rgba(6,6,6,0.97)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid #141414',
          transition: 'right 0.25s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '22px 18px 32px',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            color: '#333333',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            margin: '0 0 24px 0',
          }}
        >
          Controls
        </p>

        <Section title="Visibility">
          <Toggle label="Particles" value={ctrl.particlesEnabled} onChange={(v) => s({ particlesEnabled: v })} />
          <Toggle label="Nebula" value={ctrl.nebulaEnabled} onChange={(v) => s({ nebulaEnabled: v })} />
          <Toggle label="Sphere" value={ctrl.sphereEnabled} onChange={(v) => s({ sphereEnabled: v })} />
        </Section>

        <Section title="Particles">
          <Slider label="Speed" value={ctrl.particleSpeed} min={0.05} max={3.0} onChange={(v) => s({ particleSpeed: v })} unit="×" />
          <Slider label="Size" value={ctrl.particleSize} min={0.2} max={4.0} onChange={(v) => s({ particleSize: v })} unit="×" />
        </Section>

        <Section title="Camera">
          <Slider label="Shake" value={ctrl.cameraShake} min={0} max={2.0} onChange={(v) => s({ cameraShake: v })} />
          <Slider label="Sway" value={ctrl.cameraSway} min={0} max={2.0} onChange={(v) => s({ cameraSway: v })} />
        </Section>

        <Section title="Bloom">
          <Slider label="Strength" value={ctrl.bloomStrength} min={0} max={2.5} onChange={(v) => s({ bloomStrength: v })} />
        </Section>

        <Section title="Audio">
          <Slider label="Global Gain" value={ctrl.reactivityGain} min={0.1} max={3.0} onChange={(v) => s({ reactivityGain: v })} unit="×" />
        </Section>

        <Section title="Sphere">
          <Slider label="Size" value={ctrl.sphereScale} min={0.3} max={2.0} onChange={(v) => s({ sphereScale: v })} unit="×" />
          <Slider label="Reactivity" value={ctrl.sphereReactivity} min={0.1} max={3.0} onChange={(v) => s({ sphereReactivity: v })} unit="×" />
          <Toggle label="Wireframe" value={ctrl.sphereWireframe} onChange={(v) => s({ sphereWireframe: v })} />
        </Section>

        <button
          onClick={() =>
            s({
              particlesEnabled: true, nebulaEnabled: true, sphereEnabled: true,
              particleSpeed: 1.0, particleSize: 1.0,
              bloomStrength: 1.0, cameraShake: 1.0,
              cameraSway: 1.0, reactivityGain: 1.0,
              sphereScale: 1.0, sphereReactivity: 1.0, sphereWireframe: true,
            })
          }
          style={{
            width: '100%',
            padding: '8px 0',
            background: 'transparent',
            border: '1px solid #1a1a1a',
            borderRadius: 3,
            color: '#333333',
            fontSize: 10,
            cursor: 'pointer',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'color 0.12s, border-color 0.12s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#888888';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#333333';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#333333';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a1a1a';
          }}
        >
          Reset
        </button>
      </div>
    </>
  );
}
