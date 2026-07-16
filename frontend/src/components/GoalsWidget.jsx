import { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, TrendingUp, Plus } from 'lucide-react';

export default function GoalsWidget() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/goals');
      setGoals(res.data);
    } catch (error) {
      console.error('Error fetching goals', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  if (loading) return <div className="text-slate-400">Loading goals...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4">
        {goals.length === 0 ? (
          <div className="text-center text-slate-500 py-4">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No long-term goals set.</p>
          </div>
        ) : (
          goals.map(goal => {
            const achieved = goal.progress.reduce((sum, p) => sum + p.amount_achieved, 0);
            const percentage = Math.min(100, Math.round((achieved / goal.target_amount) * 100));
            const remainingMonths = Math.max(0, Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)));

            return (
              <div key={goal.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-white">{goal.title}</h4>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{goal.category}</span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>${achieved.toLocaleString()}</span>
                    <span>${goal.target_amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-400 items-center">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {percentage}% achieved</span>
                  <span>{remainingMonths} months left</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
