import { Tag, Type, Orbit, Sparkles, RotateCcw } from 'lucide-react'

export default function GraphControls({
  tags,
  filterTagId,
  onFilterTagChange,
  showLabels,
  onToggleLabels,
  physicsEnabled,
  onTogglePhysics,
  autoRotate,
  onToggleAutoRotate,
  showParticles,
  onToggleParticles,
}) {
  return (
    <div className="absolute right-4 top-4 z-10 w-56 rounded-xl border border-line bg-panel/90 p-3 text-xs text-fg-dim shadow-2xl backdrop-blur">
      <div className="mb-2.5">
        <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-fg-faint">
          <Tag size={12} /> Lọc theo tag
        </label>
        <select
          value={filterTagId ?? ''}
          onChange={(e) => onFilterTagChange(e.target.value || null)}
          className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-fg-dim outline-none"
        >
          <option value="">Tất cả</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ''}{t.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <ToggleRow icon={Type} label="Hiện nhãn" checked={showLabels} onChange={onToggleLabels} />
        <ToggleRow icon={Orbit} label="Bật vật lý" checked={physicsEnabled} onChange={onTogglePhysics} />
        <ToggleRow icon={RotateCcw} label="Tự xoay" checked={autoRotate} onChange={onToggleAutoRotate} />
        <ToggleRow icon={Sparkles} label="Hạt chạy trên link" checked={showParticles} onChange={onToggleParticles} />
      </div>
    </div>
  )
}

function ToggleRow({ icon: Icon, label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1 hover:bg-panel-2">
      <span className="flex items-center gap-1.5">
        <Icon size={12} className="text-fg-mute" /> {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-star"
      />
    </label>
  )
}
