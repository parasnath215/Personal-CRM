import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { Calendar, CheckCircle, Clock, XCircle, Search } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, done, cancelled

  const fetchTasks = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/tasks/all');
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch all tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.patch(`http://localhost:3000/api/tasks/${id}/status`, { status });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">All Tasks</h2>
            <p className="text-slate-400 mt-1">Full view of your past, present, and future tasks.</p>
          </div>
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            {['all', 'pending', 'done', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <p className="text-slate-400">Loading tasks...</p>
        ) : (
          <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm mt-1">Try changing your filters.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {filteredTasks.map(task => (
                  <li key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                    <div className="flex flex-col">
                      <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          task.status === 'done' ? 'bg-green-500/10 text-green-400' :
                          task.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                          task.status === 'carried_forward' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {task.status}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(task.event_date).toLocaleDateString()}
                        </span>
                        {task.carried_forward_to && (
                          <span className="text-yellow-400/80">
                            → Forwarded to {new Date(task.carried_forward_to).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {task.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateStatus(task.id, 'done')}
                          className="p-2 bg-slate-700 hover:bg-green-600 rounded-lg text-slate-300 hover:text-white transition-colors"
                          title="Mark Done"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(task.id, 'cancelled')}
                          className="p-2 bg-slate-700 hover:bg-red-600 rounded-lg text-slate-300 hover:text-white transition-colors"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
