import { useState } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import ToggleSwitch from './ToggleSwitch'

// Faithful port of ui/graph_3d_view.py's real settings panel — vertical
// tab on the right edge, slide-out panel, collapsible sections (Bộ lọc /
// Hiển thị / Lực), toggle switches + sliders. Not the plain-checkbox box
// from the first pass, which didn't match desktop at all.
//
// Sliders ported: node size, link opacity, charge, link distance — the
// four with the most visible effect. Desktop also has label-scale,
// desc-fontsize, particle-speed, particle-size sliders that aren't wired
// here yet; the toggles and structural layout are the faithful part.

const DEFAULT_SETTINGS = {
  showTags: true,
  showNotes: true,
  orphansOnly: false,
  spacesOnly: false,
  showLabels: true,
  showArrows: false,
  showParticles: true,
  labelScale: 1.0,
  descFontsize: 11,
  nodeSizeScale: 1.0,
  linkWidthScale: 1.0,
  linkOpacity: 0.6,
  particleSpeed: 0.004,
  particleSize: 2.5,
  charge: -200,
  chargeSpace: -450,
  linkDistance: 110,
  centerForce: 0.05,
  velocityDecay: 0.35,
  physicsEnabled: true,
}

export { DEFAULT_SETTINGS }

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-fg-faint transition hover:text-fg"
      >
        <span>▸ {title}</span>
        <span className={`text-[10px] transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="space-y-1.5 px-3 pb-3">{children}</div>}
    </div>
  )
}

function Row({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <label className="text-[11px] text-fg-faint">{label}</label>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

function SliderRow({ label, value, unit = '', min, max, step, onChange }) {
  return (
    <div className="mb-1 mt-1.5">
      <label className="mb-1 flex justify-between text-[11px] text-fg-faint">
        <span>{label}</span>
        <span className="text-star">{value}{unit}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line-2 accent-star"
      />
    </div>
  )
}

export default function GraphControls({ settings, onChange, onReheat, searchQuery, onSearchChange, searchResults, onSearchPick }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const set = (patch) => onChange({ ...settings, ...patch })

  return (
    <>
      <button
        onClick={() => setPanelOpen((v) => !v)}
        title="Mở / đóng bộ điều khiển"
        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-md border border-r-0 border-line bg-panel/90 px-1.5 py-2.5 text-[11px] tracking-widest text-fg-faint backdrop-blur transition hover:text-fg"
        style={{ writingMode: 'vertical-lr' }}
      >
        ⚙ Điều khiển
      </button>

      <div
        className={`absolute right-0 top-0 z-10 h-full w-64 border-l border-line bg-panel/95 backdrop-blur transition-transform duration-200 ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <span className="text-xs font-semibold text-fg">Bộ điều khiển</span>
          <button
            onClick={() => onChange(DEFAULT_SETTINGS)}
            title="Reset về mặc định"
            className="rounded p-1 text-fg-mute hover:text-fg"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        <div className="border-b border-line p-2.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-mute" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm space / tag…"
              className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-2 text-xs text-fg outline-none focus:border-star"
            />
          </div>
          {searchResults?.length > 0 && (
            <div className="mt-1 max-h-36 overflow-y-auto rounded-md border border-line bg-bg">
              {searchResults.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onSearchPick(n)}
                  className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs text-fg-dim hover:bg-panel-2"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: n.color }} />
                  <span className="truncate">{n.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 110px)' }}>
          <Section title="Bộ lọc">
            <Row label="Hiện tags" checked={settings.showTags} onChange={(v) => set({ showTags: v })} />
            <Row label="Hiện notes" checked={settings.showNotes} onChange={(v) => set({ showNotes: v })} />
            <Row label="Notes mồ côi" checked={settings.orphansOnly} onChange={(v) => set({ orphansOnly: v })} />
            <Row label="Chỉ Space roots" checked={settings.spacesOnly} onChange={(v) => set({ spacesOnly: v })} />
          </Section>

          <Section title="Hiển thị">
            <Row label="Labels" checked={settings.showLabels} onChange={(v) => set({ showLabels: v })} />
            <Row label="Mũi tên" checked={settings.showArrows} onChange={(v) => set({ showArrows: v })} />
            <Row label="Particles" checked={settings.showParticles} onChange={(v) => set({ showParticles: v })} />
            <SliderRow label="Cỡ chữ label" unit="×" value={settings.labelScale} min={0.3} max={3.0} step={0.1} onChange={(v) => set({ labelScale: v })} />
            <SliderRow label="Cỡ chữ mô tả" unit="px" value={settings.descFontsize} min={9} max={18} step={1} onChange={(v) => set({ descFontsize: v })} />
            <SliderRow label="Kích thước nút" unit="×" value={settings.nodeSizeScale} min={0.3} max={3.0} step={0.1} onChange={(v) => set({ nodeSizeScale: v })} />
            <SliderRow label="Độ dày link" unit="×" value={settings.linkWidthScale ?? 1.0} min={0.2} max={4.0} step={0.2} onChange={(v) => set({ linkWidthScale: v })} />
            <SliderRow label="Opacity link" value={settings.linkOpacity} min={0.05} max={1.0} step={0.05} onChange={(v) => set({ linkOpacity: v })} />
            <SliderRow label="Tốc độ hạt" value={settings.particleSpeed} min={0.001} max={0.03} step={0.001} onChange={(v) => set({ particleSpeed: v })} />
            <SliderRow label="Cỡ hạt" value={settings.particleSize} min={0.5} max={6} step={0.5} onChange={(v) => set({ particleSize: v })} />
            <button
              onClick={() => set({ physicsEnabled: !settings.physicsEnabled })}
              className="mt-1 w-full rounded-md bg-[#3b5fc0] py-1.5 text-xs font-semibold text-white transition hover:bg-star"
            >
              {settings.physicsEnabled ? '⏸ Dừng hoạt ảnh' : '▶ Tiếp tục hoạt ảnh'}
            </button>
          </Section>

          <Section title="Lực" defaultOpen={false}>
            <SliderRow label="Lực đẩy" value={settings.charge} min={-800} max={-20} step={10} onChange={(v) => set({ charge: v })} />
            <SliderRow label="Lực đẩy Space" value={settings.chargeSpace} min={-1200} max={-50} step={25} onChange={(v) => set({ chargeSpace: v })} />
            <SliderRow label="Khoảng cách link" value={settings.linkDistance} min={20} max={400} step={10} onChange={(v) => set({ linkDistance: v })} />
            <SliderRow label="Lực tâm" value={settings.centerForce} min={0} max={0.5} step={0.01} onChange={(v) => set({ centerForce: v })} />
            <SliderRow label="Velocity decay" value={settings.velocityDecay} min={0.1} max={0.9} step={0.05} onChange={(v) => set({ velocityDecay: v })} />
            <button
              onClick={onReheat}
              className="mt-1 w-full rounded-md bg-[#1e3060] py-1.5 text-xs font-semibold text-white transition hover:bg-[#2a5090]"
            >
              🔥 Kích hoạt lại
            </button>
          </Section>
        </div>
      </div>
    </>
  )
}
