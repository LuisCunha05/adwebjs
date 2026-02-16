export interface Vacation {
  id: number
  userId: string
  startDate: string
  endDate: string
  description?: string
  createdAt: string
}

export interface IVacationRepository {
  add(vacation: Omit<Vacation, 'id' | 'createdAt'>): number
  get(id: number): Vacation | undefined
  remove(id: number): void
}
