export default function ToggleSwitch({ checked, onChange }) {
  return (
    <label className="relative inline-block h-5 w-9 shrink-0 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <div className="absolute inset-0 rounded-full border border-line-2 bg-panel-2 transition-colors peer-checked:border-star peer-checked:bg-[#3b5fc0]" />
      <div className="absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
    </label>
  )
}
