import { Orbit } from 'lucide-react'
import { useTagStore } from '../../stores/tagStore'

export default function TagTree({ onFilterTag, activeTagId }) {
  const { tags, relations } = useTagStore()
  const childIds = new Set(relations.map((r) => r.child_id))

  if (!tags.length) {
    return <div className="px-4 py-8 text-center text-sm text-fg-mute">Chưa có tag nào.</div>
  }

  return (
    <ul className="flex flex-col gap-0.5 px-2">
      {tags.map((t) => {
        const isRoot = !childIds.has(t.id)
        const isSpace = t.is_space || isRoot
        return (
          <li key={t.id}>
            <button
              onClick={() => onFilterTag(t.id === activeTagId ? null : t.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition
                ${t.id === activeTagId ? 'bg-panel-2 text-fg' : 'text-fg-dim hover:bg-panel-2/60'}`}
            >
              {isSpace ? (
                <Orbit size={13} style={{ color: t.color }} className="shrink-0" />
              ) : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
              )}
              <span className="flex-1 truncate">
                {t.icon ? `${t.icon} ` : ''}
                {t.name}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
