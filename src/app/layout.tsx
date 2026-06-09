import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'JKRLZ Personal XO — Command Center',
  description: 'Private founder command center for JKRLZ LLC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0d1117', color: '#e6edf3' }}>
        <Sidebar />
        <main
          style={{
            marginLeft: '240px',
            minHeight: '100vh',
            backgroundColor: '#0d1117',
            padding: '0',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
