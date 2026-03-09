import { Button } from '@compound/button'
import { FolderTree } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface OuCardProps {
  currentOuDn: string
  currentOuDisplay: string
  openMoveOuDialog: () => void
  isPendingMove: boolean
}

export function OuCard({ currentOuDn, currentOuDisplay, openMoveOuDialog, isPendingMove }: OuCardProps) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="size-4" />
          Unidade organizacional
        </CardTitle>
        <CardDescription>
          OU em que o usuário está atualmente. Use &quot;Mover para outra OU&quot; para mudar de
          pasta sem desativar a conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 rounded-md border bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">OU atual</p>
            <p className="font-medium text-sm truncate" title={currentOuDn}>
              {currentOuDisplay || '—'}
            </p>
            {currentOuDn && currentOuDisplay !== currentOuDn && (
              <p className="text-xs text-muted-foreground truncate mt-0.5" title={currentOuDn}>
                {currentOuDn}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openMoveOuDialog}
            loading={isPendingMove}
            leftIcon="arrow-right-left"
            text="Mover para outra OU"
          />
        </div>
      </CardContent>
    </Card>
  )
}
