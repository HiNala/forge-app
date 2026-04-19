import React from 'react';

export default function PublicPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="max-w-xl w-full">
         <h1 className="text-3xl font-bold mb-8 text-center">Hello from your custom page</h1>
         <div className="bg-slate-50 p-8 rounded-xl shadow-sm border">
            Waiting for configuration...
         </div>
      </div>
    </div>
  );
}
