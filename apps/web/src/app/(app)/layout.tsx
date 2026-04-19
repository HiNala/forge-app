import React from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 bg-white border-r">
        <nav className="p-4 flex flex-col gap-2">
          <div className="font-semibold text-lg pb-4 border-b">Forge Studio</div>
          <a href="#" className="hover:bg-slate-50 p-2 rounded">Pages</a>
          <a href="#" className="hover:bg-slate-50 p-2 rounded">Submissions</a>
          <a href="#" className="hover:bg-slate-50 p-2 rounded">Analytics</a>
          <a href="#" className="hover:bg-slate-50 p-2 rounded">Automations</a>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
