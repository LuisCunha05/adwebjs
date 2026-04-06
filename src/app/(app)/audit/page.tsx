import { Suspense } from 'react'

import { listAuditLogs } from '@/actions/audit'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ACTION_LABELS, AuditFilters } from './audit-filters'
import { Skeleton } from '@/components/ui/skeleton'

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    })
  } catch {
    return iso
  }
}

async function AuditTable(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await props.searchParams
  const filters = {
    action: params.action,
    actor: params.actor,
    target: params.target,
    since: params.since,
    until: params.until,
    limit: 200, // Fixed limit for now
  }

  const res = await listAuditLogs(filters)
  const entries = res.ok && res.data ? res.data : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros</CardTitle>
        <CardDescription>
          {entries.length} evento(s). Ordenado do mais recente ao mais antigo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nenhum registro de auditoria encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Quem</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead className="max-w-[200px]">Detalhes</TableHead>
                  <TableHead>Sucesso</TableHead>
                  <TableHead className="max-w-[180px]">Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {formatDate(e.at)}
                    </TableCell>
                    <TableCell className="font-medium">{actionLabel(e.action)}</TableCell>
                    <TableCell>
                      <span
                        className={e.actor === 'system' ? 'text-muted-foreground italic' : ''}
                      >
                        {e.actor}
                      </span>
                    </TableCell>
                    <TableCell
                      className="font-mono text-sm truncate max-w-[120px]"
                      title={e.target}
                    >
                      {e.target ?? '—'}
                    </TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground max-w-[200px] truncate"
                      title={JSON.stringify(e.details)}
                    >
                      {e.details
                        ? typeof e.details === 'object'
                          ? Object.entries(e.details)
                              .map(([k, v]) => `${k}=${String(v).slice(0, 30)}`)
                              .join(', ')
                          : String(e.details)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {e.success ? (
                        <span className="text-green-600 dark:text-green-400">Sim</span>
                      ) : (
                        <span className="text-destructive">Não</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-destructive text-xs max-w-[180px] truncate"
                      title={e.error}
                    >
                      {e.error ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AuditFiltersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-full max-w-[400px] mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
      </CardContent>
    </Card>
  )
}

function AuditTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  )
}

export default function AuditPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs de auditoria</h1>
        <p className="text-muted-foreground mt-1">
          Histórico de alterações: desativações, férias, grupos e demais ações no AD.
        </p>
      </div>

      <Suspense fallback={<AuditFiltersSkeleton />}>
        <AuditFilters searchParams={props.searchParams} />
      </Suspense>

      <Suspense fallback={<AuditTableSkeleton />}>
        <AuditTable searchParams={props.searchParams} />
      </Suspense>
    </div>
  )
}
