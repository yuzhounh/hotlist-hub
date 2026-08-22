import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '热榜汇｜此刻，人们在关心什么',
  description: '聚合正在上升的公共话题，合并相同事件，直观呈现跨平台热度变化。',
  openGraph: {
    title: '热榜汇｜此刻，人们在关心什么',
    description: '聚合正在上升的公共话题，合并相同事件，直观呈现跨平台热度变化。',
    images: [{ url: '/og.png', width: 1732, height: 909, alt: '热榜汇｜此刻，人们在关心什么' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '热榜汇｜此刻，人们在关心什么',
    description: '聚合正在上升的公共话题，合并相同事件，直观呈现跨平台热度变化。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
