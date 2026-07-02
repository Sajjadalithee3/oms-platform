"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  exportable?: boolean
  exportFilename?: string
  pageSize?: number
  onRowClick?: (row: T) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  idKey?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  exportable = true,
  exportFilename = "export",
  pageSize: defaultPageSize = 10,
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  idKey = "id",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const filtered = useMemo(() => {
    if (!search) return data
    const lower = search.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key]
        return val != null && String(val).toLowerCase().includes(lower)
      })
    )
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? ""
      const bVal = b[sortKey] ?? ""
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(0)
  }

  function exportCSV() {
    const header = columns.map((c) => c.label).join(",")
    const rows = sorted.map((row) =>
      columns
        .map((col) => {
          const val = row[col.key]
          const str = val == null ? "" : String(val)
          return str.includes(",") ? `"${str}"` : str
        })
        .join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${exportFilename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        {searchable && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="pl-9"
            />
          </div>
        )}
        {exportable && (
          <Button variant="outline" onClick={exportCSV} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {selectable && selectedIds && selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-md px-4 py-2">
          <span className="text-sm text-primary font-medium">{selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <div className="flex gap-2">
            {selectedIds.size < sorted.length && (
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  if (!onSelectionChange) return
                  const all = new Set<string>()
                  sorted.forEach((row) => all.add(row[idKey] as string))
                  onSelectionChange(all)
                }}
              >
                Select all {sorted.length}
              </button>
            )}
            <button
              type="button"
              className="text-sm text-gray-500 hover:underline"
              onClick={() => onSelectionChange?.(new Set())}
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      <div className="rounded-md border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={paged.length > 0 && paged.every((row) => selectedIds?.has(row[idKey] as string))}
                    ref={(el) => {
                      if (el) {
                        const allSelected = paged.length > 0 && paged.every((row) => selectedIds?.has(row[idKey] as string))
                        const someSelected = paged.some((row) => selectedIds?.has(row[idKey] as string))
                        el.indeterminate = someSelected && !allSelected
                      }
                    }}
                    onChange={(e) => {
                      if (!onSelectionChange) return
                      const next = new Set(selectedIds)
                      if (e.target.checked) {
                        paged.forEach((row) => next.add(row[idKey] as string))
                      } else {
                        paged.forEach((row) => next.delete(row[idKey] as string))
                      }
                      onSelectionChange(next)
                    }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-medium text-gray-600"
                >
                  {col.sortable !== false ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No data found
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b last:border-0 ${
                    selectable && selectedIds?.has(row[idKey] as string) ? "bg-primary/5" : ""
                  } ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedIds?.has(row[idKey] as string) || false}
                        onChange={(e) => {
                          if (!onSelectionChange) return
                          const next = new Set(selectedIds)
                          if (e.target.checked) next.add(row[idKey] as string)
                          else next.delete(row[idKey] as string)
                          onSelectionChange(next)
                        }}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(0)
            }}
            className="w-20 h-8"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span>
            {sorted.length === 0
              ? "0 results"
              : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, sorted.length)} of ${sorted.length}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
