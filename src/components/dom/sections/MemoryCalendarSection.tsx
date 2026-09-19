import { useEffect, useRef, useState, useCallback } from 'react';
import type { Chapter } from '../../../story/chapters';
import { memoryStages, getDay, getDaysInMonth, getFirstDayOfWeek, getMonthName } from '../../../data/memoryCalendar';
import { SectionHeader } from './SectionHeader';
import { registerStoryMotion } from '../../../utils/scrollMotion';
import { quality } from '../../../utils/sim';

const DAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function MemoryCalendarSection({ chapter }: { chapter: Chapter }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const sectionRef = useRef<HTMLSectionElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  const currentStage = memoryStages[currentIndex];
  const monthName = getMonthName(currentStage.date).toUpperCase();
  const year = currentStage.date.getFullYear();
  const day = getDay(currentStage.date);
  const daysInMonth = getDaysInMonth(currentStage.date);
  const firstDayOfWeek = getFirstDayOfWeek(currentStage.date);

  const goToStage = useCallback((direction: 'next' | 'prev') => {
    if (isFlipping) return;
    setIsFlipping(true);
    setFlipDirection(direction);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = direction === 'next' ? (prev + 1) % memoryStages.length : (prev - 1 + memoryStages.length) % memoryStages.length;
        return next;
      });
      setTimeout(() => setIsFlipping(false), 600);
    }, 300);
  }, [isFlipping]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (quality.reducedMotion) {
      el.style.setProperty('--rv', '1');
      el.style.setProperty('--rvs', '1');
      return;
    }
    return registerStoryMotion(el, { fromT: chapter.tStart - 0.01, toT: chapter.tStart + 0.08 });
  }, [chapter.tStart]);

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    const timer = setTimeout(() => {
      setIsUnfolded(true);
      hasAnimatedRef.current = true;
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const buildCalendarGrid = () => {
    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-day empty" />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(
        <div
          key={d}
          className={`cal-day ${d === day ? 'cal-day--marked' : ''}`}
        >
          <span className="cal-day__num">{d}</span>
          {d === day && <span className="cal-day__ring" aria-hidden="true" />}
        </div>
      );
    }
    return cells;
  };

  return (
    <section
      ref={sectionRef}
      id={chapter.id}
      className={`chapter chapter--${chapter.kind} chapter--${chapter.align} chapter--contrast-${chapter.textContrastMode ?? 'dark'} memory-calendar-section`}
      style={{ '--weight': chapter.weight } as React.CSSProperties}
    >
      <div className="chapter__stage">
        <div className="chapter__frame">
          <SectionHeader chapter={chapter} gold />

          <div className="memory-calendar-scene" ref={calendarRef}>
            <div className="wood-table">
              <div className="wood-table__surface" />
              <div className="wood-table__vignette" />
              <div className="wood-table__highlight" />

              <div
                ref={paperRef}
                className={`memory-paper ${isUnfolded ? 'unfolded' : ''} ${isFlipping ? `flipping flipping--${flipDirection}` : ''}`}
              >
                <div className="memory-paper__outer">
                  <div className="memory-paper__front">
                    <div className="calendar">
                      <div className="calendar__header">
                        <span className="calendar__month">{monthName}</span>
                        <span className="calendar__year">{year}</span>
                      </div>
                      <div className="calendar__weekdays">
                        {DAYS_SHORT.map((d) => (
                          <span key={d} className="calendar__weekday">{d}</span>
                        ))}
                      </div>
                      <div className="calendar__grid">
                        {buildCalendarGrid()}
                      </div>
                    </div>
                  </div>
                  <div className="memory-paper__back">
                    <div className="calendar calendar--back">
                      <div className="calendar__header">
                        <span className="calendar__month">{monthName}</span>
                        <span className="calendar__year">{year}</span>
                      </div>
                      <div className="calendar__weekdays">
                        {DAYS_SHORT.map((d) => (
                          <span key={d} className="calendar__weekday">{d}</span>
                        ))}
                      </div>
                      <div className="calendar__grid">
                        {buildCalendarGrid()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="memory-paper__shadow" />

                <div className="handwritten-note">
                  <p className="handwritten-note__text">
                    <span className="handwritten-note__highlight">{currentStage.title}</span>
                    <br />
                    {currentStage.description}
                  </p>
                </div>
              </div>

              <button
                className="memory-nav memory-nav--next"
                onClick={() => goToStage('next')}
                aria-label="Próxima etapa"
                disabled={isFlipping}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button
                className="memory-nav memory-nav--prev"
                onClick={() => goToStage('prev')}
                aria-label="Etapa anterior"
                disabled={isFlipping}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="memory-indicator" aria-live="polite">
                <span className="memory-indicator__current">{currentIndex + 1}</span>
                <span className="memory-indicator__sep">/</span>
                <span className="memory-indicator__total">{memoryStages.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}