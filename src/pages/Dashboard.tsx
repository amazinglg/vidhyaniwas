import { useMemo, useState } from 'react';
import { Users, IndianRupee, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '@/components/dashboard/StatCard';
import { useResidents, useMaintenanceCollections, useExpenses } from '@/hooks/useSocietyData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const CHART_COLORS = ['hsl(30, 85%, 52%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(210, 92%, 45%)', 'hsl(45, 93%, 47%)'];

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState('2025');
  const { data: residents = [] } = useResidents();
  const { data: collections = [] } = useMaintenanceCollections();
  const { data: expenses = [] } = useExpenses();

  const yearCollections = useMemo(() => collections.filter((c) => c.year === Number(selectedYear)), [collections, selectedYear]);
  const yearExpenses = useMemo(() => expenses.filter((e) => e.date?.startsWith(selectedYear)), [expenses, selectedYear]);

  const totalCollected = yearCollections.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalDue = yearCollections.reduce((s, c) => s + Number(c.due_amount || 0), 0);
  const totalExpenses = yearExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const paidCount = yearCollections.filter((c) => c.status === 'paid').length;
  const overdueCount = yearCollections.filter((c) => c.status === 'overdue' || c.status === 'pending').length;

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      const income = yearCollections.filter((c) => c.paid_date?.startsWith(`${selectedYear}-${mStr}`)).reduce((s, c) => s + Number(c.amount || 0), 0);
      const expense = yearExpenses.filter((e) => e.date?.startsWith(`${selectedYear}-${mStr}`)).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { month: m, income, expense };
    });
  }, [yearCollections, yearExpenses, selectedYear]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    yearExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value }));
  }, [yearExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Financial overview of Shri Vidhya Niwas</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Residents" value={String(residents.length)} subtitle={`${residents.filter((r) => r.is_active).length} active`} icon={Users} variant="primary" />
        <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString('en-IN')}`} subtitle={`${paidCount} payments received`} icon={TrendingUp} variant="success" />
        <StatCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString('en-IN')}`} icon={TrendingDown} variant="destructive" />
        <StatCard title="Pending Dues" value={`₹${totalDue.toLocaleString('en-IN')}`} subtitle={`${overdueCount} residents pending`} icon={AlertTriangle} variant="warning" />
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <div>
            <p className="text-sm text-muted-foreground">Net Balance ({selectedYear})</p>
            <p className="text-2xl font-bold font-display text-foreground">₹{(totalCollected - totalExpenses).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </Card>

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
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="45%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {expenseByCategory.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                </Pie>
                <Legend />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-20">No expenses recorded yet</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
