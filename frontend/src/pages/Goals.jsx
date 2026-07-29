import { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import { Target, TrendingUp, Plus, Calendar, DollarSign, Award, X, Save } from 'lucide-react';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_amount: '', target_date: '', category: 'Personal' });
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Progress Logging modal state
  const [logProgressGoal, setLogProgressGoal] = useState(null);
  const [progressForm, setProgressForm] = useState({ month: '', amount_achieved: '', note: '' });
  const [submittingProgress, setSubmittingProgress] = useState(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/goals');
      setGoals(res.data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim() || !newGoal.target_amount || !newGoal.target_date) {
      alert('Please fill in title, target amount, and target date.');
      return;
    }

    setSubmittingGoal(true);
    try {
      await api.post('/api/goals', newGoal);
      setNewGoal({ title: '', target_amount: '', target_date: '', category: 'Personal' });
      setShowAddModal(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal.');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleLogProgress = async (e) => {
    e.preventDefault();
    if (!logProgressGoal || !progressForm.month || !progressForm.amount_achieved) {
      alert('Please fill in month and amount achieved.');
      return;
    }

    setSubmittingProgress(true);
    try {
      await api.post(`/api/goals/${logProgressGoal.id}/progress`, progressForm);
      setLogProgressGoal(null);
      setProgressForm({ month: '', amount_achieved: '', note: '' });
      fetchGoals();
    } catch (error) {
      console.error('Error logging goal progress:', error);
      alert('Failed to log progress.');
    } finally {
      setSubmittingProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Long-Term Goals <Target className="w-6 h-6 text-blue-400" />
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Set financial, business, and personal milestones and track your progress over time.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-md shadow-blue-900/30 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Long-Term Goal
          </button>
        </header>

        {/* Goals Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-12 text-center">
            <Target className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-40" />
            <p className="text-slate-300 text-lg font-bold mb-1">No Long-Term Goals Set</p>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Start building your roadmap for success by adding your first financial or personal milestone.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-md"
            >
              <Plus className="w-4 h-4" /> Create First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const achieved = goal.progress?.reduce((sum, p) => sum + p.amount_achieved, 0) || 0;
              const target = goal.target_amount || 1;
              const percentage = Math.min(100, Math.round((achieved / target) * 100));
              const remainingMonths = Math.max(
                0,
                Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30))
              );

              return (
                <div
                  key={goal.id}
                  className="bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-700/80 flex flex-col justify-between hover:border-slate-600 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-md font-medium">
                          {goal.category || 'General'}
                        </span>
                        <h3 className="text-xl font-bold text-white mt-2 leading-snug">{goal.title}</h3>
                      </div>
                      <div className="p-2.5 bg-slate-700/50 text-emerald-400 rounded-xl">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 mb-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                        <span>Achieved: ${achieved.toLocaleString()}</span>
                        <span>Target: ${goal.target_amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-3 p-0.5 border border-slate-700/50">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700/50">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                        <TrendingUp className="w-4 h-4" /> {percentage}% Accomplished
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Target Date: {new Date(goal.target_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Progress Logs */}
                  <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{remainingMonths} month(s) remaining</span>

                    <button
                      onClick={() => {
                        setLogProgressGoal(goal);
                        const now = new Date();
                        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        setProgressForm({ month: currentMonthStr, amount_achieved: '', note: '' });
                      }}
                      className="inline-flex items-center gap-1.5 bg-slate-700/80 hover:bg-slate-700 text-blue-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Progress
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Goal Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" /> Create Long-Term Goal
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Goal Title *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Buy New Office / Save $50k"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Amount ($) *</label>
                    <input
                      required
                      type="number"
                      placeholder="e.g. 50000"
                      value={newGoal.target_amount}
                      onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category</label>
                    <select
                      value={newGoal.category}
                      onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Business">Business</option>
                      <option value="Financial">Financial</option>
                      <option value="Investment">Investment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Date *</label>
                  <input
                    required
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700/60 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingGoal}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 shadow-md shadow-blue-900/30"
                  >
                    {submittingGoal ? 'Saving...' : 'Save Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Log Progress Modal */}
        {logProgressGoal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5 border-b border-slate-700/60 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" /> Log Progress: {logProgressGoal.title}
                </h3>
                <button
                  onClick={() => setLogProgressGoal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogProgress} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Month (YYYY-MM) *</label>
                  <input
                    required
                    type="month"
                    value={progressForm.month}
                    onChange={(e) => setProgressForm({ ...progressForm, month: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Amount Achieved ($) *</label>
                  <input
                    required
                    type="number"
                    placeholder="e.g. 2500"
                    value={progressForm.amount_achieved}
                    onChange={(e) => setProgressForm({ ...progressForm, amount_achieved: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Savings allocation"
                    value={progressForm.note}
                    onChange={(e) => setProgressForm({ ...progressForm, note: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700/60 mt-6">
                  <button
                    type="button"
                    onClick={() => setLogProgressGoal(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProgress}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 shadow-md shadow-emerald-900/30"
                  >
                    {submittingProgress ? 'Saving...' : 'Save Progress'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
