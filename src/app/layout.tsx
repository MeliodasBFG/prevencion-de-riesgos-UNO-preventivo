import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UNO Preventivo: Riesgo Cero | Juego Multijugador PRL (ISO 7010)',
  description:
    'Juego de cartas multijugador online y entrenamiento con IA adaptado a la Prevención de Riesgos Laborales (PRL) y normativa de señalización ISO 7010.',
  keywords: [
    'PRL',
    'Prevención de Riesgos Laborales',
    'ISO 7010',
    'ISO 45001',
    'Juego de cartas',
    'UNO Preventivo',
    'Seguridad en el trabajo',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#080B10',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased bg-[#080B10] text-slate-100 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
