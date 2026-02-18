'use client'

import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface PaginationProps {
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export function Pagination({ total, page, pageSize, totalPages }: PaginationProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const createPageURL = (pageNumber: number | string, newPageSize?: number) => {
        const params = new URLSearchParams(searchParams)
        params.set('page', pageNumber.toString())
        if (newPageSize) {
            params.set('pageSize', newPageSize.toString())
            params.set('page', '1') // Reset to page 1 when changing page size
        }
        return `${pathname}?${params.toString()}`
    }

    const navigate = (url: string) => {
        router.push(url)
    }

    return (
        <div className="flex items-center justify-between px-2">
            <div className="hidden flex-1 text-sm text-muted-foreground sm:block">
                Exibindo {Math.min((page - 1) * pageSize + 1, total)} a{' '}
                {Math.min(page * pageSize, total)} de {total} resultados
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Linhas por página</p>
                    <Select
                        value={`${pageSize}`}
                        onValueChange={(value) => {
                            navigate(createPageURL(1, Number(value)))
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((size) => (
                                <SelectItem key={size} value={`${size}`}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Página {page} de {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => navigate(createPageURL(1))}
                        disabled={page === 1}
                    >
                        <span className="sr-only">Primeira página</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate(createPageURL(page - 1))}
                        disabled={page === 1}
                    >
                        <span className="sr-only">Página anterior</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => navigate(createPageURL(page + 1))}
                        disabled={page === totalPages}
                    >
                        <span className="sr-only">Próxima página</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => navigate(createPageURL(totalPages))}
                        disabled={page === totalPages}
                    >
                        <span className="sr-only">Última página</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
