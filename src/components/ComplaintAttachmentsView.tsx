import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ComplaintAttachmentsView = ({ paths }: { paths: string[] }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!paths?.length) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const p of paths) {
        const { data } = await supabase.storage.from('complaint-attachments').createSignedUrl(p, 3600);
        if (data?.signedUrl) out[p] = data.signedUrl;
      }
      if (!cancelled) setUrls(out);
    })();
    return () => { cancelled = true; };
  }, [paths?.join('|')]);

  if (!paths?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {paths.map((p) => (
        <a key={p} href={urls[p]} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-md overflow-hidden border border-border bg-muted">
          {urls[p] ? <img src={urls[p]} alt="attachment" className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse" />}
        </a>
      ))}
    </div>
  );
};
