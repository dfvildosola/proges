"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/nav";

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // "/" solo activo exacto; el resto activo si la ruta empieza con el href.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Barra superior solo en móvil */}
      <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
        <span className="text-lg font-semibold">Proges</span>
        <button onClick={() => setOpen(true)} aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
      </header>

      {/* Sidebar fija en escritorio */}
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r p-4 md:flex">
        <span className="px-3 text-lg font-semibold">Proges</span>
        {nav}
      </aside>

      {/* Drawer en móvil */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col gap-6 border-r bg-background p-4">
            <div className="flex items-center justify-between px-3">
              <span className="text-lg font-semibold">Proges</span>
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú">
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
