import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Clock, CalendarDays, Plus } from 'lucide-react';

export default function TasksWidget() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/tasks');
      setTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await axios.post('http://localhost:3000/api/tasks', {
        title: newTaskTitle,
        event_date: new Date().toISOString()
      });
      setNewTaskTitle('');
      fetchTasks();
    } catch (error) {
      console.error('Error creating task', error);
    }
  };

  const handleUpdateStatus = async (id, status, carried_forward_to = null) => {
    try {
      await axios.patch(`http://localhost:3000/api/tasks/${id}/status`, {
        status,
        carried_forward_to
      });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  const handleCarryForward = (id) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    handleUpdateStatus(id, 'carried_forward', tomorrow.toISOString());
  };

  if (loading) return <div className="text-slate-400">Loading tasks...</div>;

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleCreateTask} className="mb-4 flex gap-2">
        <input 
          type="text" 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..." 
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-white transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No tasks for today. You're all caught up!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
                    {task.title}
                  </h4>
                  {task.description && <p className="text-sm text-slate-400 mt-1">{task.description}</p>}
                </div>
                
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                  task.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  task.status === 'carried_forward' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {task.status}
                </span>
              </div>

              {task.status === 'pending' && (
                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-600/50">
                  <button 
                    onClick={() => handleUpdateStatus(task.id, 'done')}
                    className="flex items-center gap-1 text-xs bg-slate-600 hover:bg-green-600 text-slate-300 hover:text-white px-2 py-1.5 rounded transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Done
                  </button>
                  <button 
                    onClick={() => handleCarryForward(task.id)}
                    className="flex items-center gap-1 text-xs bg-slate-600 hover:bg-yellow-600 text-slate-300 hover:text-white px-2 py-1.5 rounded transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Carry Forward
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(task.id, 'cancelled')}
                    className="flex items-center gap-1 text-xs bg-slate-600 hover:bg-red-600 text-slate-300 hover:text-white px-2 py-1.5 rounded transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
