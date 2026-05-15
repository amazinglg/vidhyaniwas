import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, IndianRupee, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, BarChart3, PieChart as PieIcon, LayoutDashboard, Wallet, CalendarRange } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useResidents, useMaintenanceCollections, useExpenses } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import NotificationStatsCard from '@/components/NotificationStatsCard';
import { PageHeader, SectionHeader, SectionCard, Chip } from '@/components/layout/PagePrimitives';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--accent))', 'hsl(var(--warning))'];

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { paid: 'default', partial: 'secondary', pending: 'outline', overdue: 'destructive' };
const statusIcon: Record<string, any> = { paid: CheckCircle2, partial: Clock, pending: Clock, overdue: AlertTriangle };

// Compact metric tile mirroring MyProfile chip aesthetic but bigger and tappable.
const MetricTile = ({
  label, value, subtitle, icon: Icon, tone = 'primary', onClick,
}: { label: string; value: string; subtitle?: string; icon: any; tone?: 'primary' | 'success' | 'destructive' | 'warning'; onClick?: () => void }) => {
  const tones: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/25',
    success: 'bg-success/10 text-success border-success/25',
    destructive: 'bg-destructive/10 text-destructive border-destructive/25',
    warning: 'bg-warning/15 text-warning-foreground border-warning/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={`group text-left w-full rounded-xl border bg-card p-3 shadow-sm transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</p>
          <p className="text-base font-bold font-display leading-tight mt-1 truncate">{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Comp>
  );
};

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState('2026');
  const { data: residents = [] } = useResidents();
  const { data: collections = [] } = useMaintenanceCollections();
  const { data: expenses = [] } = useExpenses();
  const { t } = useLanguage();
  const { isAdmin, residentId } = useAuth();
  const navigate = useNavigate();

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

  const yearSelector = (
    <Select value={selectedYear} onValueChange={setSelectedYear}>
      <SelectTrigger className="h-8 w-[88px] text-xs"><CalendarRange className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="2026">2026</SelectItem>
        <SelectItem value="2025">2025</SelectItem>
      </SelectContent>
    </Select>
  );

  // -------- Resident view --------
  if (!isAdmin) {
    const myYearMaintenance = myMaintenance.filter((m: any) => m.year === Number(selectedYear));
    const myTotalPaid = myYearMaintenance.reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const myTotalDue = myYearMaintenance.reduce((s: number, m: any) => s + Number(m.due_amount || 0), 0);

    return (
      <div className="space-y-3">
        <PageHeader
          icon={LayoutDashboard}
          title={t('dashboard')}
          subtitle={t('your_payment_history')}
          action={yearSelector}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <MetricTile label={`${t('total_paid')} ${selectedYear}`} value={`₹${myTotalPaid.toLocaleString('en-IN')}`} icon={TrendingUp} tone="success" />
          <MetricTile label={`${t('total_pending')} ${selectedYear}`} value={`₹${myTotalDue.toLocaleString('en-IN')}`} icon={AlertTriangle} tone="warning" />
        </div>

        <SectionCard>
          <SectionHeader icon={Wallet} title={`${t('maintenance_fund')} • ${selectedYear}`} />
          {myYearMaintenance.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">{t('no_records')}</p>
          ) : (
            <div className="space-y-2 pb-3">
              {myYearMaintenance.map((m: any) => {
                const StatusIcon = statusIcon[m.status] || Clock;
                return (
                  <div key={m.id} className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{m.month} {m.year}</span>
                      <Badge variant={statusBadge[m.status] || 'outline'} className="gap-1 h-5 text-[10px]">
                        <StatusIcon className="h-3 w-3" />{t(m.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Chip label={t('total_maintenance')} value={`₹${Number(m.total_maintenance || 0).toLocaleString()}`} />
                      <Chip label={t('paid')} value={`₹${Number(m.amount || 0).toLocaleString()}`} />
                      <Chip label={t('due')} value={`₹${Number(m.due_amount || 0).toLocaleString()}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    );
  }

  // -------- Admin view --------
  return (
    <div className="space-y-3">
      <PageHeader
        icon={LayoutDashboard}
        title={t('dashboard')}
        subtitle={t('financial_overview')}
        action={yearSelector}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <MetricTile label={t('total_residents')} value={String(residents.length)} subtitle={`${residents.filter((r: any) => r.is_active).length} ${t('active').toLowerCase()}`} icon={Users} tone="primary" onClick={() => navigate('/residents')} />
        <MetricTile label={t('total_collected')} value={`₹${totalCollected.toLocaleString('en-IN')}`} subtitle={`${paidCount} ${t('payments_received')}`} icon={TrendingUp} tone="success" onClick={() => navigate('/maintenance?filter=paid')} />
        <MetricTile label={t('total_expenses')} value={`₹${totalExpensesAmt.toLocaleString('en-IN')}`} icon={TrendingDown} tone="destructive" onClick={() => navigate('/expenses')} />
        <MetricTile label={t('pending_dues')} value={`₹${totalDue.toLocaleString('en-IN')}`} subtitle={`${overdueCount} ${t('residents_pending')}`} icon={AlertTriangle} tone="warning" onClick={() => navigate('/maintenance?filter=pending')} />
      </div>

      <SectionCard>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-success/15 text-success border border-success/30 flex items-center justify-center shrink-0">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{t('net_balance')} • {selectedYear}</p>
              <p className="text-lg font-bold font-display leading-tight mt-0.5">₹{(totalCollected - totalExpensesAmt).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <NotificationStatsCard />

      <SectionCard>
        <SectionHeader icon={BarChart3} title={t('monthly_income_vs_expenses')} />
        <div className="pb-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name={t('income')} />
              <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name={t('expense')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={PieIcon} title={t('expenses_by_category')} />
        <div className="pb-3">
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                  {expenseByCategory.map((_: any, i: number) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center text-xs py-12">{t('no_expenses_yet')}</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default Dashboard;
