import { useMemo } from 'react'
import { useEditor } from '../../store/useEditor'
import { validate } from '../../lint/validate'
import { Empty, Section } from '../controls'

const TITLE = { error: 'Ошибка', warn: 'Стоит поправить', info: 'Подсказка' } as const

export function CheckPanel() {
  const project = useEditor((s) => s.project)
  const overflow = useEditor((s) => s.overflow)
  const selectSlide = useEditor((s) => s.selectSlide)
  const selectBlock = useEditor((s) => s.selectBlock)

  const issues = useMemo(() => validate(project, overflow), [project, overflow])
  const order = { error: 0, warn: 1, info: 2 }
  const sorted = [...issues].sort((a, b) => order[a.level] - order[b.level])

  if (!issues.length) {
    return (
      <div className="panel">
        <Empty
          icon="✓"
          title="Всё по гайдлайну"
          hint="Контент помещается, цвета из палитры, контраст в норме. Можно выгружать."
        />
      </div>
    )
  }

  return (
    <div className="panel">
      <Section title={`Найдено · ${issues.length}`}>
        <div className="col" style={{ gap: 6 }}>
          {sorted.map((issue, i) => (
            <div
              key={i}
              className={`issue ${issue.level}`}
              onClick={() => {
                selectSlide(issue.slideId)
                if (issue.blockId) selectBlock(issue.blockId)
              }}
            >
              <div>
                <b>{issue.message}</b>
                <span>
                  {TITLE[issue.level]}
                  {issue.fix ? ` · ${issue.fix}` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
