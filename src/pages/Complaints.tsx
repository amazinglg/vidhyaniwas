import { useState, useEffect } from 'react';
import { Plus, MessageSquareWarning, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useComplaints, useResidents } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  open: 'bg-destructive text-destructive-foreground',
  in_progress: 'gradient-warm text-primary-foreground',
  resolved: 'bg-success text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
};

const Complaints = () => {
  const { data: complaints = [], isLoading } = useComplaints();
  const { data: residents = [] } = useResidents();
  const { user, isAdmin, residentId } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [raiseDialogOpen, setRaiseDialogOpen] = useState(false);
  const [raiseForm, setRaiseForm] = useState({ title: '', description: '', category: 'General', residentId: '' });

  // For admin raising complaint, they need to pick a resident or use their own
  useEffect(() => {
    if (residentId) setRaiseForm(f => ({ ...f, residentId }));
  }, [residentId]);

  const updateStatus = async (id: string, status: string) => {
    const update: { status: string; resolved_at?: string } = { status };
    if (status === 'resolved') update.resolved_at = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('complaints').update(update).eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    toast.success(t('status_updated'));
  };

  const addComment = async () => {
    if (!selectedComplaint || !comment.trim()) return;
    const { error } = await supabase.from('complaints').update({ admin_comment: comment }).eq('id', selectedComplaint.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    setSelectedComplaint(null);
    setComment('');
    toast.success(t('comment_added'));
  };

  const handleRaiseComplaint = async () => {
    const rid = raiseForm.residentId || residentId;
    if (!raiseForm.title || !rid) {
      toast.error(t('please_fill_required'));
      return;
    }
    const { error } = await supabase.from('complaints').insert({
      resident_id: rid,
      title: raiseForm.title,
      description: raiseForm.description || null,
      category: raiseForm.category,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    setRaiseDialogOpen(false);
    setRaiseForm({ title: '', description: '', category: 'General', residentId: residentId || '' });
    toast.success(t('complaint_submitted'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">{t('manage_complaints')}</h1>
          <p className="text-muted-foreground mt-1">{t('review_complaints')}</p>
        </div>
        {isAdmin && (
          <Dialog open={raiseDialogOpen} onOpenChange={setRaiseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-warm text-primary-foreground shadow-lg"><Plus className="h-4 w-4 mr-2" /> {t('raise_complaint')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display">{t('raise_complaint')}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t('resident')} *</Label>
                  <Select value={raiseForm.residentId} onValueChange={(v) => setRaiseForm({ ...raiseForm, residentId: v })}>
                    <SelectTrigger><SelectValue placeholder={t('select_resident')} /></SelectTrigger>
                    <SelectContent>{residents.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.house_no})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>{t('title')} *</Label><Input value={raiseForm.title} onChange={(e) => setRaiseForm({ ...raiseForm, title: e.target.value })} /></div>
                <div className="grid gap-2"><Label>{t('description')}</Label><Textarea value={raiseForm.description} onChange={(e) => setRaiseForm({ ...raiseForm, description: e.target.value })} rows={3} /></div>
                <div className="grid gap-2"><Label>{t('category')}</Label><Input value={raiseForm.category} onChange={(e) => setRaiseForm({ ...raiseForm, category: e.target.value })} /></div>
                <Button onClick={handleRaiseComplaint} className="w-full mt-2 gradient-warm text-primary-foreground">{t('submit')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {['open', 'in_progress', 'resolved', 'closed'].map(status => {
          const count = complaints.filter((c: any) => c.status === status).length;
          return (
            <Card key={status} className="p-4 text-center">
              <p className="text-2xl font-bold font-display">{count}</p>
              <p className="text-sm text-muted-foreground capitalize">{t(status)}</p>
            </Card>
          );
        })}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('resident')}</TableHead>
              <TableHead>{t('house')}</TableHead>
              <TableHead>{t('title')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('loading')}</TableCell></TableRow>
            ) : complaints.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('no_complaints')}</TableCell></TableRow>
            ) : complaints.map((c: any) => (
              <TableRow key={c.id} className="animate-fade-in">
                <TableCell className="font-medium">{c.residents?.name}</TableCell>
                <TableCell>{c.residents?.house_no}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Badge className={statusColors[c.status] || 'bg-muted'}>{c.status.replace('_', ' ')}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t('open')}</SelectItem>
                        <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                        <SelectItem value="resolved">{t('resolved')}</SelectItem>
                        <SelectItem value="closed">{t('closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedComplaint(c); setComment(c.admin_comment || ''); }}>
                      <MessageSquareWarning className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{t('respond_complaint')}</DialogTitle></DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-semibold">{selectedComplaint.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedComplaint.description}</p>
              </div>
              <div className="grid gap-2">
                <Label>{t('admin_comment')}</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="..." />
              </div>
              <Button onClick={addComment} className="w-full gradient-warm text-primary-foreground">
                <Send className="h-4 w-4 mr-2" /> {t('send_response')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Complaints;
