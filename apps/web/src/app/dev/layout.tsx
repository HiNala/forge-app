import * as React from "react";

export const dynamic = "force-dynamic";

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-10 md:px-8">
      {children}
    </div>
  );
}
