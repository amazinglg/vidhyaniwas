import { useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

const MAX_BYTES = 5 * 1024 * 1024;

export const ComplaintImageUploader = ({ userId, value, onChange, max = 3 }: Props) => {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = max - value.length;
    if (remaining <= 0) {
      toast.error(`You can attach up to ${max} images.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: only image files are allowed`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: exceeds 5MB limit`);
        continue;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('complaint-attachments')
        .upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); continue; }
      uploaded.push(path);
    }
    setUploading(false);
    if (uploaded.length) onChange([...value, ...uploaded]);
  };

  const remove = (path: string) => {
    onChange(value.filter(p => p !== path));
    void supabase.storage.from('complaint-attachments').remove([path]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((path) => {
          const { data } = supabase.storage.from('complaint-attachments').getPublicUrl(path);
          // Bucket is private; use signed url
          return <ThumbPreview key={path} path={path} onRemove={() => remove(path)} />;
        })}
        {value.length < max && (
          <label className="flex items-center justify-center w-20 h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => { void handleFiles(e.target.files); e.target.value = ''; }}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Up to {max} images, max 5MB each.</p>
    </div>
  );
};

const ThumbPreview = ({ path, onRemove }: { path: string; onRemove: () => void }) => {
  const [url, setUrl] = useState<string>('');
  useState(() => {
    supabase.storage.from('complaint-attachments').createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
    return undefined;
  });
  return (
    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
      {url ? <img src={url} alt="attachment" className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse bg-muted" />}
      <Button type="button" variant="destructive" size="icon" className="absolute -top-1 -right-1 h-5 w-5" onClick={onRemove}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
