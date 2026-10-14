import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from '../components/Sidebar';
import CalendarWidget from '../components/CalendarWidget';
import TasksWidget from '../components/TasksWidget';
import NextDayTasksWidget from '../components/NextDayTasksWidget';
import { 
  CheckCircle2, Clock, Calendar, ArrowUpRight, Sparkles, ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Daily statistics state
  const [stats, setStats] = useState({
    pendingToday: 0,
    completedToday: 0,
    carriedForward: 0,
    allTasksCount: 0
  });

  const getTodayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const fetchDailyStats = async () => {
    try {
      const todayStr = getTodayStr();
      const [resToday, resAll] = await Promise.all([
        api.get(`/api/tasks?date=${todayStr}`),
        api.get('/api/tasks/all')
      ]);
      const todayTasks = resToday.data || [];
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
    document.title = 'Personal CRM - Dashboard';
    fetchDailyStats();
  }, [refreshTrigger]);

  const handleTasksUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
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
              Organize everyday tasks, preview tomorrow's schedule, and track performance.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2 flex items-center gap-3 text-xs font-semibold text-slate-300 shadow-md">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </header>

        {/* Daily Metric Cards (Clickable buttons linking to Tasks page) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            type="button"
            onClick={() => navigate(`/tasks?status=pending&date=${getTodayStr()}`)}
            className="text-left bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-amber-500/50 hover:bg-slate-800 transition-all hover:scale-[1.01] cursor-pointer group"
            title="Click to view today's pending tasks on task page"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                Pending Today
              </span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.pendingToday}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">Tasks left to complete today</p>
              <span className="text-[11px] text-amber-400 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/tasks?status=done&date=${getTodayStr()}`)}
            className="text-left bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-emerald-500/50 hover:bg-slate-800 transition-all hover:scale-[1.01] cursor-pointer group"
            title="Click to view today's completed tasks on task page"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                Completed Today
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.completedToday}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">Tasks accomplished today</p>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks?status=carried_forward')}
            className="text-left bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-blue-500/50 hover:bg-slate-800 transition-all hover:scale-[1.01] cursor-pointer group"
            title="Click to view carried forward tasks on task page"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                Carried Forward
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.carriedForward}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">Rescheduled tasks</p>
              <span className="text-[11px] text-blue-400 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tasks?status=all')}
            className="text-left bg-slate-800/90 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-purple-500/50 hover:bg-slate-800 transition-all hover:scale-[1.01] cursor-pointer group"
            title="Click to view total scheduled tasks on task page"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-purple-400 transition-colors">
                Total Scheduled
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats.allTasksCount}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-slate-500">Across all dates</p>
              <span className="text-[11px] text-purple-400 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </button>
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

        {/* Bottom Section: Tomorrow's Next Day Tasks */}
        <NextDayTasksWidget onTasksUpdated={handleTasksUpdated} />
      </main>
    </div>
  );
}
