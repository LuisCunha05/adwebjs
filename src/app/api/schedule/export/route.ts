import { type NextRequest, NextResponse } from 'next/server'
import { listScheduleAllFiltered } from '@/queries/schedule'
import { getSession } from '@/utils/manage-jwt'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const person = searchParams.get('person') || undefined
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  const result = await listScheduleAllFiltered({ person, startDate, endDate })

  if (!result.ok) {
    return new Response(result.error.message, { status: 500 })
  }

  const tasks = result.value

  const lines = [
    'ID,Usuário,Nome,Tipo,Data de Execução,Status',
    ...tasks.map((t) =>
      [
        t.id,
        t.userId,
        t.displayName !== t.userId ? t.displayName : '',
        t.type === 'VACATION_START'
          ? 'Início de Férias'
          : t.type === 'VACATION_END'
            ? 'Fim de Férias'
            : t.type,
        new Date(t.runAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        t.status,
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(','),
    ),
  ]

  // Prepend BOM to ensure UTF-8 is correctly recognized by Excel
  const csvContent = `\uFEFF${lines.join('\r\n')}`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="agendamentos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
