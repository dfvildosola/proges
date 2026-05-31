"use client";

import Link from "next/link";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { DeleteTenantButton } from "./delete-tenant-button";

// Forma serializable que llega del server.
export type TenantRow = {
  id: string;
  nombre: string;
  rut: string;
  email: string | null;
  telefono: string | null;
  contratos: number;
};

const columnLabels: Record<string, string> = {
  nombre: "Nombre",
  rut: "RUT",
  email: "Email",
  telefono: "Teléfono",
  contratos: "Contratos",
};

function sortHeader(title: string) {
  const Header = ({ column }: HeaderContext<TenantRow, unknown>) => (
    <DataTableColumnHeader column={column} title={title} />
  );
  Header.displayName = `SortHeader(${title})`;
  return Header;
}

const columns: ColumnDef<TenantRow>[] = [
  {
    accessorKey: "nombre",
    header: sortHeader("Nombre"),
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  {
    accessorKey: "rut",
    header: sortHeader("RUT"),
  },
  {
    accessorKey: "email",
    header: sortHeader("Email"),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
    ),
  },
  {
    accessorKey: "telefono",
    header: sortHeader("Teléfono"),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.telefono ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "contratos",
    header: sortHeader("Contratos"),
    cell: ({ row }) =>
      row.original.contratos > 0 ? (
        <Badge variant="secondary">{row.original.contratos}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "acciones",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Editar ${row.original.nombre}`}
          render={<Link href={`/contactos/${row.original.id}/editar`} />}
        >
          <Pencil className="size-4" />
        </Button>
        <DeleteTenantButton id={row.original.id} nombre={row.original.nombre} />
      </div>
    ),
  },
];

export function ContactsTable({ data }: { data: TenantRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      initialSorting={[{ id: "nombre", desc: false }]}
      toolbar={(table) => {
        const filtered = Boolean(table.getState().globalFilter);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar nombre, RUT o email…"
              value={table.getState().globalFilter ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="h-8 w-full max-w-xs"
            />
            {filtered && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => table.setGlobalFilter("")}
              >
                Limpiar
                <X className="size-4" />
              </Button>
            )}
            <div className="ml-auto">
              <DataTableViewOptions table={table} labels={columnLabels} />
            </div>
          </div>
        );
      }}
    />
  );
}
