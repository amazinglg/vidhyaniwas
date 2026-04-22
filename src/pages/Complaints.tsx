import { useState, useEffect } from 'react';
import { Plus, MessageSquareWarning, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useComplaints, useAllResidents } from '@/hooks/useSocietyData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ComplaintImageUploader } from '@/components/ComplaintImageUploader';
import { ComplaintAttachmentsView } from '@/components/ComplaintAttachmentsView';

const statusColors: Record<string, string> = {
  open: 'bg-destructive text-destructive-foreground',
  in_progress: 'gradient-warm text-primary-foreground',
  resolved: 'bg-success text-success-foreground',
  withdrawn: 'bg-muted text-muted-foreground',
};

interface CommentEntry {
  text: string;
  by: string;
  at: string;
}

const Complaints = () => {
  const { data: complaints = [], isLoading } = useComplaints();
  const { data: allResidents = [] } = useAllResidents();
  const { user, isAdmin, isSupervisor, isMasterAdmin, residentId } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: string } | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [raiseDialogOpen, setRaiseDialogOpen] = useState(false);
  const [raiseForm, setRaiseForm] = useState<{ title: string; description: string; category: string; residentId: string; attachments: string[] }>({ title: '', description: '', category: 'General', residentId: residentId || '', attachments: [] });

  const canManage = isAdmin || isSupervisor;

  useEffect(() => {
    if (residentId) setRaiseForm(f => ({ ...f, residentId }));
  }, [residentId]);

  const appendComment = (existing: any, text: string, byName: string): Record<string, string>[] => {
    const prev: Record<string, string>[] = Array.isArray(existing) ? existing : [];
    return [...prev, { text, by: byName, at: new Date().toISOString() }];
  };

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.user_metadata?.mobile || 'Unknown';
  };

  const handleStatusChange = (id: string, status: string) => {
    setPendingStatus({ id, status });
    setStatusComment('');
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    if (!statusComment.trim()) {
      toast.error(t('add_comment_required'));
      return;
    }
    const complaint = complaints.find((c: any) => c.id === pendingStatus.id);
    const newComments = appendComment(
      complaint?.comments,
      `${t('status_changed_to')} ${t(pendingStatus.status)}: ${statusComment}`,
      getUserDisplayName()
    );
    const update: any = { status: pendingStatus.status, comments: newComments };
    if (pendingStatus.status === 'resolved') update.resolved_at = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('complaints').update(update).eq('id', pendingStatus.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    toast.success(t('status_updated'));
    setPendingStatus(null);
    setStatusComment('');
  };

  const addComment = async () => {
    if (!selectedComplaint || !comment.trim()) return;
    const newComments = appendComment(selectedComplaint.comments, comment, getUserDisplayName());
    const { error } = await supabase.from('complaints').update({ admin_comment: comment, comments: newComments }).eq('id', selectedComplaint.id);
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
      attachments: raiseForm.attachments,
    });
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    setRaiseDialogOpen(false);
    setRaiseForm({ title: '', description: '', category: 'General', residentId: residentId || '', attachments: [] });
    toast.success(t('complaint_submitted'));
  };

  const handleDeleteComplaint = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    const { error } = await supabase.from('complaints').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['complaints'] });
    toast.success(t('delete'));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{t('manage_complaints')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('review_complaints')}</p>
        </div>
        {canManage && (
          <Dialog open={raiseDialogOpen} onOpenChange={setRaiseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-warm text-primary-foreground shadow-lg" size="sm"><Plus className="h-4 w-4 mr-2" /> {t('raise_complaint')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">{t('raise_complaint')}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t('resident')} *</Label>
                  <Select 
                    value={raiseForm.residentId} 
                    onValueChange={(v) => setRaiseForm({ ...raiseForm, residentId: v })}
                    disabled={!isAdmin && !!residentId}
                  >
                    <SelectTrigger><SelectValue placeholder={t('select_resident')} /></SelectTrigger>
                    <SelectContent>{allResidents.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.house_no})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>{t('title')} *</Label><Input value={raiseForm.title} onChange={(e) => setRaiseForm({ ...raiseForm, title: e.target.value })} /></div>
                <div className="grid gap-2"><Label>{t('description')}</Label><Textarea value={raiseForm.description} onChange={(e) => setRaiseForm({ ...raiseForm, description: e.target.value })} rows={3} /></div>
                <div className="grid gap-2"><Label>{t('category')}</Label><Input value={raiseForm.category} onChange={(e) => setRaiseForm({ ...raiseForm, category: e.target.value })} /></div>
                <div className="grid gap-2">
                  <Label>Photos (optional)</Label>
                  {user && <ComplaintImageUploader userId={user.id} value={raiseForm.attachments} onChange={(a) => setRaiseForm({ ...raiseForm, attachments: a })} max={3} />}
                </div>
                <Button onClick={handleRaiseComplaint} className="w-full mt-2 gradient-warm text-primary-foreground">{t('submit')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {['open', 'in_progress', 'resolved'].map(status => {
          const count = complaints.filter((c: any) => c.status === status).length;
          return (
            <Card key={status} className="p-3 md:p-4 text-center">
              <p className="text-xl md:text-2xl font-bold font-display">{count}</p>
              <p className="text-xs md:text-sm text-muted-foreground capitalize">{t(status)}</p>
            </Card>
          );
        })}
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t('loading')}</p>
        ) : complaints.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t('no_complaints')}</Card>
        ) : complaints.map((c: any) => (
          <Card key={c.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.residents?.name} • {c.residents?.house_no}</p>
              </div>
              <Badge className={`text-xs ${statusColors[c.status] || 'bg-muted'}`}>{t(c.status)}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{c.category}</span>
              <span>•</span>
              <span>{c.assigned_to || '-'}</span>
              <span>•</span>
              <span>{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
            {canManage && (
              <div className="flex gap-1 pt-1 border-t flex-wrap">
                <Select value={c.status} onValueChange={(v) => handleStatusChange(c.id, v)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('open')}</SelectItem>
                    <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                    <SelectItem value="resolved">{t('resolved')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedComplaint(c); setComment(''); }}>
                  <MessageSquareWarning className="h-3.5 w-3.5" />
                </Button>
                {isMasterAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteComplaint(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('resident')}</TableHead>
              <TableHead>{t('house')}</TableHead>
              <TableHead>{t('title')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('assigned_to')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              {canManage && <TableHead>{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">{t('loading')}</TableCell></TableRow>
            ) : complaints.length === 0 ? (
              <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">{t('no_complaints')}</TableCell></TableRow>
            ) : complaints.map((c: any) => (
              <TableRow key={c.id} className="animate-fade-in">
                <TableCell className="font-medium">{c.residents?.name}</TableCell>
                <TableCell>{c.residents?.house_no}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{c.assigned_to || '-'}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Badge className={statusColors[c.status] || 'bg-muted'}>{t(c.status).replace('_', ' ')}</Badge></TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Select value={c.status} onValueChange={(v) => handleStatusChange(c.id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">{t('open')}</SelectItem>
                          <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                          <SelectItem value="resolved">{t('resolved')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedComplaint(c); setComment(''); }}>
                        <MessageSquareWarning className="h-4 w-4" />
                      </Button>
                      {isMasterAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteComplaint(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Status change comment required dialog */}
      <Dialog open={!!pendingStatus} onOpenChange={() => setPendingStatus(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">{t('add_comment_for_status')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('changing_status_to')} <Badge className={statusColors[pendingStatus?.status || ''] || 'bg-muted'}>{t(pendingStatus?.status || '')}</Badge>
            </p>
            <div className="grid gap-2">
              <Label>{t('admin_comment')} *</Label>
              <Textarea value={statusComment} onChange={(e) => setStatusComment(e.target.value)} rows={3} placeholder={t('add_reason_placeholder')} />
            </div>
            <Button onClick={confirmStatusChange} className="w-full gradient-warm text-primary-foreground">
              <Send className="h-4 w-4 mr-2" /> {t('confirm_status_change')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment dialog with history */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{t('respond_complaint')}</DialogTitle></DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-semibold">{selectedComplaint.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedComplaint.description}</p>
                <ComplaintAttachmentsView paths={selectedComplaint.attachments || []} />
              </div>

              {/* Comment history */}
              {Array.isArray(selectedComplaint.comments) && selectedComplaint.comments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('comment_history')}</Label>
                  <ScrollArea className="h-40 rounded-lg border p-3">
                    <div className="space-y-3">
                      {(selectedComplaint.comments as CommentEntry[]).map((entry, idx) => (
                        <div key={idx} className="text-sm border-b border-border pb-2 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-foreground">{entry.by}</span>
                            <span className="text-xs text-muted-foreground">{new Date(entry.at).toLocaleString()}</span>
                          </div>
                          <p className="text-muted-foreground">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="grid gap-2">
                <Label>{t('admin_comment')}</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={t('add_comment_placeholder')} />
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
