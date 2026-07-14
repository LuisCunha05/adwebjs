'use client'

import { Button } from '@compound/button'
import { Loader2, Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const searchByOptions = [
  { value: 'sAMAccountName', label: 'Usuário' },
  { value: 'mail', label: 'E-mail' },
  { value: 'employeeNumber', label: 'Matrícula' },
  { value: 'name', label: 'Nome' },
  { value: 'sn', label: 'Sobrenome' },
] as const

interface UsersSearchProps {
  ous: { dn: string; ou?: string; name?: string }[]
  groups: { dn: string; cn?: string; description?: string }[]
}

export function UsersSearch({ ous, groups }: UsersSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(searchParams.get('q') || '')
  const [searchBy, setSearchBy] = useState(searchParams.get('searchBy') || 'sAMAccountName')
  const [ou, setOu] = useState(searchParams.get('ou') || '')
  const [memberOf, setMemberOf] = useState(searchParams.get('memberOf') || '')
  const [disabledOnly, setDisabledOnly] = useState(searchParams.get('disabledOnly') === 'true')

  const [groupsQuery, setGroupsQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    startTransition(() => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (searchBy && searchBy !== 'sAMAccountName') params.set('searchBy', searchBy)
      if (ou) params.set('ou', ou)
      if (memberOf) params.set('memberOf', memberOf)
      if (disabledOnly) params.set('disabledOnly', 'true')

      router.replace(`?${params.toString()}`)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pesquisar</CardTitle>
        <CardDescription>
          Termo de busca e filtros opcionais: OU, grupo ou apenas desativados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="q">Termo</Label>
              <Input
                id="q"
                placeholder="Ex.: joao ou * para todos"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="searchBy" className="mb-2">
                Buscar por
              </Label>
              <Select name="searchBy" value={searchBy} onValueChange={setSearchBy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {searchByOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="select-ou" className="mb-2">
                OU (opcional)
              </Label>
              <Select
                name="select-ou"
                value={ou || '__all__'}
                onValueChange={(v) => setOu(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {ous.map((o) => (
                    <SelectItem key={o.dn} value={o.dn}>
                      {o.ou ?? o.name ?? o.dn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="input-group" className="mb-2">
                Grupo (opcional)
              </Label>
              <div>
                <Select
                  value={memberOf || '__none__'}
                  onValueChange={(v) => setMemberOf(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {groups
                      .filter((g) => {
                        const name = g.cn ?? g.description ?? g.dn ?? ''
                        return name.toLowerCase().includes(groupsQuery.toLowerCase())
                      })
                      .slice(0, 80)
                      .map((g) => {
                        const val = String(g.dn)
                        return (
                          <SelectItem key={val} value={val}>
                            {(g.cn ?? g.description ?? g.dn).slice(0, 30)}
                          </SelectItem>
                        )
                      })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium">
              <input
                type="checkbox"
                checked={disabledOnly}
                onChange={(e) => setDisabledOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
              />
              <span>Apenas desativados</span>
            </label>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Search className="size-4 mr-2" />
              )}
              {isPending ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
