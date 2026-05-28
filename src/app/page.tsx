import { Show, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Propiedades",
    description:
      "Ficha de cada inmueble con ROL, ubicación, estado, copropiedad y etiquetas.",
  },
  {
    title: "Contratos de arriendo",
    description: "Montos en UF o pesos, reajustes, plazos y estados.",
  },
  {
    title: "Control económico",
    description:
      "Ingresos, gastos, rentabilidad por propiedad y vista de cartera.",
  },
  {
    title: "Alertas y autocontrol",
    description:
      "Avisos de contratos por vencer, arriendos atrasados e inconsistencias.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-20">
      <section className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Gestiona tu patrimonio inmobiliario en un solo lugar
        </h1>
        <p className="text-lg text-muted-foreground">
          Proges centraliza propiedades, contratos, documentos y control
          económico, con alertas automáticas que cuidan tu cartera.
        </p>
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <Button size="lg">Comenzar</Button>
          </SignUpButton>
        </Show>
      </section>

      <section className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
