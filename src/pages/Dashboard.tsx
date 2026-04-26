import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, IndianRupee, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '@/components/dashboard/StatCard';
import { useResidents, useMaintenanceCollections, useExpenses } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import NotificationStatsCard from '@/components/NotificationStatsCard';

const CHART_COLORS = ['hsl(30, 85%, 52%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(210, 92%, 45%)', 'hsl(45, 93%, 47%)'];

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };
const statusIcon: Record<string, any> = { paid: CheckCircle2, partial: Clock, pending: Clock, overdue: AlertTriangle };

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState('2026');
  const { data: residents = [] } = useResidents();
  const { data: collections = [] } = useMaintenanceCollections();
  const { data: expenses = [] } = useExpenses();
  const { t } = useLanguage();
  const { isAdmin, residentId } = useAuth();
  const navigate = useNavigate();

  // For non-admin: fetch own maintenance
  const { data: myMaintenance = [] } = useQuery({
    queryKey: ['my_maintenance_dashboard', residentId],
    queryFn: async () => {
      if (!residentId) return [];
      const { data } = await supabase.from('maintenance_collections').select('*').eq('resident_id', residentId).order('year', { ascending: false });
      return data || [];
    },
    enabled: !isAdmin && !!residentId,
  });

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

  // Non-admin personal dashboard
  if (!isAdmin) {
    const myYearMaintenance = myMaintenance.filter((m: any) => m.year === Number(selectedYear));
    const myTotalPaid = myYearMaintenance.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const myTotalDue = myYearMaintenance.reduce((s: number, m: any) => s + Number(m.due_amount || 0), 0);

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t('dashboard')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('your_payment_history')}</p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Card className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t('total_paid')} ({selectedYear})</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">₹{myTotalPaid.toLocaleString('en-IN')}</p>
          </Card>
          <Card className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t('total_pending')} ({selectedYear})</p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">₹{myTotalDue.toLocaleString('en-IN')}</p>
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="text-lg font-semibold font-display mb-4">{t('maintenance_fund')} - {selectedYear}</h3>
          {myYearMaintenance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('no_records')}</p>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('month')}</TableHead><TableHead>{t('total_maintenance')}</TableHead><TableHead>{t('paid')}</TableHead><TableHead>{t('due')}</TableHead><TableHead>{t('date')}</TableHead><TableHead>{t('status')}</TableHead><TableHead>{t('payment_mode')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {myYearMaintenance.map((m: any) => {
                      const StatusIcon = statusIcon[m.status] || Clock;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.month} {m.year}</TableCell>
                          <TableCell>₹{Number(m.total_maintenance || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-green-600 font-medium">₹{Number(m.amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-orange-600 font-medium">₹{Number(m.due_amount || 0).toLocaleString()}</TableCell>
                          <TableCell>{m.paid_date || '-'}</TableCell>
                          <TableCell><Badge variant={statusBadge[m.status] || 'outline'} className="gap-1"><StatusIcon className="h-3 w-3" />{t(m.status)}</Badge></TableCell>
                          <TableCell className="capitalize">{m.payment_mode || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {myYearMaintenance.map((m: any) => {
                  const StatusIcon = statusIcon[m.status] || Clock;
                  return (
                    <div key={m.id} className="p-4 rounded-lg border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.month} {m.year}</span>
                        <Badge variant={statusBadge[m.status] || 'outline'} className="gap-1"><StatusIcon className="h-3 w-3" />{t(m.status)}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div><p className="text-muted-foreground text-xs">{t('total_maintenance')}</p><p className="font-medium">₹{Number(m.total_maintenance || 0).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground text-xs">{t('paid')}</p><p className="font-medium text-green-600">₹{Number(m.amount || 0).toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground text-xs">{t('due')}</p><p className="font-medium text-orange-600">₹{Number(m.due_amount || 0).toLocaleString()}</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('financial_overview')}</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <button type="button" onClick={() => navigate('/residents')} className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
          <StatCard title={t('total_residents')} value={String(residents.length)} subtitle={`${residents.filter((r: any) => r.is_active).length} ${t('active').toLowerCase()}`} icon={Users} variant="primary" />
        </button>
        <button type="button" onClick={() => navigate('/maintenance?filter=paid')} className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
          <StatCard title={t('total_collected')} value={`₹${totalCollected.toLocaleString('en-IN')}`} subtitle={`${paidCount} ${t('payments_received')}`} icon={TrendingUp} variant="success" />
        </button>
        <button type="button" onClick={() => navigate('/expenses')} className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
          <StatCard title={t('total_expenses')} value={`₹${totalExpensesAmt.toLocaleString('en-IN')}`} icon={TrendingDown} variant="destructive" />
        </button>
        <button type="button" onClick={() => navigate('/maintenance?filter=pending')} className="text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
          <StatCard title={t('pending_dues')} value={`₹${totalDue.toLocaleString('en-IN')}`} subtitle={`${overdueCount} ${t('residents_pending')}`} icon={AlertTriangle} variant="warning" />
        </button>
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

      <NotificationStatsCard />

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
