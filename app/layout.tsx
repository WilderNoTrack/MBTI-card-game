import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '人格对战 | MBTI Card Battle',
  description: '用你的真实人格作为武器，与他人展开博弈。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
