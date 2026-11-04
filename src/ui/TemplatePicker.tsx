import { useEditor } from '../store/useEditor'
import { TEMPLATES } from '../design/templates'
import { FORMATS } from '../design/tokens'
import { SlideView } from '../render/SlideView'
import { Modal } from './controls'

export function TemplatePicker({ onClose }: { onClose: () => void }) {
  const project = useEditor((s) => s.project)
  const theme = useEditor((s) => s.theme)
  const addSlide = useEditor((s) => s.addSlide)
  const format = FORMATS[project.format]
  const w = 150
  const k = w / format.width

  return (
    <Modal title="Добавить слайд" onClose={onClose}>
      <div className="tpl-grid">
        {TEMPLATES.map((t) => {
          const demo = t.make(theme)
          return (
            <button
              key={t.id}
              className="tpl"
              onClick={() => {
                addSlide(t.id)
                onClose()
              }}
            >
              <span
                className="preview"
                style={{ width: w, height: Math.round(format.height * k) }}
              >
                <span
                  style={{
                    display: 'block',
                    transform: `scale(${k})`,
                    transformOrigin: 'top left',
                    width: format.width,
                    height: format.height,
                  }}
                >
                  <SlideView slide={demo} project={project} />
                </span>
              </span>
              <b>{t.name}</b>
              <span>{t.hint}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
