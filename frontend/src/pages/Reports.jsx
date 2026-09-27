import { useState, useEffect, useRef } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import * as XLSX from 'xlsx';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Wallet, Plus, Trash2, Tag, 
  Filter, Calendar, DollarSign, Check, X, ArrowUpRight, 
  ArrowDownRight, Layers, FileText, Printer, Eye, ChevronRight, Download
} from 'lucide-react';

const INCOME_COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#047857', '#15803d', '#22c55e', '#a7f3d0'];
const EXPENDITURE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#06b6d4', '#84cc16'];

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('monthly_statement'); // 'monthly_statement', 'entry_and_charts', 'all_transactions'
  const [financials, setFinancials] = useState({
    totalIncome: 0,
    totalExpenditure: 0,
    netBalance: 0,
    incomeByCategory: [],
    expenditureByCategory: []
  });

  const [monthlyStatements, setMonthlyStatements] = useState([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState('');
  const [selectedMonthDetail, setSelectedMonthDetail] = useState(null);
  const detailsRef = useRef(null);

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({ income: [], expenditure: [] });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });

  // Form State for Adding Transaction
  const [form, setForm] = useState({
    type: 'expenditure',
    amount: '',
    category: 'Home grocery & Gifts',
    note: '',
    spent_on: getTodayStr(),
    payment_mode: 'Cash'
  });

  // Modal State for Adding Custom Category
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expenditure' });
  const [categoryMessage, setCategoryMessage] = useState({ type: '', text: '' });

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [financialsRes, monthlyRes, transactionsRes, categoriesRes] = await Promise.all([
        api.get('/api/reports/financials'),
        api.get('/api/reports/monthly-statement'),
        api.get('/api/expenses?type=all'),
        api.get('/api/expenses/categories')
      ]);

      setFinancials(financialsRes.data);
      const months = monthlyRes.data.months || [];
      setMonthlyStatements(months);

      // Auto-select latest month if available
      if (months.length > 0) {
        setSelectedMonthKey(prev => prev || months[0].monthKey);
      }

      setTransactions(transactionsRes.data);
      setCategories(categoriesRes.data);

      // Default selected category when changing type
      const currentCatList = form.type === 'income' ? categoriesRes.data.income : categoriesRes.data.expenditure;
      if (currentCatList && currentCatList.length > 0) {
        setForm(prev => ({
          ...prev,
          category: prev.category && currentCatList.some(c => c.name === prev.category) 
            ? prev.category 
            : currentCatList[0].name
        }));
      }
    } catch (error) {
      console.error('Failed to fetch financial reports', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch or filter details for selected month
  useEffect(() => {
    if (!selectedMonthKey) {
      setSelectedMonthDetail(null);
      return;
    }

    const monthSummary = monthlyStatements.find(m => m.monthKey === selectedMonthKey);
    if (!monthSummary) return;

    // Filter transactions for this month
    const monthTxs = transactions.filter(t => {
      const d = new Date(t.spent_on);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonthKey;
    });

    setSelectedMonthDetail({
      ...monthSummary,
      transactions: monthTxs
    });
  }, [selectedMonthKey, monthlyStatements, transactions]);

  // Update default category when switching form type (Income vs Expenditure)
  const handleTypeChange = (newType) => {
    const list = newType === 'income' ? categories.income : categories.expenditure;
    const defaultCat = list && list.length > 0 ? list[0].name : (newType === 'income' ? 'Hotel income' : 'Home grocery & Gifts');
    setForm({
      ...form,
      type: newType,
      category: defaultCat
    });
  };

  // Submit New Income or Expenditure Transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await api.post('/api/expenses', form);
      setForm(prev => ({ ...prev, amount: '', note: '', spent_on: getTodayStr() }));
      fetchData();
    } catch (error) {
      console.error('Failed to add transaction', error);
      alert('Failed to save transaction');
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete transaction', error);
      alert('Failed to delete transaction');
    }
  };

  // Create New Custom Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setCategoryMessage({ type: '', text: '' });

    if (!newCategory.name.trim()) {
      setCategoryMessage({ type: 'error', text: 'Category name is required' });
      return;
    }

    try {
      await api.post('/api/expenses/categories', newCategory);
      setCategoryMessage({ type: 'success', text: `Category "${newCategory.name}" added successfully!` });
      setNewCategory({ name: '', type: newCategory.type });
      fetchData();
      setTimeout(() => setCategoryMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to add category', error);
      const errMsg = error.response?.data?.error || 'Failed to add custom category';
      setCategoryMessage({ type: 'error', text: errMsg });
    }
  };

  // Delete Custom Category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom category?')) return;
    try {
      await api.delete(`/api/expenses/categories/${id}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete category');
    }
  };

  // Filter transactions based on selection and search
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || (t.type || 'expenditure') === filterType;
    const matchesSearch = searchQuery === '' || 
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.payment_mode && t.payment_mode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const availableCategories = form.type === 'income' ? categories.income : categories.expenditure;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  useEffect(() => {
    if (selectedMonthDetail && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMonthDetail]);

  const handlePrintStatement = () => {
    setShowExportModal(true);
  };

  const handleExportExcel = () => {
    if (!exportDateRange.start || !exportDateRange.end) {
      alert('Please select both start and end dates');
      return;
    }
    const start = new Date(exportDateRange.start);
    const end = new Date(exportDateRange.end);
    end.setHours(23, 59, 59, 999);
    
    const toExport = transactions.filter(t => {
      const d = new Date(t.spent_on);
      return d >= start && d <= end;
    });

    if (toExport.length === 0) {
      alert('No transactions found in this date range');
      return;
    }

    const wsData = toExport.map(t => ({
      Date: new Date(t.spent_on).toLocaleDateString('en-IN'),
      Type: (t.type || 'expenditure') === 'income' ? 'Income' : 'Expenditure',
      Category: t.category,
      Amount: t.amount,
      'Payment Mode': t.payment_mode || 'Cash',
      Remarks: t.note || ''
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `Financial_Statement_${exportDateRange.start}_to_${exportDateRange.end}.xlsx`);
    setShowExportModal(false);
  };

  const handleExportMonthly = () => {
    if (!selectedMonthDetail || !selectedMonthDetail.transactions) return;
    const wsData = selectedMonthDetail.transactions.map(t => ({
      Date: new Date(t.spent_on).toLocaleDateString('en-IN'),
      Type: (t.type || 'expenditure') === 'income' ? 'Income' : 'Expenditure',
      Category: t.category,
      Amount: t.amount,
      'Payment Mode': t.payment_mode || 'Cash',
      Remarks: t.note || ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Statement");
    XLSX.writeFile(wb, `Monthly_Statement_${selectedMonthDetail.label}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex text-slate-200">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Wallet className="text-blue-500 w-8 h-8" />
              Income & Expenditure
            </h2>
            <p className="text-slate-400 mt-1">Monthly statements, category breakdowns, and financial ledger logs.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Categories
            </button>
          </div>
        </header>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Income Card */}
          <div className="bg-slate-800/80 rounded-2xl p-6 border border-emerald-500/20 shadow-lg relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -right-4 -bottom-4 bg-emerald-500/10 w-24 h-24 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Total Income
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-white">
                ₹{financials.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Across {financials.incomeByCategory.length} income categories
              </p>
            </div>
          </div>

          {/* Total Expenditure Card */}
          <div className="bg-slate-800/80 rounded-2xl p-6 border border-rose-500/20 shadow-lg relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -right-4 -bottom-4 bg-rose-500/10 w-24 h-24 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Total Expenditure
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-white">
                ₹{financials.totalExpenditure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> Across {financials.expenditureByCategory.length} expenditure categories
              </p>
            </div>
          </div>

          {/* Net Cash Flow Card */}
          <div className={`bg-slate-800/80 rounded-2xl p-6 border shadow-lg relative overflow-hidden backdrop-blur-sm ${
            financials.netBalance >= 0 ? 'border-blue-500/20' : 'border-amber-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${
                financials.netBalance >= 0 
                  ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}>
                Net Savings / Balance
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                financials.netBalance >= 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-3xl font-extrabold ${financials.netBalance >= 0 ? 'text-white' : 'text-amber-400'}`}>
                ₹{financials.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {financials.netBalance >= 0 ? 'Surplus cash flow' : 'Expenditure exceeds income'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-2xl border border-slate-700 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('monthly_statement')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'monthly_statement'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-4 h-4" /> Monthly Statement Table
          </button>

          <button
            onClick={() => setActiveTab('entry_and_charts')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'entry_and_charts'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Plus className="w-4 h-4" /> Record Entry & Charts
          </button>

          <button
            onClick={() => setActiveTab('all_transactions')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'all_transactions'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-4 h-4" /> All Transactions History ({transactions.length})
          </button>
        </div>

        {/* TAB 1: MONTHLY STATEMENT FOR INCOME & EXPENDITURE TABLE */}
        {activeTab === 'monthly_statement' && (
          <div className="space-y-8">
            
            {/* Month-by-Month Statement Summary Table */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Monthly Financial Statements Summary Table
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Month-wise breakdown of total income, total expenditure, and net balance.
                  </p>
                </div>
              </div>

              {monthlyStatements.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No monthly statement records found. Record your first transaction to generate monthly reports.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase font-semibold">
                        <th className="py-3 px-4">Statement Month</th>
                        <th className="py-3 px-4">Total Income</th>
                        <th className="py-3 px-4">Total Expenditure</th>
                        <th className="py-3 px-4">Net Balance / Savings</th>
                        <th className="py-3 px-4">Savings Rate</th>
                        <th className="py-3 px-4">Entries</th>
                        <th className="py-3 px-4 text-right">View Statement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {monthlyStatements.map(m => {
                        const isSurplus = m.netBalance >= 0;
                        const isSelected = selectedMonthKey === m.monthKey;

                        return (
                          <tr 
                            key={m.monthKey} 
                            onClick={() => setSelectedMonthKey(m.monthKey)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-600/15 border-l-4 border-l-blue-500' : 'hover:bg-slate-700/40'
                            }`}
                          >
                            <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                <span>{m.label}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-bold text-emerald-400 whitespace-nowrap">
                              +₹{m.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-4 font-bold text-rose-400 whitespace-nowrap">
                              -₹{m.totalExpenditure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 font-extrabold ${
                                isSurplus ? 'text-emerald-300' : 'text-amber-400'
                              }`}>
                                {isSurplus ? '+' : ''}₹{m.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-300 text-xs">
                              <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${
                                isSurplus 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {m.savingsRate}%
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-400 text-xs whitespace-nowrap">
                              {m.transactionCount} transactions
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMonthKey(m.monthKey);
                                }}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 ml-auto ${
                                  isSelected 
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:text-white hover:bg-slate-600'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" /> Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selected Month Detailed Statement Card & Ledger Table */}
            {selectedMonthDetail && (
              <div ref={detailsRef} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6">
                
                {/* Statement Top Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                        Monthly Statement
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mt-2">
                      Statement of Accounts — {selectedMonthDetail.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Showing all income items, expenditure charges, and balance summary for {selectedMonthDetail.label}.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportMonthly}
                      className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-emerald-400 hover:text-emerald-300 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-600 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Export Monthly
                    </button>
                    <button
                      onClick={handlePrintStatement}
                      className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold border border-slate-600 transition-colors shadow-sm"
                    >
                      <Printer className="w-4 h-4 text-blue-400" /> Print Statement
                    </button>
                  </div>
                </div>

                {/* Month Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 uppercase font-semibold">Monthly Income</span>
                    <h4 className="text-2xl font-extrabold text-white mt-1">
                      ₹{selectedMonthDetail.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedMonthDetail.incomeCount || 0} income items</p>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-xl border border-rose-500/20">
                    <span className="text-xs text-rose-400 uppercase font-semibold">Monthly Expenditure</span>
                    <h4 className="text-2xl font-extrabold text-white mt-1">
                      ₹{selectedMonthDetail.totalExpenditure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedMonthDetail.expenditureCount || 0} expense items</p>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-xl border border-blue-500/20">
                    <span className="text-xs text-blue-400 uppercase font-semibold">Monthly Net Balance</span>
                    <h4 className={`text-2xl font-extrabold mt-1 ${selectedMonthDetail.netBalance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedMonthDetail.netBalance >= 0 ? '+' : ''}₹{selectedMonthDetail.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Savings rate: {selectedMonthDetail.savingsRate}%</p>
                  </div>
                </div>

                {/* Category Summaries for the Month */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Income by category */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
                    <h5 className="text-xs font-bold text-emerald-400 uppercase mb-3 flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4" /> Income Streams ({selectedMonthDetail.label})
                    </h5>
                    {selectedMonthDetail.incomeByCategory?.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No income logged in this month.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedMonthDetail.incomeByCategory.map((c, i) => (
                          <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-800">
                            <span className="text-slate-300 font-medium">{c.name}</span>
                            <span className="text-emerald-400 font-bold">₹{c.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expenditure by category */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
                    <h5 className="text-xs font-bold text-rose-400 uppercase mb-3 flex items-center gap-1.5">
                      <ArrowDownRight className="w-4 h-4" /> Expenditures ({selectedMonthDetail.label})
                    </h5>
                    {selectedMonthDetail.expenditureByCategory?.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No expenditure logged in this month.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedMonthDetail.expenditureByCategory.map((c, i) => (
                          <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-slate-800">
                            <span className="text-slate-300 font-medium">{c.name}</span>
                            <span className="text-rose-400 font-bold">₹{c.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Itemized Transactions for Selected Month */}
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                    Itemized Statement Ledger ({selectedMonthDetail.transactions?.length || 0} Transactions)
                  </h4>

                  {(!selectedMonthDetail.transactions || selectedMonthDetail.transactions.length === 0) ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No transaction entries found for this month.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-700 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase font-semibold">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Payment Mode</th>
                            <th className="py-2.5 px-3">Remarks / Notes</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {selectedMonthDetail.transactions.map(t => {
                            const isIncome = (t.type || 'expenditure') === 'income';
                            return (
                              <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                                <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                                  {new Date(t.spent_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                    isIncome
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  }`}>
                                    {isIncome ? '+ Income' : '- Expenditure'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                                  {t.category}
                                </td>
                                <td className={`py-2.5 px-3 font-bold whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isIncome ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  {t.payment_mode || 'Cash'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                                  {t.note || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleDeleteTransaction(t.id)}
                                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    title="Delete Entry"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: RECORD ENTRY & CHARTS */}
        {activeTab === 'entry_and_charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            {/* Left Column: Transaction Entry Form */}
            <div className="lg:col-span-5 bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-md">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Record Financial Entry
              </h3>

              {/* Income vs Expenditure Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1.5 rounded-xl mb-5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    form.type === 'income' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Income
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('expenditure')}
                  className={`py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    form.type === 'expenditure' 
                      ? 'bg-rose-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" /> Expenditure
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                {/* Category Dropdown */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase">
                      {form.type === 'income' ? 'Income Stream Type' : 'Expenditure Category'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCategory({ name: '', type: form.type });
                        setShowCategoryModal(true);
                      }}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      + Add New Category
                    </button>
                  </div>
                  <select
                    required
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {availableCategories.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name} {c.is_custom ? '(Custom)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={form.spent_on}
                    onChange={e => setForm({ ...form, spent_on: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Payment Mode</label>
                  <select
                    value={form.payment_mode}
                    onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Note / Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Remarks / Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Room booking #102, Grocery store receipt, etc."
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl text-white font-bold transition-all shadow-md mt-2 ${
                    form.type === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Save {form.type === 'income' ? 'Income' : 'Expenditure'} Entry
                </button>
              </form>
            </div>

            {/* Right Column: Visual Charts Breakdown */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Expenditure Chart */}
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ArrowDownRight className="w-5 h-5 text-rose-400" /> Expenditure Breakdown
                  </span>
                  <span className="text-xs text-slate-400 font-normal">By Category</span>
                </h3>
                {loading ? (
                  <div className="h-[250px] flex items-center justify-center text-slate-400">Loading chart...</div>
                ) : financials.expenditureByCategory.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">No expenditure entries recorded.</div>
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financials.expenditureByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {financials.expenditureByCategory.map((entry, index) => (
                            <Cell key={`exp-${index}`} fill={EXPENDITURE_COLORS[index % EXPENDITURE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']} 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} 
                        />
                        <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Income Chart */}
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-emerald-400" /> Income Stream Breakdown
                  </span>
                  <span className="text-xs text-slate-400 font-normal">By Source</span>
                </h3>
                {loading ? (
                  <div className="h-[250px] flex items-center justify-center text-slate-400">Loading chart...</div>
                ) : financials.incomeByCategory.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">No income entries recorded.</div>
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financials.incomeByCategory} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Income']} 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                        />
                        <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: ALL TRANSACTIONS HISTORY */}
        {activeTab === 'all_transactions' && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">All Financial Transactions Ledger</h3>
                <p className="text-xs text-slate-400 mt-0.5">Filter, search, and manage your complete income & expenditure records.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Type Filter Buttons */}
                <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700 text-xs">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({transactions.length})
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    onClick={() => setFilterType('expenditure')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      filterType === 'expenditure' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Expenditure
                  </button>
                </div>

                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search note or category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full sm:w-48"
                />
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No financial records match your selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase font-semibold">
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(t => {
                      const isIncome = (t.type || 'expenditure') === 'income';
                      return (
                        <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {isIncome ? 'Income' : 'Expenditure'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                            {t.category}
                          </td>
                          <td className={`py-3.5 px-4 font-bold whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 text-xs">
                            {t.payment_mode || 'Cash'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(t.spent_on).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 text-xs max-w-xs truncate">
                            {t.note || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredTransactions.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  Previous
                </button>
                <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-full">
                  {Array.from({ length: Math.ceil(filteredTransactions.length / itemsPerPage) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTransactions.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(filteredTransactions.length / itemsPerPage)}
                  className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal: Custom Category Manager */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-400" />
                Category Manager
              </h3>
              <p className="text-xs text-slate-400 mb-6">Add dynamic custom categories for Income or Expenditure.</p>

              {/* Category Alert Message */}
              {categoryMessage.text && (
                <div className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                  categoryMessage.type === 'success' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {categoryMessage.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {categoryMessage.text}
                </div>
              )}

              {/* Form to Add Category */}
              <form onSubmit={handleAddCategory} className="space-y-4 mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Create New Category</h4>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, type: 'income' })}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                        newCategory.type === 'income' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Income Type
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, type: 'expenditure' })}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                        newCategory.type === 'expenditure' 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Expenditure Type
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Workshop Fees, EV Charging..."
                    value={newCategory.name}
                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  + Add Custom Category
                </button>
              </form>

              {/* List of Custom Categories */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Your Custom Categories</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {[...categories.income, ...categories.expenditure]
                    .filter(c => c.is_custom)
                    .map(c => (
                      <div key={c.id || c.name} className="flex justify-between items-center bg-slate-700/40 px-3 py-2 rounded-xl border border-slate-700 text-xs">
                        <span className="font-medium text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {c.name} ({c.type})
                        </span>
                        {c.id && (
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="text-slate-400 hover:text-rose-400 p-1"
                            title="Delete custom category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  {[...categories.income, ...categories.expenditure].filter(c => c.is_custom).length === 0 && (
                    <p className="text-slate-500 text-xs italic">No custom categories added yet. Predefined default categories are active.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Export Excel Modal */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <button
                onClick={() => setShowExportModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-400" />
                Export Statement
              </h3>
              <p className="text-xs text-slate-400 mb-4">Select date range to export transactions to Excel.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exportDateRange.start}
                    onChange={e => setExportDateRange({ ...exportDateRange, start: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exportDateRange.end}
                    onChange={e => setExportDateRange({ ...exportDateRange, end: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleExportExcel}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md"
              >
                Download Excel Sheet
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
