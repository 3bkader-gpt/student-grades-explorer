import type { StudentGrade } from '../types/grade'

const MIN_GRADE = 0
const MAX_GRADE = 18

function clampGrade(grade: number): number {
  return Math.min(MAX_GRADE, Math.max(MIN_GRADE, grade))
}

export async function loadGrades(): Promise<StudentGrade[]> {
  const response = await fetch('/grades.json')
  if (!response.ok) {
    throw new Error('Failed to load grades.json')
  }

  const raw = (await response.json()) as Array<{
    number: number | string
    name: string
    grade: number | string
  }>

  const seen = new Set<number>()
  const normalized: StudentGrade[] = []

  for (const row of raw) {
    const number = Number(row.number)
    const grade = clampGrade(Number(row.grade))
    const name = String(row.name ?? '').trim()

    if (!Number.isFinite(number) || !name || !Number.isFinite(grade)) continue
    if (seen.has(number)) continue

    seen.add(number)
    normalized.push({ number, name, grade })
  }

  return normalized.sort((a, b) => a.number - b.number)
}
