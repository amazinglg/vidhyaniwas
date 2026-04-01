import { useMemo, useState } from 'react';
import { Users, IndianRupee, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '@/components/dashboard/StatCard';
import { mockResidents, mockCollections, mockExpenses } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const CHART_COLORS = ['hsl(30, 85%, 52%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(210, 92%, 45%)', 'hsl(45, 93%, 47%)'];

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState('2024');

  const totalCollected = useMemo(
    () => mockCollections.filter((c) => c.year === Number(selectedYear)).reduce((s, c) => s + c.amount, 0),
    [selectedYear]
  );
  const totalDue = useMemo(
    () => mockCollections.filter((c) => c.year === Number(selectedYear)).reduce((s, c) => s + c.dueAmount, 0),
    [selectedYear]
  );
  const totalExpenses = useMemo(
    () => mockExpenses.filter((e) => e.date.startsWith(selectedYear)).reduce((s, e) => s + e.amount, 0),
    [selectedYear]
  );

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      const income = mockCollections.filter((c) => c.year === Number(selectedYear) && c.paidDate?.startsWith(`${selectedYear}-${mStr}`)).reduce((s, c) => s + c.amount, 0);
      const expense = mockExpenses.filter((e) => e.date.startsWith(`${selectedYear}-${mStr}`)).reduce((s, e) => s + e.amount, 0);
      return { month: m, income, expense };
    });
  }, [selectedYear]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    mockExpenses
      .filter((e) => e.date.startsWith(selectedYear))
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value }));
  }, [selectedYear]);

  const paidCount = mockCollections.filter((c) => c.year === Number(selectedYear) && c.status === 'paid').length;
  const overdueCount = mockCollections.filter((c) => c.year === Number(selectedYear) && (c.status === 'overdue' || c.status === 'pending')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Financial overview of Shri Vidhya Niwas</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Residents" value={String(mockResidents.length)} subtitle={`${mockResidents.filter((r) => r.isActive).length} active`} icon={Users} variant="primary" />
        <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString('en-IN')}`} subtitle={`${paidCount} payments received`} icon={TrendingUp} variant="success" />
        <StatCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString('en-IN')}`} icon={TrendingDown} variant="destructive" />
        <StatCard title="Pending Dues" value={`₹${totalDue.toLocaleString('en-IN')}`} subtitle={`${overdueCount} residents pending`} icon={AlertTriangle} variant="warning" />
      </div>

      {/* Balance summary */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <div>
            <p className="text-sm text-muted-foreground">Net Balance ({selectedYear})</p>
            <p className="text-2xl font-bold font-display text-foreground">
              ₹{(totalCollected - totalExpenses).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-lg font-semibold font-display mb-4">Monthly Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 20%, 88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
              <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold font-display mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={expenseByCategory} cx="50%" cy="45%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {expenseByCategory.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
