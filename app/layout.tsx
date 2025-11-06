import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jekyll Post Editor',
  description: 'Editor để tạo và publish posts cho Jekyll blog',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

