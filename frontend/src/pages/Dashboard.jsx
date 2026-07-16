import Sidebar from '../components/Sidebar';
import TasksWidget from '../components/TasksWidget';
import GoalsWidget from '../components/GoalsWidget';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-white">Overview</h2>
          <p className="text-slate-400 mt-1">Welcome back. Here is your summary for today.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700 h-[500px]">
            <h3 className="text-lg font-semibold text-white mb-4">Today's Tasks & Reminders</h3>
            <TasksWidget />
          </div>
          
          <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700 h-[500px]">
            <h3 className="text-lg font-semibold text-white mb-4">Long-Term Goals</h3>
            <GoalsWidget />
          </div>
        </div>
      </main>
    </div>
  );
}
