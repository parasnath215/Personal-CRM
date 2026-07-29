import { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import CalendarWidget from '../components/CalendarWidget';
import TasksWidget from '../components/TasksWidget';
import GoalsWidget from '../components/GoalsWidget';
import { 
  CheckCircle2, Clock, Calendar, ArrowUpRight, AlertCircle, Sparkles 
} from 'lucide-react';

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Daily statistics state
  const [stats, setStats] = useState({
    pendingToday: 0,
    completedToday: 0,
    carriedForward: 0,
    allTasksCount: 0
  });

  const fetchDailyStats = async () => {
    try {
      const todayIso = new Date().toISOString();
      const resToday = await api.get(`/api/tasks?date=${todayIso}`);
      const todayTasks = resToday.data || [];

      const resAll = await api.get('/api/tasks/all');
      const allTasks = resAll.data || [];

      const pendingToday = todayTasks.filter(t => t.status === 'pending').length;
      const completedToday = todayTasks.filter(t => t.status === 'done').length;
      const carriedForward = allTasks.filter(t => t.status === 'carried_forward').length;

      setStats({
        pendingToday,
        completedToday,
        carriedForward,
        allTasksCount: allTasks.length
      });
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  useEffect(() => {
    fetchDailyStats();
  }, [refreshTrigger]);

  const handleTasksUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchDailyStats();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Dashboard Overview <Sparkles className="w-6 h-6 text-amber-400" />
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Organize everyday tasks, track schedules, and reach long-term goals.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2 flex items-center gap-3 text-xs font-semibold text-slate-300 shadow-md">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Daily Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Today</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.pendingToday}</p>
            <p className="text-xs text-slate-500 mt-1">Tasks left to complete today</p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Today</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.completedToday}</p>
            <p className="text-xs text-slate-500 mt-1">Tasks accomplished today</p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Carried Forward</span>
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.carriedForward}</p>
            <p className="text-xs text-slate-500 mt-1">Rescheduled tasks</p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Scheduled</span>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.allTasksCount}</p>
            <p className="text-xs text-slate-500 mt-1">Across all dates</p>
          </div>
        </div>

        {/* Main Dashboard Grid: Interactive Calendar & Date Task View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-5 h-[520px]">
            <CalendarWidget 
              selectedDate={selectedDate} 
              onSelectDate={setSelectedDate}
              refreshTrigger={refreshTrigger}
            />
          </div>

          <div className="lg:col-span-7 h-[520px]">
            <TasksWidget 
              selectedDate={selectedDate} 
              onTasksUpdated={handleTasksUpdated}
            />
          </div>
        </div>

        {/* Bottom Section: Goals Overview */}
        <div className="bg-slate-800/80 rounded-xl p-6 shadow-md border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Long-Term Goals & Milestones</h3>
          <GoalsWidget />
        </div>
      </main>
    </div>
  );
}
