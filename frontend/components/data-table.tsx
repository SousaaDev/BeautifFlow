'use client'

import { useState, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  onAdd?: () => void
  addLabel?: string
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  pageSize?: number
  getRowKey: (item: T) => string
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  onAdd,
  addLabel = 'Adicionar',
  emptyMessage = 'Nenhum item encontrado',
  emptyIcon,
  pageSize = 10,
  getRowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search
  const filteredData = data.filter((item) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return columns.some((col) => {
      const value = (item as Record<string, unknown>)[col.key]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchLower)
      }
      return false
    })
  })

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {searchable && (
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
        )}
        {onAdd && (
          <Button onClick={onAdd} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {filteredData.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
          <p className="text-muted-foreground">{emptyMessage}</p>
          {onAdd && (
            <Button onClick={onAdd} variant="link" className="mt-2">
              {addLabel}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={col.className}>
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => (
                  <TableRow key={getRowKey(item)}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)} de{' '}
                {filteredData.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
