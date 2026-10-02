import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from './providers';
import { ThemeInitScript } from './components/theme-init';
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
  metadataBase: new URL('https://hotlist-hub.vercel.app'),
  title: '热榜汇',
  description: '热榜一屏尽览，聚合微博、知乎、抖音、新闻、科技与开发者平台，打开即看此刻热点。',
  icons: {
    icon: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg`, type: 'image/svg+xml' }],
    shortcut: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg`,
  },
  openGraph: {
    title: '热榜汇',
    description: '热榜一屏尽览，此刻正在发生。',
    images: [{ url: '/og.png', width: 1732, height: 909, alt: '热榜汇' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '热榜汇',
    description: '热榜一屏尽览，此刻正在发生。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
