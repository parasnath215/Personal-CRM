import { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { 
  Calendar, CheckCircle2, Clock, XCircle, Search, 
  CalendarDays, Trash2, Edit3, Plus, ArrowRight, Filter, X, Save
} from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, done, carried_forward, cancelled
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const getTodayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowStr = () => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`;
  };

  // Modals state
  const [editingTask, setEditingTask] = useState(null);
  const [carryForwardTask, setCarryForwardTask] = useState(null);
  const [customCarryDate, setCustomCarryDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(getTodayStr());

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/tasks/all');
      setTasks(res.data || []);
    } catch (error) {
      console.error('Failed to fetch all tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (id, status, carried_forward_to = null) => {
    try {
      await api.patch(`/api/tasks/${id}/status`, { status, carried_forward_to });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.post('/api/tasks', {
        title: newTitle,
        description: newDesc,
        event_date: newDate || getTodayStr()
      });
      setNewTitle('');
      setNewDesc('');
      setShowCreateModal(false);
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editingTask.title.trim()) return;
    try {
      await api.put(`/api/tasks/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        event_date: editingTask.event_date
      });
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleExecuteCarryForward = async () => {
    if (!carryForwardTask) return;
    const target = customCarryDate || getTomorrowStr();
    await handleUpdateStatus(carryForwardTask.id, 'carried_forward', target);
    setCarryForwardTask(null);
    setCustomCarryDate('');
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Filter tasks based on status, search query, and date filter
  const filteredTasks = tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description && t.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (dateFilter) {
      const taskDate = (t.carried_forward_to || t.event_date).split('T')[0];
      if (taskDate !== dateFilter) return false;
    }

    return true;
  });

  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const carriedCount = tasks.filter(t => t.status === 'carried_forward').length;

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Daily Task Manager</h2>
            <p className="text-slate-400 text-sm mt-1">
              Full overview of all your daily activities, scheduled tasks, and progress logs.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-blue-900/30 flex items-center gap-2 text-sm transition-all"
          >
            <Plus className="w-5 h-5" /> Schedule New Task
          </button>
        </header>

        {/* Task Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Total Tasks</p>
              <p className="text-xl font-bold text-white mt-1">{totalCount}</p>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Pending</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{pendingCount}</p>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Completed</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{doneCount}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Forwarded</p>
              <p className="text-xl font-bold text-purple-400 mt-1">{carriedCount}</p>
            </div>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/80 overflow-x-auto">
            {['all', 'pending', 'done', 'carried_forward', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Search & Date Filter Inputs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded-lg text-slate-300 transition-colors"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Task List Table / Container */}
        {loading ? (
          <div className="text-center text-slate-400 py-16">Loading task repository...</div>
        ) : (
          <div className="bg-slate-800 rounded-xl shadow-md border border-slate-700 overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle2 className="w-14 h-14 mb-3 text-slate-600 opacity-40 stroke-[1.5]" />
                <p className="text-lg font-semibold text-slate-300">No matching tasks found</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/60">
                {filteredTasks.map(task => {
                  const displayDate = task.carried_forward_to || task.event_date;
                  return (
                    <div 
                      key={task.id} 
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-700/30 transition-colors ${
                        task.status === 'done' ? 'bg-slate-900/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => handleUpdateStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                          className={`mt-0.5 transition-colors ${
                            task.status === 'done' ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>

                        <div>
                          <h4 className={`font-semibold text-base ${
                            task.status === 'done' ? 'line-through text-slate-500' :
                            task.status === 'cancelled' ? 'line-through text-slate-500' : 'text-white'
                          }`}>
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                            <span className={`px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                              task.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              task.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              task.status === 'carried_forward' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>

                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-blue-400" />
                              {new Date(displayDate).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </span>

                            {task.carried_forward_to && (
                              <span className="text-amber-400/90 font-medium flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Rescheduled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {task.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'done')}
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-emerald-500/30 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </button>

                            <button
                              onClick={() => {
                                setCarryForwardTask(task);
                                setCustomCarryDate(getTomorrowStr());
                              }}
                              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-amber-500/30 flex items-center gap-1"
                            >
                              <CalendarDays className="w-3.5 h-3.5" /> Carry Forward
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setEditingTask({ ...task })}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit Task"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Schedule Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Schedule New Task</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Call client regarding proposal"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Notes / Description</label>
                  <textarea
                    rows={3}
                    placeholder="Additional instructions or notes..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Schedule Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Edit Task</h3>
                <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Title</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                  <textarea
                    value={editingTask.description || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={editingTask.event_date ? new Date(editingTask.event_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, event_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Carry Forward Date Modal */}
        {carryForwardTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Carry Forward Task</h3>
                <button onClick={() => setCarryForwardTask(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-300 mb-4">
                Select the future date to reschedule <span className="font-semibold text-white">"{carryForwardTask.title}"</span>:
              </p>

              <input
                type="date"
                value={customCarryDate}
                onChange={(e) => setCustomCarryDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 mb-6"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCarryForwardTask(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteCarryForward}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  <CalendarDays className="w-4 h-4" /> Reschedule Task
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
