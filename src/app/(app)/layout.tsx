import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getOrgId } from "@/lib/org";
import { getActiveAlertCount } from "@/lib/alerts";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgId = await getOrgId();
  const alertCount = await getActiveAlertCount(orgId);

  return (
    <SidebarProvider>
      <AppSidebar alertCount={alertCount} />
      <SidebarInset>
        <AppHeader />
        <div className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
