import { useState, useEffect } from 'react';
import api from '../api';
import { 
  CheckCircle2, XCircle, Clock, CalendarDays, Plus, 
  Trash2, Edit3, X, Save, ArrowRight
} from 'lucide-react';

export default function TasksWidget({ selectedDate, onTasksUpdated }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [showDescField, setShowDescField] = useState(false);

  // Modal / Carry forward & Editing states
  const [editingTask, setEditingTask] = useState(null);
  const [carryForwardTask, setCarryForwardTask] = useState(null);
  const [customCarryDate, setCustomCarryDate] = useState('');

  const getLocalDateStr = (d) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const dateParam = getLocalDateStr(selectedDate) || getLocalDateStr(new Date());
  const targetDate = selectedDate ? new Date(selectedDate) : new Date();
  const formattedDateStr = targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/tasks?date=${dateParam}`);
      setTasks(res.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  const notifyUpdate = () => {
    fetchTasks();
    if (onTasksUpdated) onTasksUpdated();
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await api.post('/api/tasks', {
        title: newTaskTitle,
        description: newTaskDesc,
        event_date: dateParam
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setShowDescField(false);
      notifyUpdate();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateStatus = async (id, status, carried_forward_to = null) => {
    try {
      await api.patch(`/api/tasks/${id}/status`, {
        status,
        carried_forward_to
      });
      notifyUpdate();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleExecuteCarryForward = async () => {
    if (!carryForwardTask) return;
    const target = customCarryDate ? new Date(customCarryDate) : new Date(Date.now() + 86400000);
    await handleUpdateStatus(carryForwardTask.id, 'carried_forward', target.toISOString());
    setCarryForwardTask(null);
    setCustomCarryDate('');
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
      notifyUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      notifyUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
        <div>
          <h3 className="text-lg font-bold text-white leading-tight flex items-center gap-2">
            Tasks for {formattedDateStr}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {tasks.length === 0 
              ? 'No tasks scheduled' 
              : `${completedCount} completed, ${pendingCount} pending`}
          </p>
        </div>

        {tasks.length > 0 && (
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {Math.round((completedCount / tasks.length) * 100)}% done
            </span>
          </div>
        )}
      </div>

      {/* Task Input Form */}
      <form onSubmit={handleCreateTask} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder={`Add a task for ${formattedDateStr}...`} 
            className="flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button 
            type="button"
            onClick={() => setShowDescField(!showDescField)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showDescField ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Details"
          >
            {showDescField ? 'Hide Notes' : '+ Notes'}
          </button>
          <button 
            type="submit" 
            disabled={!newTaskTitle.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors flex items-center gap-1 shadow-md shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {showDescField && (
          <textarea
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder="Add optional notes, links, or instructions..."
            rows={2}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        )}
      </form>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-slate-500 py-12 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 mb-3 text-slate-600/50 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-400">No tasks for this date</p>
            <p className="text-xs text-slate-500 mt-1">Type above to schedule new work.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={`border rounded-xl p-3.5 transition-all ${
                task.status === 'done' 
                  ? 'bg-slate-900/40 border-slate-800 opacity-75' 
                  : task.status === 'cancelled'
                  ? 'bg-slate-900/40 border-slate-800 opacity-60'
                  : 'bg-slate-700/40 border-slate-600/60 hover:border-slate-500'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleUpdateStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                    className={`mt-0.5 transition-colors ${
                      task.status === 'done' 
                        ? 'text-emerald-400' 
                        : 'text-slate-500 hover:text-emerald-400'
                    }`}
                    title={task.status === 'done' ? 'Mark Pending' : 'Mark Completed'}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm leading-snug break-words ${
                      task.status === 'done' 
                        ? 'line-through text-slate-400' 
                        : task.status === 'cancelled'
                        ? 'line-through text-slate-500'
                        : 'text-white'
                    }`}>
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-[11px] font-medium">
                      <span className={`px-2 py-0.5 rounded-full capitalize ${
                        task.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                        task.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300' :
                        task.status === 'carried_forward' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>

                      {task.carried_forward_to && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Forwarded to {new Date(task.carried_forward_to).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingTask({ ...task })}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    title="Edit Task"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Action Buttons for Pending Tasks */}
              {task.status === 'pending' && (
                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-700/50">
                  <button 
                    onClick={() => handleUpdateStatus(task.id, 'done')}
                    className="flex items-center gap-1 text-xs bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1 rounded-md transition-colors border border-emerald-500/30 font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </button>

                  <button 
                    onClick={() => {
                      setCarryForwardTask(task);
                      const tmrw = new Date(targetDate);
                      tmrw.setDate(tmrw.getDate() + 1);
                      setCustomCarryDate(tmrw.toISOString().split('T')[0]);
                    }}
                    className="flex items-center gap-1 text-xs bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white px-2.5 py-1 rounded-md transition-colors border border-amber-500/30 font-medium"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Carry Forward
                  </button>

                  <button 
                    onClick={() => handleUpdateStatus(task.id, 'cancelled')}
                    className="flex items-center gap-1 text-xs bg-slate-700/80 hover:bg-rose-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-md transition-colors font-medium ml-auto"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit Task</h3>
              <button 
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white p-1"
              >
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
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description / Notes</label>
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
              <button 
                onClick={() => setCarryForwardTask(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 mb-4">
              Select the future date you want to reschedule <span className="font-semibold text-white">"{carryForwardTask.title}"</span> for:
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
    </div>
  );
}
