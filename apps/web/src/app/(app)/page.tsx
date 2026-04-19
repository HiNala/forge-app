import React from 'react';

export default function AppPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4">
         <div className="bg-white p-4 rounded shadow border">
            <h3 className="font-semibold text-gray-600">Total Pages</h3>
            <p className="text-3xl font-bold">12</p>
         </div>
         <div className="bg-white p-4 rounded shadow border">
            <h3 className="font-semibold text-gray-600">Submissions (30d)</h3>
            <p className="text-3xl font-bold">48</p>
         </div>
      </div>
    </div>
  );
}
