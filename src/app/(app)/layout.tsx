import { AppSidebar } from "@/components/app-sidebar";

// Shell autenticado: barra lateral + contenido. (Clerk envolverá esto en la Fase 1.5.)
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar />
      <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
