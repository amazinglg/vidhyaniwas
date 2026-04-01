import { useState } from 'react';
import { Plus, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockNotices } from '@/data/mockData';
import { Notice } from '@/types/society';
import { toast } from 'sonner';

const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

const Notices = () => {
  const [notices, setNotices] = useState<Notice[]>(mockNotices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'medium' as Notice['priority'] });

  const handleAdd = () => {
    if (!form.title || !form.content) { toast.error('Please fill all fields'); return; }
    const newNotice: Notice = {
      id: String(Date.now()), title: form.title, content: form.content,
      createdBy: 'Labhansh Garg', createdAt: new Date().toISOString().split('T')[0],
      priority: form.priority, isActive: true,
    };
    setNotices((prev) => [newNotice, ...prev]);
    setDialogOpen(false);
    setForm({ title: '', content: '', priority: 'medium' });
    toast.success('Notice published');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Notices & Announcements</h1>
          <p className="text-muted-foreground mt-1">Keep residents informed</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Notice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Create Notice</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Content *</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} /></div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Notice['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full mt-2">Publish Notice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {notices.map((n) => (
          <Card key={n.id} className="p-5 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold font-display text-foreground">{n.title}</h3>
                    <Badge variant={priorityVariant[n.priority]}>{n.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">By {n.createdBy} • {n.createdAt}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Notices;
