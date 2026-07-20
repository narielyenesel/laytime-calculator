// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'Laytime Ledger',
  description: 'Cálculo de laytime para dry bulk — auditable, línea por línea.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
