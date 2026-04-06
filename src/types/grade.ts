export interface StudentGrade {
  number: number
  name: string
  grade: number
}

export type SortMode =
  | 'grade-desc'
  | 'grade-asc'
  | 'name-asc'
  | 'name-desc'
  | 'number-asc'
  | 'number-desc'

export type ViewMode = 'cards' | 'table'
