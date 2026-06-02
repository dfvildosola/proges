"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

// Selector de dueño: navega a /resumen?owner=ID (o sin parámetro para toda la
// cartera). Al elegir un dueño, la página pondera todo por su % de propiedad.
export function OwnerFilter({
  owners,
  value,
}: {
  owners: { id: string; nombre: string }[];
  value: string | null;
}) {
  const router = useRouter();

  function onChange(next: string | null) {
    if (!next || next === ALL) router.push("/resumen");
    else router.push(`/resumen?owner=${next}`);
  }

  return (
    <Select value={value ?? ALL} onValueChange={onChange}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Toda la cartera</SelectItem>
        {owners.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
