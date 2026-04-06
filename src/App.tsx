import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGrades } from './data/gradesService'
import { useGradesExplorerStore } from './state/useGradesExplorerStore'
import type { SortMode, StudentGrade } from './types/grade'

const EXAM_TOTAL = 18

function isSpecialStudent(student: StudentGrade): boolean {
  return student.number === 136 && student.name.trim() === 'يارا احمد مصطفى' && student.grade === 11
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'grade-desc', label: 'Grade · High first' },
  { value: 'grade-asc', label: 'Grade · Low first' },
  { value: 'name-asc', label: 'Name · A → Z' },
  { value: 'name-desc', label: 'Name · Z → A' },
  { value: 'number-asc', label: 'Code · ascending' },
  { value: 'number-desc', label: 'Code · descending' },
]

function highlight(text: string, query: string): ReactNode {
  if (!query.trim()) return text
  const queryLower = query.toLowerCase()
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matcher = new RegExp(`(${escaped})`, 'ig')
  const parts = text.split(matcher)
  return parts.map((part, index) =>
    part.toLowerCase() === queryLower ? (
      <mark key={`${part}-${index}`} className="rounded bg-[var(--pastel-pink)]/50 px-1 text-[var(--deep-burgundy)]">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  )
}

function App() {
  const [students, setStudents] = useState<StudentGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    let alive = true
    loadGrades()
      .then((data) => {
        if (!alive) return
        setStudents(data)
        window.setTimeout(() => setLoading(false), 900)
      })
      .catch((e: Error) => {
        if (!alive) return
        setError(e.message || 'Unknown error')
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const store = useGradesExplorerStore(students)

  const {
    query,
    setQuery,
    rangeMin,
    setRangeMin,
    rangeMax,
    setRangeMax,
    exactGrade,
    setExactGrade,
    passEnabled,
    setPassEnabled,
    failEnabled,
    setFailEnabled,
    passingGrade,
    setPassingGrade,
    sortMode,
    setSortMode,
    viewMode,
    setViewMode,
    theme,
    setTheme,
    auditLog,
    addAudit,
    distinctGrades,
    filteredAndSorted,
    summary,
    activeFilterCount,
    gradeMin,
    gradeMax,
    clearAllFilters,
    saveCurrentView,
  } = store

  const searchHint = useMemo(() => (query.trim() ? query.trim() : ''), [query])
  const topThree = useMemo(
    () =>
      [...students]
        .sort((a, b) => b.grade - a.grade || a.number - b.number)
        .slice(0, 3),
    [students],
  )

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setQuery('')
      addAudit('Cleared search with Esc')
      return
    }

    if (event.key === 'Enter') {
      const first = rowRefs.current[0]
      first?.focus()
      addAudit('Focused first result')
      return
    }

    const currentIndex = rowRefs.current.findIndex((item) => item === document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = Math.min(
        currentIndex < 0 ? 0 : currentIndex + 1,
        Math.max(0, filteredAndSorted.length - 1),
      )
      rowRefs.current[nextIndex]?.focus()
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prevIndex = Math.max(0, currentIndex - 1)
      rowRefs.current[prevIndex]?.focus()
    }
  }

  const updateRangeMin = (value: number) => {
    const safe = Math.min(Math.max(value, gradeMin), rangeMax)
    setRangeMin(safe)
    addAudit(`Set min grade ${safe}`)
  }

  const updateRangeMax = (value: number) => {
    const safe = Math.max(Math.min(value, gradeMax), rangeMin)
    setRangeMax(safe)
    addAudit(`Set max grade ${safe}`)
  }

  const onSortChange = (value: SortMode) => {
    setSortMode(value)
    addAudit(`Sorted by ${value}`)
  }

  const onTogglePass = () => {
    setPassEnabled(!passEnabled)
    addAudit(`Pass filter ${!passEnabled ? 'enabled' : 'disabled'}`)
  }

  const onToggleFail = () => {
    setFailEnabled(!failEnabled)
    addAudit(`Fail filter ${!failEnabled ? 'enabled' : 'disabled'}`)
  }

  const onSaveView = () => {
    saveCurrentView()
    addAudit('Saved current view to localStorage')
  }

  const gradeSpan = Math.max(gradeMax - gradeMin, 1)
  const rangeFillStart = ((rangeMin - gradeMin) / gradeSpan) * 100
  const rangeFillWidth = ((rangeMax - rangeMin) / gradeSpan) * 100

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--charcoal-gray)]">
      <div className="pointer-events-none fixed inset-0 grain-overlay" />

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-panel relative overflow-hidden rounded-3xl border border-[var(--charcoal-gray)]/15 p-4 shadow-2xl sm:p-6"
        >
          <div className="animated-gradient pointer-events-none absolute inset-0" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-black tracking-tight text-[var(--deep-burgundy)] sm:text-3xl">
                Student Grades Explorer
              </h1>
              <button
                type="button"
                onClick={() => {
                  setTheme(theme === 'light' ? 'dark' : 'light')
                  addAudit(`Theme changed to ${theme === 'light' ? 'dark' : 'light'}`)
                }}
                className="rounded-full border border-[var(--charcoal-gray)]/25 bg-white/50 px-3 py-2 text-xs font-semibold backdrop-blur transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pastel-pink)]"
                aria-label="Toggle dark mode"
              >
                {theme === 'light' ? 'Dark' : 'Light'}
              </button>
            </div>

            <div className="relative">
              <motion.input
                whileFocus={{ scale: 1.01, boxShadow: '0 0 0 4px rgba(244,192,222,.35)' }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                aria-label="Smart search by student name or number"
                placeholder="Search by name or number..."
                className="w-full rounded-2xl border border-[var(--pastel-pink)]/90 bg-white/80 px-4 py-4 text-base font-medium outline-none backdrop-blur placeholder:text-[var(--charcoal-gray)]/55"
              />
            </div>

            <div className="neo-filter-toolbar flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5 sm:gap-3 sm:px-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAdvanced(true)}
                className="neo-filter-chip-btn flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black text-white"
              >
                <span className="text-base" aria-hidden="true">
                  ◈
                </span>
                <span>Advanced Filters</span>
              </motion.button>
              <span className="neo-badge-live inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-[var(--deep-burgundy)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/80" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {activeFilterCount} active
              </span>
              <button
                type="button"
                onClick={() => {
                  clearAllFilters()
                }}
                className="neo-ghost-btn rounded-xl px-3 py-2 text-xs font-extrabold text-[var(--charcoal-gray)]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={onSaveView}
                className="neo-ghost-btn rounded-xl px-3 py-2 text-xs font-extrabold text-[var(--deep-burgundy)]"
              >
                Save view
              </button>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"
        >
          {[
            ['Total', summary.total],
            ['Visible', summary.visible],
            ['Average', summary.avg],
            ['Highest', summary.highest],
            ['Lowest', summary.lowest],
          ].map(([label, value]) => (
            <div key={label} className="glass-card rounded-2xl p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--charcoal-gray)]/70">{label}</p>
              <p className="mt-1 text-lg font-black text-[var(--deep-burgundy)]">{value}</p>
            </div>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black text-[var(--deep-burgundy)]">Honor Board · Top 3</p>
            <p className="text-[11px] font-semibold text-[var(--charcoal-gray)]/70">Based on highest grades</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {topThree.map((student, index) => {
              const rank = index + 1
              const rankClass =
                rank === 1 ? 'honor-gold' : rank === 2 ? 'honor-silver' : 'honor-bronze'
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
              return (
                <motion.article
                  key={student.number}
                  whileHover={{ y: -5, rotateX: -4, rotateY: 4 }}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.08 * rank }}
                  className={`honor-card ${rankClass} rounded-2xl p-4`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl" aria-hidden="true">
                      {medal}
                    </span>
                    <span className="rounded-full bg-black/20 px-2 py-1 text-xs font-black text-white">
                      Rank #{rank}
                    </span>
                  </div>
                  {rank === 1 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.86 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.25 }}
                      className="mt-2 inline-flex w-fit items-center gap-1 rounded-full honor-pulse px-4 py-1.5 text-sm font-extrabold tracking-wide text-[#2b1a00]"
                    >
                      <span className="text-[16px]" aria-hidden="true">
                        👑
                      </span>
                      <span>البابا ☝️☝️</span>
                    </motion.div>
                  ) : null}
                  <p className="mt-3 line-clamp-1 text-base font-black text-white">{student.name}</p>
                  <div className="mt-2 flex items-center justify-between text-white/95">
                    <span className="text-xs font-semibold">Code: {student.number}</span>
                    <motion.span
                      key={`honor-grade-${student.number}-${student.grade}`}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.2 }}
                      className="rounded-full bg-white/20 px-2 py-1 text-sm font-black"
                    >
                      {student.grade}/18
                    </motion.span>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </motion.section>

        <section className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="neo-view-switch shrink-0">
            {(['cards', 'table'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setViewMode(mode)
                  addAudit(mode === 'cards' ? 'Switched to card mode' : 'Switched to table mode')
                }}
                className="neo-view-btn relative"
                data-on={viewMode === mode}
              >
                {viewMode === mode ? (
                  <motion.div
                    layoutId="explorerViewPill"
                    className="absolute inset-0 rounded-[0.9rem] bg-gradient-to-br from-[var(--deep-burgundy)] to-[#5c083f] shadow-[0_6px_18px_rgba(67,2,46,0.35)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-10">{mode === 'cards' ? 'Cards' : 'Table'}</span>
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <p className="neo-field-label mb-2 px-1">Sort results</p>
            <div className="neo-sort-bar grid grid-cols-2 gap-1 sm:grid-cols-3">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-active={sortMode === opt.value}
                  onClick={() => onSortChange(opt.value)}
                  className="neo-sort-btn text-start"
                >
                  {sortMode === opt.value ? (
                    <motion.div
                      layoutId="explorerSortPill"
                      className="absolute inset-0 rounded-[0.85rem] bg-gradient-to-br from-[var(--deep-burgundy)] to-[#6b0d4a] shadow-[0_4px_14px_rgba(67,2,46,0.35)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4">
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-200/60 p-4 text-sm font-semibold text-red-900">{error}</div>
          ) : filteredAndSorted.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="empty-state rounded-2xl border border-dashed border-[var(--charcoal-gray)]/30 p-8 text-center"
            >
              <p className="text-lg font-black text-[var(--deep-burgundy)]">No results found</p>
              <p className="mt-2 text-sm opacity-80">
                Try clearing filters, widening grade range, or searching with fewer characters.
              </p>
            </motion.div>
          ) : (
            <LayoutGroup>
              <AnimatePresence mode="popLayout">
                {viewMode === 'cards' ? (
                  <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAndSorted.map((student, index) => (
                      <motion.button
                        layout
                        ref={(element) => {
                          rowRefs.current[index] = element
                        }}
                        key={student.number}
                        type="button"
                        whileHover={{ rotateX: -4, rotateY: 3, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        className={`group glass-card text-start rounded-2xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pastel-pink)] ${student.grade >= passingGrade + 2 ? 'bg-[var(--pastel-pink)]/25' : ''} ${isSpecialStudent(student) ? 'yara-special-card' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold opacity-70">#{highlight(String(student.number), searchHint)}</span>
                          <motion.span
                            key={`${student.number}-${student.grade}`}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="rounded-full bg-[var(--deep-burgundy)] px-2 py-1 text-xs font-black text-white"
                          >
                            {student.grade}
                          </motion.span>
                        </div>
                        <p className={`mt-3 text-base font-black text-[var(--charcoal-gray)] ${isSpecialStudent(student) ? 'special-name student-name-card' : ''}`}>
                          {highlight(student.name, searchHint)}
                        </p>
                        <span
                          className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-bold ${student.grade >= passingGrade ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                        >
                          {student.grade >= passingGrade ? 'Pass' : 'Fail'}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div layout className="overflow-x-auto rounded-2xl border border-[var(--charcoal-gray)]/20 bg-white/70">
                    <table className="min-w-full text-right">
                      <thead className="bg-[var(--deep-burgundy)] text-white">
                        <tr>
                          <th className="px-4 py-3 text-xs">Code</th>
                          <th className="px-4 py-3 text-xs">Name</th>
                          <th className="px-4 py-3 text-xs">Grade</th>
                          <th className="px-4 py-3 text-xs">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSorted.map((student, index) => (
                          <motion.tr
                            layout
                            key={student.number}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`group border-b border-[var(--charcoal-gray)]/10 ${student.grade >= passingGrade + 2 ? 'bg-[var(--pastel-pink)]/30' : ''} ${isSpecialStudent(student) ? 'yara-special-row' : ''}`}
                          >
                            <td className="px-4 py-3 font-semibold">
                              <button
                                type="button"
                                ref={(element) => {
                                  rowRefs.current[index] = element
                                }}
                                className="rounded px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pastel-pink)]"
                              >
                                {highlight(String(student.number), searchHint)}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-bold">
                              <span className={isSpecialStudent(student) ? 'special-name student-name inline-block' : ''}>
                                {highlight(student.name, searchHint)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-black text-[var(--deep-burgundy)]">
                              {isSpecialStudent(student) ? (
                                <span className="grade-text">{student.grade}</span>
                              ) : (
                                student.grade
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold">
                              {student.grade >= passingGrade ? 'Pass' : 'Fail'}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </LayoutGroup>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-[var(--charcoal-gray)]/20 bg-white/60 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--deep-burgundy)]">Interaction Log</p>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1 text-xs">
            {auditLog.length ? auditLog.map((item, idx) => <p key={`${item}-${idx}`}>• {item}</p>) : <p>No actions yet.</p>}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showAdvanced ? (
          <motion.div
            key="filters-overlay"
            className="fixed inset-0 z-40 flex items-end justify-center p-3 lg:items-stretch lg:justify-end lg:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Close filters"
              className="neo-filter-backdrop absolute inset-0 lg:bg-black/25"
              onClick={() => setShowAdvanced(false)}
            />
            <motion.aside
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="neo-filter-panel relative z-10 w-full max-h-[min(88vh,560px)] overflow-y-auto rounded-3xl p-4 lg:max-h-[calc(100vh-2rem)] lg:w-[400px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="advanced-filters-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-2 border-b border-[var(--charcoal-gray)]/10 pb-3">
                <div>
                  <p className="neo-field-label mb-1">Control panel</p>
                  <h2 id="advanced-filters-title" className="text-lg font-black text-[var(--deep-burgundy)]">
                    Advanced Filters
                  </h2>
                  <p className="mt-1 text-[11px] font-medium text-[var(--charcoal-gray)]/65">
                    Narrow the list — changes apply instantly.
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowAdvanced(false)}
                  className="neo-ghost-btn shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold text-[var(--deep-burgundy)]"
                >
                  Done
                </motion.button>
              </div>

              <div className="space-y-3">
                <div className="neo-field-card">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="neo-field-label">Grade spectrum</span>
                    <span className="rounded-full bg-[var(--pastel-pink)]/40 px-2 py-0.5 text-[11px] font-black text-[var(--deep-burgundy)]">
                      {rangeMin} — {rangeMax}
                    </span>
                  </div>
                  <div dir="ltr" className="relative pb-1">
                    <div className="neo-range-track">
                      <div
                        className="neo-range-fill"
                        style={{
                          insetInlineStart: `${rangeFillStart}%`,
                          width: `${rangeFillWidth}%`,
                        }}
                      />
                    </div>
                    <div className="relative -mt-2 h-10">
                      <input
                        type="range"
                        min={gradeMin}
                        max={gradeMax}
                        value={rangeMin}
                        onChange={(event) => updateRangeMin(Number(event.target.value))}
                        className="neo-range absolute inset-x-0 top-0 h-10 w-full"
                        aria-label="Minimum grade"
                      />
                      <input
                        type="range"
                        min={gradeMin}
                        max={gradeMax}
                        value={rangeMax}
                        onChange={(event) => updateRangeMax(Number(event.target.value))}
                        className="neo-range absolute inset-x-0 top-0 z-10 h-10 w-full"
                        aria-label="Maximum grade"
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--charcoal-gray)]/55">Min</span>
                      <input
                        value={rangeMin}
                        onChange={(event) => updateRangeMin(Number(event.target.value))}
                        type="number"
                        className="neo-num-input w-full px-3 py-2 text-sm"
                        aria-label="Range minimum input"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--charcoal-gray)]/55">Max</span>
                      <input
                        value={rangeMax}
                        onChange={(event) => updateRangeMax(Number(event.target.value))}
                        type="number"
                        className="neo-num-input w-full px-3 py-2 text-sm"
                        aria-label="Range maximum input"
                      />
                    </label>
                  </div>
                </div>

                <div className="neo-field-card">
                  <span className="neo-field-label mb-3 block">Result status</span>
                  <div className="neo-segment">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={onTogglePass}
                      className="neo-segment-btn"
                      data-on={passEnabled}
                      data-tone="pass"
                    >
                      {passEnabled ? <span className="neo-segment-pill" aria-hidden="true" /> : null}
                      <span className="relative z-10">Pass</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={onToggleFail}
                      className="neo-segment-btn"
                      data-on={failEnabled}
                      data-tone="fail"
                    >
                      {failEnabled ? <span className="neo-segment-pill" aria-hidden="true" /> : null}
                      <span className="relative z-10">Fail</span>
                    </motion.button>
                  </div>
                </div>

                <div className="neo-field-card">
                  <span className="neo-field-label mb-3 block">Passing threshold</span>
                  <p className="mb-3 text-[11px] font-medium text-[var(--charcoal-gray)]/65">
                    Out of {EXAM_TOTAL} — used for Pass / Fail badges.
                  </p>
                  <div className="neo-stepper">
                    <button
                      type="button"
                      aria-label="Decrease passing grade"
                      onClick={() => {
                        const value = Math.max(0, passingGrade - 1)
                        setPassingGrade(value)
                        addAudit(`Passing grade set to ${value}`)
                      }}
                    >
                      −
                    </button>
                    <span className="neo-stepper-display" aria-live="polite">
                      {passingGrade}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase passing grade"
                      onClick={() => {
                        const value = Math.min(EXAM_TOTAL, passingGrade + 1)
                        setPassingGrade(value)
                        addAudit(`Passing grade set to ${value}`)
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="neo-field-card">
                  <label className="neo-field-label mb-2 block" htmlFor="exact-grade">
                    Exact grade match
                  </label>
                  <select
                    id="exact-grade"
                    value={exactGrade}
                    onChange={(event) => {
                      setExactGrade(event.target.value)
                      addAudit(`Exact grade filter ${event.target.value}`)
                    }}
                    className="neo-select"
                  >
                    <option value="any">Any grade</option>
                    {distinctGrades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default App
