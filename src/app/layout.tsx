import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
  OrganizationSwitcher,
} from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Button } from "@/components/ui/button";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proges — Gestión de patrimonio inmobiliario",
  description:
    "Administra propiedades, contratos de arriendo, documentos y control económico en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <header className="flex h-14 items-center justify-between border-b px-6">
            <span className="text-lg font-semibold text-primary">Proges</span>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Iniciar sesión
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Crear cuenta</Button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <OrganizationSwitcher hidePersonal />
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
