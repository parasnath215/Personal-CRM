import Sidebar from '../components/Sidebar';

export default function PlaceholderPage({ title }) {
  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <p className="text-slate-400 mt-1">This module is currently under development.</p>
        </header>
        
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 border-dashed p-12 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p className="text-lg font-medium">Coming Soon</p>
            <p className="text-sm mt-2">The {title.toLowerCase()} features will be available in an upcoming update.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
