import { useMemo, useState } from 'react';
import { Users, IndianRupee, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '@/components/dashboard/StatCard';
import { useResidents, useMaintenanceCollections, useExpenses } from '@/hooks/useSocietyData';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const CHART_COLORS = ['hsl(30, 85%, 52%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(210, 92%, 45%)', 'hsl(45, 93%, 47%)'];

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState('2025');
  const { data: residents = [] } = useResidents();
  const { data: collections = [] } = useMaintenanceCollections();
  const { data: expenses = [] } = useExpenses();
  const { t } = useLanguage();

  const yearCollections = useMemo(() => collections.filter((c: any) => c.year === Number(selectedYear)), [collections, selectedYear]);
  const yearExpenses = useMemo(() => expenses.filter((e: any) => e.date?.startsWith(selectedYear)), [expenses, selectedYear]);

  const totalCollected = yearCollections.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const totalDue = yearCollections.reduce((s: number, c: any) => s + Number(c.due_amount || 0), 0);
  const totalExpensesAmt = yearExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const paidCount = yearCollections.filter((c: any) => c.status === 'paid').length;
  const overdueCount = yearCollections.filter((c: any) => c.status === 'overdue' || c.status === 'pending').length;

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      const income = yearCollections.filter((c: any) => c.paid_date?.startsWith(`${selectedYear}-${mStr}`)).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const expense = yearExpenses.filter((e: any) => e.date?.startsWith(`${selectedYear}-${mStr}`)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      return { month: m, income, expense };
    });
  }, [yearCollections, yearExpenses, selectedYear]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    yearExpenses.forEach((e: any) => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), value }));
  }, [yearExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">{t('financial_overview')}</p>
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
        <StatCard title={t('total_residents')} value={String(residents.length)} subtitle={`${residents.filter((r: any) => r.is_active).length} ${t('active').toLowerCase()}`} icon={Users} variant="primary" />
        <StatCard title={t('total_collected')} value={`₹${totalCollected.toLocaleString('en-IN')}`} subtitle={`${paidCount} ${t('payments_received')}`} icon={TrendingUp} variant="success" />
        <StatCard title={t('total_expenses')} value={`₹${totalExpensesAmt.toLocaleString('en-IN')}`} icon={TrendingDown} variant="destructive" />
        <StatCard title={t('pending_dues')} value={`₹${totalDue.toLocaleString('en-IN')}`} subtitle={`${overdueCount} ${t('residents_pending')}`} icon={AlertTriangle} variant="warning" />
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <div>
            <p className="text-sm text-muted-foreground">{t('net_balance')} ({selectedYear})</p>
            <p className="text-2xl font-bold font-display text-foreground">₹{(totalCollected - totalExpensesAmt).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-lg font-semibold font-display mb-4">{t('monthly_income_vs_expenses')}</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 20%, 88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
              <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name={t('income')} />
              <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name={t('expense')} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold font-display mb-4">{t('expenses_by_category')}</h3>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="45%" outerRadius={90} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {expenseByCategory.map((_: any, i: number) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                </Pie>
                <Legend />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-20">{t('no_expenses_yet')}</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
