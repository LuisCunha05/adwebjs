'use client'

import { Button } from '@compound/button'
import { CalendarClock, Loader2, UserSearch } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createVacation } from '@/actions/schedule'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActiveDirectoryUser } from '@/schemas/attributesAd'

type UserScheduleDto = Pick<ActiveDirectoryUser, 'cn' | 'displayName' | 'sAMAccountName'>

type ScheduleFormProps = {
  users: UserScheduleDto[]
}

export function ScheduleForm(props: ScheduleFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createVacation, null)
  const [formKey, setFormKey] = useState(0)

  const [userSearch, setUserSearch] = useState('')
  const deferredSearch = useDeferredValue(userSearch)
  const [selectedUser, setSelectedUser] = useState<UserScheduleDto | null>(null)

  const filteredUsers = useMemo(() => {
    if (!deferredSearch) return props.users
    const query = deferredSearch.toLowerCase().trim()
    return props.users.filter((u) => {
      const matchSam = u.sAMAccountName?.toLowerCase().includes(query)
      const matchCn = u.cn?.toLowerCase().includes(query)
      const matchDisplay = u.displayName?.toLowerCase().includes(query)
      return matchSam || matchCn || matchDisplay
    })
  }, [props.users, deferredSearch])

  useEffect(() => {
    if (state?.ok) {
      toast.success('Férias agendadas: conta será desativada na ida e reativada na volta.')
      setSelectedUser(null)
      setUserSearch('')
      setFormKey((prev) => prev + 1)
      router.refresh()
    }
  }, [state, router])

  useEffect(() => {
    if (state && !state.ok && state.state?.userId) {
      const found = props.users.find((u) => u.sAMAccountName === state.state.userId)
      if (found) {
        setSelectedUser(found)
      }
    }
  }, [state, props.users])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" />
          Agendar férias
        </CardTitle>
        <CardDescription>
          Selecione o usuário e as datas. Na data de ida a conta será desativada; na data de volta,
          reativada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state && !state.ok && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/10/30">
            {state.error.message}
          </div>
        )}

        <form key={formKey} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <div className="flex gap-2">
              <input type="hidden" name="userId" value={selectedUser?.sAMAccountName || ''} />
              <Input
                placeholder="Buscar por nome de usuário..."
                value={selectedUser ? (selectedUser.cn ?? selectedUser.sAMAccountName) : userSearch}
                onChange={(e) => {
                  if (selectedUser) {
                    setSelectedUser(null)
                  }
                  setUserSearch(e.target.value)
                }}
              />
              <Button type="button" variant="secondary" disabled>
                <UserSearch className="size-4" />
              </Button>
            </div>
            {filteredUsers.length > 0 && !selectedUser && (
              <ul className="rounded-lg border divide-y max-h-40 overflow-auto">
                {filteredUsers.map((u) => (
                  <li key={u.sAMAccountName}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSelectedUser(u)
                        setUserSearch('')
                      }}
                    >
                      {u.sAMAccountName}
                      {u.cn || u.displayName ? ` — ${u.cn || u.displayName}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {filteredUsers.length === 0 && !selectedUser && (
              <div className="rounded-lg border border-muted p-3 text-sm text-muted-foreground text-center">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de ida (desativa)</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={state?.state?.startDate || ''}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de volta (reativa)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={state?.state?.endDate || ''}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={!selectedUser || isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Agendar férias'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
