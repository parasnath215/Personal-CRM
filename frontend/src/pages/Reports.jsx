import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [chartData, setChartData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ amount: '', category: 'Food', note: '', spent_on: new Date().toISOString().split('T')[0], payment_mode: 'Cash' });

  const fetchData = async () => {
    try {
      const [reportsRes, expensesRes] = await Promise.all([
        axios.get('http://localhost:3000/api/reports/expenses'),
        axios.get('http://localhost:3000/api/expenses')
      ]);
      setChartData(reportsRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      console.error('Failed to fetch report data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/expenses', form);
      setForm({ ...form, amount: '', note: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to add expense', error);
      alert('Failed to add expense');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-white">Reports & Expenses</h2>
          <p className="text-slate-400 mt-1">Track your spending and view financial analytics.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Add Expense</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount</label>
                  <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    {['Food', 'Travel', 'Utilities', 'Hotel', 'Marketing', 'Office', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date</label>
                  <input required type="date" value={form.spent_on} onChange={e => setForm({...form, spent_on: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payment Mode</label>
                  <select value={form.payment_mode} onChange={e => setForm({...form, payment_mode: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    {['Cash', 'Credit Card', 'Bank Transfer', 'UPI'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Note (Optional)</label>
                  <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-medium transition-colors">Add Expense</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700 h-[400px] flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">Expenses by Category</h3>
              {loading ? <p className="text-slate-400">Loading chart...</p> : chartData.length === 0 ? <p className="text-slate-400 text-center my-auto">No expenses recorded yet.</p> : (
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Recent Expenses</h3>
              {expenses.length === 0 ? <p className="text-slate-400 text-sm">No expenses found.</p> : (
                <ul className="divide-y divide-slate-700/50">
                  {expenses.slice(0, 5).map(exp => (
                    <li key={exp.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">{exp.category} <span className="text-slate-400 text-xs font-normal ml-2">{new Date(exp.spent_on).toLocaleDateString()}</span></p>
                        {exp.note && <p className="text-xs text-slate-400 mt-0.5">{exp.note}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-400">-${exp.amount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{exp.payment_mode}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
