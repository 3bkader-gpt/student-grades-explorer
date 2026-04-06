import { useEffect, useMemo, useState } from 'react'
import type { SortMode, StudentGrade, ViewMode } from '../types/grade'

const STORAGE_KEY = 'student-grades-explorer-view-v1'
const EXAM_TOTAL = 18
const DEFAULT_PASSING_GRADE = Math.ceil(EXAM_TOTAL / 2)

function normalizeArabic(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<{
      query: string
      rangeMin: number
      rangeMax: number
      exactGrade: string
      passEnabled: boolean
      failEnabled: boolean
      passingGrade: number
      sortMode: SortMode
      viewMode: ViewMode
      theme: 'light' | 'dark'
    }>
  } catch {
    return null
  }
}

export function useGradesExplorerStore(students: StudentGrade[]) {
  const gradeMin = useMemo(
    () => (students.length ? Math.min(...students.map((s) => s.grade)) : 0),
    [students],
  )
  const gradeMax = useMemo(
    () => (students.length ? Math.max(...students.map((s) => s.grade)) : 20),
    [students],
  )

  const saved = loadSavedState()

  const [query, setQuery] = useState(saved?.query ?? '')
  const [rangeMin, setRangeMin] = useState(saved?.rangeMin ?? gradeMin)
  const [rangeMax, setRangeMax] = useState(saved?.rangeMax ?? gradeMax)
  const [exactGrade, setExactGrade] = useState(saved?.exactGrade ?? 'any')
  const [passEnabled, setPassEnabled] = useState(saved?.passEnabled ?? true)
  const [failEnabled, setFailEnabled] = useState(saved?.failEnabled ?? true)
  const [passingGrade, setPassingGrade] = useState(saved?.passingGrade ?? DEFAULT_PASSING_GRADE)
  const [sortMode, setSortMode] = useState<SortMode>(saved?.sortMode ?? 'grade-desc')
  const [viewMode, setViewMode] = useState<ViewMode>(saved?.viewMode ?? 'cards')
  const [theme, setTheme] = useState<'light' | 'dark'>(saved?.theme ?? 'light')
  const [auditLog, setAuditLog] = useState<string[]>([])

  const debouncedQuery = useDebouncedValue(query, 200)

  useEffect(() => {
    if (!students.length) return
    setRangeMin((prev) => Math.max(gradeMin, Math.min(prev, gradeMax)))
    setRangeMax((prev) => Math.max(gradeMin, Math.min(prev, gradeMax)))
  }, [gradeMin, gradeMax, students.length])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        query,
        rangeMin,
        rangeMax,
        exactGrade,
        passEnabled,
        failEnabled,
        passingGrade,
        sortMode,
        viewMode,
        theme,
      }),
    )
  }, [
    query,
    rangeMin,
    rangeMax,
    exactGrade,
    passEnabled,
    failEnabled,
    passingGrade,
    sortMode,
    viewMode,
    theme,
  ])

  const addAudit = (message: string) => {
    const stamp = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    setAuditLog((prev) => [`${message} • ${stamp}`, ...prev].slice(0, 30))
  }

  const distinctGrades = useMemo(
    () => Array.from(new Set(students.map((s) => s.grade))).sort((a, b) => a - b),
    [students],
  )

  const filteredAndSorted = useMemo(() => {
    const q = normalizeArabic(debouncedQuery)
    const isNumericQuery = /^\d+$/.test(q)

    let rows = students.filter((student) => {
      if (!passEnabled && !failEnabled) return false

      if (student.grade < rangeMin || student.grade > rangeMax) return false

      if (exactGrade !== 'any' && student.grade !== Number(exactGrade)) return false

      const passed = student.grade >= passingGrade
      if (!passEnabled && passed) return false
      if (!failEnabled && !passed) return false

      if (!q) return true
      if (isNumericQuery) {
        return String(student.number).includes(q)
      }

      const normalizedName = normalizeArabic(student.name)
      return normalizedName.includes(q) || String(student.number).includes(q)
    })

    rows = [...rows].sort((a, b) => {
      switch (sortMode) {
        case 'grade-asc':
          return a.grade - b.grade || a.number - b.number
        case 'grade-desc':
          return b.grade - a.grade || a.number - b.number
        case 'name-asc':
          return a.name.localeCompare(b.name, 'ar') || a.number - b.number
        case 'name-desc':
          return b.name.localeCompare(a.name, 'ar') || a.number - b.number
        case 'number-desc':
          return b.number - a.number
        case 'number-asc':
        default:
          return a.number - b.number
      }
    })

    return rows
  }, [
    students,
    debouncedQuery,
    rangeMin,
    rangeMax,
    exactGrade,
    passingGrade,
    passEnabled,
    failEnabled,
    sortMode,
  ])

  const summary = useMemo(() => {
    const visible = filteredAndSorted.length
    const total = students.length
    const avg = visible
      ? Number((filteredAndSorted.reduce((acc, s) => acc + s.grade, 0) / visible).toFixed(2))
      : 0
    const highest = visible ? Math.max(...filteredAndSorted.map((s) => s.grade)) : 0
    const lowest = visible ? Math.min(...filteredAndSorted.map((s) => s.grade)) : 0

    return { total, visible, avg, highest, lowest }
  }, [filteredAndSorted, students.length])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (query.trim()) count += 1
    if (rangeMin !== gradeMin || rangeMax !== gradeMax) count += 1
    if (exactGrade !== 'any') count += 1
    if (passingGrade !== DEFAULT_PASSING_GRADE) count += 1
    if (!(passEnabled && failEnabled)) count += 1
    return count
  }, [query, rangeMin, rangeMax, gradeMin, gradeMax, exactGrade, passingGrade, passEnabled, failEnabled])

  const clearAllFilters = () => {
    setQuery('')
    setRangeMin(gradeMin)
    setRangeMax(gradeMax)
    setExactGrade('any')
    setPassEnabled(true)
    setFailEnabled(true)
    setPassingGrade(DEFAULT_PASSING_GRADE)
    setSortMode('grade-desc')
    addAudit('Cleared all filters')
  }

  const saveCurrentView = () => {
    addAudit('Saved current view')
  }

  return {
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
  }
}
