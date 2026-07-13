import {z} from 'zod'

export const CreateVacationSchema = z
  .object({
    userId: z.string().trim().min(1, 'Usuário é obrigatório'),
    startDate: z.string().trim().min(1, 'Data de ida é obrigatória'),
    endDate: z.string().trim().min(1, 'Data de volta é obrigatória'),
  })
  .refine(
    (data) => {
      const start = new Date(`${data.startDate}T00:00:00Z`)
      const end = new Date(`${data.endDate}T23:59:00Z`)
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start
    },
    {
      message: 'Data de volta deve ser após a data de ida.',
      path: ['endDate'],
    },
  )
  .transform((data) => {
    const { endDate, startDate, userId } = data

    return {
      endDate: new Date(`${endDate}T23:59:00Z`).toISOString(),
      startDate: new Date(`${startDate}T00:00:00Z`).toISOString(),
      userId,
    }
  })

export type CreateVacationForm = z.infer<typeof CreateVacationSchema>
