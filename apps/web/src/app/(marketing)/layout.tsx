import React from 'react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-4 border-b bg-white">Marketing Header</header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="p-4 border-t text-center text-sm text-gray-500">Marketing Footer</footer>
    </div>
  );
}
