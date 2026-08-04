import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: '智创Agent - 科研文献检索与知识服务平台',
  description: '从广覆盖文献发现，到可追溯的需求驱动检索、证据综合与迭代优化',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-white text-[#202124]">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontSize: '13px',
              borderRadius: '12px',
              border: '1px solid #DADCE0',
              background: '#FFFFFF',
              color: '#202124',
            },
          }}
        />
      </body>
    </html>
  );
}