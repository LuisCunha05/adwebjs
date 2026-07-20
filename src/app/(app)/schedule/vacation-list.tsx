'use client'

import { Button } from '@compound/button'
import { CalendarX, Download, Loader2, Trash2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
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

interface VacationListProps {
  actions: EnrichedTask[]
  totalCount: number
  currentPage: number
  pageSize: number
}

export function VacationList({ actions, totalCount, currentPage, pageSize }: VacationListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [cancelId, setCancelId] = useState<number | null>(null)

  const paramPerson = searchParams.get('person') || ''
  const paramStart = searchParams.get('startDate') || ''
  const paramEnd = searchParams.get('endDate') || ''

  const [person, setPerson] = useState(paramPerson)
  const [startDate, setStartDate] = useState(paramStart)
  const [endDate, setEndDate] = useState(paramEnd)

  // Sync local inputs if searchParams URL changes externally
  useEffect(() => {
    setPerson(paramPerson)
    setStartDate(paramStart)
    setEndDate(paramEnd)
  }, [paramPerson, paramStart, paramEnd])

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // Reset to first page on new search

    if (person) {
      params.set('person', person)
    } else {
      params.delete('person')
    }

    if (startDate) {
      params.set('startDate', startDate)
    } else {
      params.delete('startDate')
    }

    if (endDate) {
      params.set('endDate', endDate)
    } else {
      params.delete('endDate')
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const handleClearFilters = () => {
    setPerson('')
    setStartDate('')
    setEndDate('')
    const params = new URLSearchParams(searchParams)
    params.delete('person')
    params.delete('startDate')
    params.delete('endDate')
    params.set('page', '1')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    if (paramPerson) params.set('person', paramPerson)
    if (paramStart) params.set('startDate', paramStart)
    if (paramEnd) params.set('endDate', paramEnd)

    window.location.href = `/api/schedule/export?${params.toString()}`
  }

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

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  const goToPage = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const hasActiveFilters = !!(paramPerson || paramStart || paramEnd)

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle>Agendamentos de férias ({totalCount})</CardTitle>
          <CardDescription>
            Visualização e controle individual de desativações e reativações.
          </CardDescription>
        </div>
        {totalCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
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
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 pb-5 border-b mb-5">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label htmlFor="filter-person" className="text-xs font-semibold">
              Pessoa
            </Label>
            <Input
              id="filter-person"
              placeholder="Buscar por usuário ou nome..."
              value={person}
              onChange={(e) => setPerson(e.target.value)}
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending} className="h-9 text-xs">
              Buscar
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                disabled={isPending}
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar filtros
              </Button>
            )}
          </div>
          {isPending && (
            <Loader2 className="size-4 animate-spin text-muted-foreground mb-2.5 ml-auto" />
          )}
        </form>

        {/* Table */}
        {actions.length === 0 ? (
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
          <>
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
                {actions.map((t) => {
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <span className="text-xs text-muted-foreground">
                  Mostrando página {currentPage} de {totalPages} ({totalCount} agendamentos)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!hasPreviousPage || isPending}
                    className="h-8 text-xs"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!hasNextPage || isPending}
                    className="h-8 text-xs"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
