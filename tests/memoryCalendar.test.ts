import { describe, it, expect } from 'vitest'
import { isPlaceholder } from '../src/utils/placeholders'
import { project } from '../src/data/project'
import {
  memoryStages,
  isRealDate,
  parseDateLabel,
  getMonthName,
  getDaysInMonth,
  getFirstWeekday,
  formatNoteDate,
} from '../src/data/memoryCalendar'

describe('memory calendar — real data only', () => {
  it('derives one stage per timeline event', () => {
    expect(memoryStages.length).toBe(project.timeline.length)
    memoryStages.forEach((s, i) => {
      const ev = project.timeline[i]
      expect(s.title).toBe(ev.title)
      expect(s.description).toBe(ev.description)
      expect(s.dateLabel === ev.dateLabel || (s.dateLabel === null && isPlaceholder(ev.dateLabel))).toBe(
        true,
      )
    })
  })

  it('parses real DD/MM/YYYY labels into local dates', () => {
    expect(isRealDate('05/03/2026')).toBe(true)
    expect(parseDateLabel('19/10/2026')?.toISOString().slice(0, 7)).toBe('2026-10')
  })

  it('rejects placeholders and impossible dates', () => {
    expect(isRealDate(undefined)).toBe(false)
    expect(isRealDate('TODO_REAL_CONTENT')).toBe(false)
    expect(isRealDate('32/01/2026')).toBe(false)
    expect(isRealDate('13/13/2026')).toBe(false)
    expect(isRealDate('00/05/2026')).toBe(false)
  })

  it('computes calendar layout helpers', () => {
    const d = parseDateLabel('15/05/2026')
    expect(getMonthName(d)).toBe('maio')
    expect(getDaysInMonth(d)).toBe(31)
    expect(getFirstWeekday(d)).toBe(5) // 1º de maio de 2026 é sexta
    expect(formatNoteDate(d)).toBe('15/05/2026')
  })

  it('never invents dates for pending labels', () => {
    for (const s of memoryStages) {
      if (isPlaceholder(project.timeline[memoryStages.indexOf(s)].dateLabel)) {
        expect(s.date).toBeNull()
        expect(s.dateLabel).toBeNull()
      } else {
        expect(s.date).not.toBeNull()
        expect(formatNoteDate(s.date)).toBe(s.dateLabel)
      }
    }
  })

  it('keeps the mark word inside the real title', () => {
    for (const s of memoryStages) {
      expect(s.title).toContain(s.markWord)
    }
  })
})