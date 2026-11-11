import { useEditor, useSlide } from '../store/useEditor'
import { TYPE_SCALE } from '../design/tokens'
import type { Block, BlockType } from '../types'
import { CloseGlyph, CopyGlyph, ArrowUpGlyph, ArrowDownGlyph } from './icons'

const labels: Record<BlockType, string> = {
  text: 'Текст', list: 'Список', quote: 'Цитата', caption: 'Подпись к фото', spacer: 'Отступ',
}
const title = (b: Block) => b.type === 'text' ? TYPE_SCALE[b.variant].label : labels[b.type]

export function LayerList() {
  const slide = useSlide()
  const selected = useEditor((s) => s.sel.blockId)
  const select = useEditor((s) => s.selectBlock)
  const move = useEditor((s) => s.moveBlock)
  const duplicate = useEditor((s) => s.duplicateBlock)
  const remove = useEditor((s) => s.deleteBlock)
  if (!slide) return null
  const selectedId = selected ?? slide.blocks[0]?.id ?? null
  return <aside className="layer-list" aria-label="Слои">
    <div className="layer-items">
      {slide.blocks.map((block, i) => <div className="layer-row" key={block.id} aria-selected={selectedId === block.id}>
        <button className="layer-name" onClick={() => select(block.id)}>{i + 1}. {title(block)}</button>
        <div className="layer-actions">
          <button title="Удалить" aria-label="Удалить блок" onClick={() => remove(block.id)}><CloseGlyph /></button>
          <button title="Дублировать" aria-label="Дублировать блок" onClick={() => duplicate(block.id)}><CopyGlyph /></button>
          <button title="Выше" aria-label="Выше" disabled={i === 0} onClick={() => move(block.id, -1)}><ArrowUpGlyph /></button>
          <button title="Ниже" aria-label="Ниже" disabled={i === slide.blocks.length - 1} onClick={() => move(block.id, 1)}><ArrowDownGlyph /></button>
        </div>
      </div>)}
    </div>
  </aside>
}
