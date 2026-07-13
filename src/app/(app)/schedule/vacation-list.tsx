'use client'

import { Button } from '@compound/button'
import { CalendarX, Download, Loader2, Trash2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { cancelTask } from '@/actions/schedule'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ScheduledTask, ScheduleStatus } from '@/types/schedule'
import type { Vacation } from '@/types/vacation'

interface EnrichedTask extends ScheduledTask {
  userId: string
  displayName: string
}

function StatusBadge({ status }: { status: ScheduleStatus }) {
  switch (status) {
    case ScheduleStatus.PENDING:
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 border-amber-200/50"
        >
          Pendente
        </Badge>
      )
    case ScheduleStatus.RUNNING:
      return (
        <Badge
          variant="default"
          className="bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200 border-blue-200/50"
        >
          Executando
        </Badge>
      )
    case ScheduleStatus.COMPLETED:
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 border-emerald-200/50"
        >
          Concluído
        </Badge>
      )
    case ScheduleStatus.FAILED:
      return <Badge variant="destructive">Falhou</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function downloadTasksCsv(tasks: EnrichedTask[]) {
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
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agendamentos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface VacationListProps {
  actions: ScheduledTask[]
  vacations: Vacation[]
  users: { cn?: string; displayName?: string; sAMAccountName: string }[]
}

export function VacationList({ actions, vacations, users }: VacationListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [cancelId, setCancelId] = useState<number | null>(null)

  const filterPerson = searchParams.get('person') || ''
  const filterStart = searchParams.get('startDate') || ''
  const filterEnd = searchParams.get('endDate') || ''

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('person')
    params.delete('startDate')
    params.delete('endDate')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  // Enrich tasks
  const enrichedTasks: EnrichedTask[] = actions.map((task) => {
    const vacation =
      task.relatedTable === 'vacations' ? vacations.find((v) => v.id === task.relatedId) : undefined
    const userId = vacation?.userId || ''
    const user = users.find((u) => u.sAMAccountName === userId)
    const displayName = user ? user.displayName || user.cn || userId : userId

    return {
      ...task,
      userId,
      displayName,
    }
  })

  // Filter tasks
  const filteredTasks = enrichedTasks.filter((task) => {
    if (filterPerson) {
      const query = filterPerson.toLowerCase()
      const matchSam = task.userId.toLowerCase().includes(query)
      const matchDisplay = task.displayName.toLowerCase().includes(query)
      if (!matchSam && !matchDisplay) return false
    }

    if (filterStart) {
      const runDate = new Date(task.runAt).toISOString().split('T')[0]
      if (runDate < filterStart) return false
    }

    if (filterEnd) {
      const runDate = new Date(task.runAt).toISOString().split('T')[0]
      if (runDate > filterEnd) return false
    }

    return true
  })

  async function handleCancelTask(taskId: number) {
    if (cancelId) return

    setCancelId(taskId)
    try {
      const res = await cancelTask(taskId)
      if (!res.ok) {
        throw new Error(res.error.message)
      }
      toast.success('Agendamento de férias cancelado.')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar.')
    } finally {
      setCancelId(null)
    }
  }

  const hasActiveFilters = !!(filterPerson || filterStart || filterEnd)

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle>Agendamentos de férias ({filteredTasks.length})</CardTitle>
          <CardDescription>
            Visualização e controle individual de desativações e reativações.
          </CardDescription>
        </div>
        {filteredTasks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTasksCsv(filteredTasks)}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            <Download className="size-4 mr-2" />
            Exportar (CSV)
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 pb-5 border-b mb-5">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label htmlFor="filter-person" className="text-xs font-semibold">
              Pessoa
            </Label>
            <Input
              id="filter-person"
              placeholder="Buscar por usuário ou nome..."
              value={filterPerson}
              onChange={(e) => updateFilters('person', e.target.value)}
              className="h-9"
            />
          </div>
          <div className="w-full sm:w-auto space-y-1.5">
            <Label htmlFor="filter-start" className="text-xs font-semibold">
              Data Inicial
            </Label>
            <Input
              id="filter-start"
              type="date"
              value={filterStart}
              onChange={(e) => updateFilters('startDate', e.target.value)}
              className="h-9"
            />
          </div>
          <div className="w-full sm:w-auto space-y-1.5">
            <Label htmlFor="filter-end" className="text-xs font-semibold">
              Data Final
            </Label>
            <Input
              id="filter-end"
              type="date"
              value={filterEnd}
              onChange={(e) => updateFilters('endDate', e.target.value)}
              className="h-9"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              disabled={isPending}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar filtros
            </Button>
          )}
          {isPending && (
            <Loader2 className="size-4 animate-spin text-muted-foreground mb-2.5 ml-auto" />
          )}
        </div>

        {/* Table */}
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarX className="size-10 text-muted-foreground mb-3 stroke-[1.5]" />
            <p className="text-muted-foreground text-sm font-medium">
              Nenhum agendamento encontrado.
            </p>
            {hasActiveFilters && (
              <p className="text-muted-foreground/75 text-xs mt-1">
                Tente ajustar ou limpar os filtros para ver outros agendamentos.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((t) => {
                const cancelling = cancelId === t.id
                const isPendingTask = t.status === ScheduleStatus.PENDING

                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{t.id}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-foreground">{t.userId || '-'}</div>
                      {t.displayName && t.displayName !== t.userId && (
                        <div className="text-xs text-muted-foreground">{t.displayName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {t.type === 'VACATION_START' ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Início (Desativação)
                          </span>
                        ) : t.type === 'VACATION_END' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Fim (Reativação)
                          </span>
                        ) : (
                          t.type
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.runAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {isPendingTask && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 border-destructive/20"
                          onClick={() => handleCancelTask(t.id)}
                          disabled={cancelling || !!cancelId}
                        >
                          {cancelling ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
