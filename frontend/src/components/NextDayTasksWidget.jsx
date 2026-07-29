import { useState, useEffect } from 'react';
import api from '../api';
import { 
  CalendarDays, CheckCircle2, Clock, Plus, ArrowRight, XCircle, Sparkles 
} from 'lucide-react';

export default function NextDayTasksWidget({ onTasksUpdated }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Calculate tomorrow's local date string YYYY-MM-DD
  const getTomorrowStr = () => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`;
  };

  const tomorrowStr = getTomorrowStr();
  const tomorrowFormatted = new Date(Date.now() + 86400000).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const fetchTomorrowTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/tasks?date=${tomorrowStr}`);
      setTasks(res.data || []);
    } catch (err) {
      console.error('Failed to fetch tomorrow tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTomorrowTasks();
  }, []);

  const handleCreateTomorrowTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.post('/api/tasks', {
        title: newTitle.trim(),
        event_date: tomorrowStr
      });
      setNewTitle('');
      setShowAddForm(false);
      fetchTomorrowTasks();
      if (onTasksUpdated) onTasksUpdated();
    } catch (err) {
      console.error('Error creating task for tomorrow:', err);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      await api.patch(`/api/tasks/${id}/status`, { status: nextStatus });
      fetchTomorrowTasks();
      if (onTasksUpdated) onTasksUpdated();
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  return (
    <div className="bg-slate-800/90 rounded-2xl p-6 shadow-md border border-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Tomorrow's Scheduled Tasks <Sparkles className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-xs text-slate-400">Preview and prepare for tomorrow ({tomorrowFormatted})</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Task for Tomorrow
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleCreateTomorrowTask} className="mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-3">
          <div className="flex gap-2">
            <input
              required
              type="text"
              placeholder="Task title for tomorrow..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading tomorrow's schedule...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-slate-700/40">
          <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-slate-400">No tasks scheduled for tomorrow yet.</p>
          <p className="text-xs text-slate-500 mt-1">Get ahead by planning tomorrow's key items today!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map((task) => {
            const isDone = task.status === 'done';

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-400'
                    : 'bg-slate-900/60 border-slate-700/70 text-slate-200 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className={`text-sm font-semibold leading-snug ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                      {task.title}
                    </h4>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => handleToggleStatus(task.id, task.status)}
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      isDone ? 'text-slate-400 hover:text-white' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isDone ? 'Mark Pending' : 'Mark Done'}
                  </button>

                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Tomorrow
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
