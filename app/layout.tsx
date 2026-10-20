import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SAPF · Control de Asistencia Universitaria",
  description: "Sistema de asistencia multi-facultad con nodos de base de datos distribuidos",
};

// Diseño raíz: barra de navegación global y contenedor principal
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold text-indigo-600">
              SAPF
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-indigo-600">Facultades</Link>
              <Link href="/admin" className="hover:text-indigo-600">Administración</Link>
              <Link href="/admin/nodos" className="hover:text-indigo-600">Estado de nodos</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
