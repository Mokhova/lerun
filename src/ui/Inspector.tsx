import { useMemo } from 'react'
import { useEditor } from '../store/useEditor'
import { validate, countBy } from '../lint/validate'
import { ContentPanel } from './panels/ContentPanel'
import { StylePanel } from './panels/StylePanel'
import { DecorPanel } from './panels/DecorPanel'
import { CheckPanel } from './panels/CheckPanel'
import { GridIcon } from './icons'

const TABS = [
  { id: 'content', label: 'Контент' },
  { id: 'decor', label: 'Декор' },
  { id: 'check', label: 'Проверка' },
  { id: 'style', label: 'Стиль' },
] as const

export function Inspector() {
  const panel = useEditor((s) => s.panel)
  const setPanel = useEditor((s) => s.setPanel)
  const project = useEditor((s) => s.project)
  const overflow = useEditor((s) => s.overflow)
  const showGuides = useEditor((s) => s.showGuides)
  const toggleGuides = useEditor((s) => s.toggleGuides)

  const issues = useMemo(() => validate(project, overflow), [project, overflow])
  const errors = countBy(issues, 'error')

  return (
    <aside className="inspector">
      <div className="ins-tabs">
        <div className="ins-tabs-row">
          {TABS.map((t) => (
            <button
              key={t.id}
              className="ins-tab"
              aria-pressed={panel === t.id}
              onClick={() => setPanel(t.id)}
            >
              {t.label}
              {/* the badge counts everything the panel lists, not just errors */}
              {t.id === 'check' && issues.length ? (
                <span className="ins-pill" data-kind={errors ? 'error' : 'warn'}>
                  {issues.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <button
          className="ins-chip"
          aria-pressed={showGuides}
          onClick={toggleGuides}
          title="Показать безопасную зону слайда"
          aria-label="Показать безопасную зону слайда"
        >
          <GridIcon />
          <span>Сетка</span>
        </button>
      </div>

      {panel === 'content' ? <ContentPanel /> : null}
      {panel === 'style' ? <StylePanel /> : null}
      {panel === 'decor' ? <DecorPanel /> : null}
      {panel === 'check' ? <CheckPanel /> : null}
    </aside>
  )
}
