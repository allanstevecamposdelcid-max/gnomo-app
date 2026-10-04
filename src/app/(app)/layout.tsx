import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Shell from "@/components/Shell";

export const metadata = {
  title: "El Gnomo",
  description: "Sistema de gestión e-commerce",
};

// Usa toda la pantalla en celulares con notch (las barras respetan el área segura)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
