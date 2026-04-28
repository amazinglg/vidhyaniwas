import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import type { CarouselApi } from '@/components/ui/carousel';

export const ComplaintAttachmentsView = ({ paths }: { paths: string[] }) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

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

  // Sync current slide indicator and jump to clicked thumbnail when opened
  useEffect(() => {
    if (!api) return;
    if (openAt !== null) api.scrollTo(openAt, true);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api, openAt]);

  if (!paths?.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {paths.map((p, idx) => (
          <button
            key={p}
            type="button"
            onClick={() => setOpenAt(idx)}
            className="block w-16 h-16 rounded-md overflow-hidden border border-border bg-muted hover:ring-2 hover:ring-primary transition"
          >
            {urls[p] ? (
              <img src={urls[p]} alt={`attachment ${idx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <Dialog open={openAt !== null} onOpenChange={(o) => !o && setOpenAt(null)}>
        <DialogContent className="max-w-2xl p-2 sm:p-4 bg-background">
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {paths.map((p, idx) => (
                <CarouselItem key={p} className="flex items-center justify-center">
                  {urls[p] ? (
                    <img
                      src={urls[p]}
                      alt={`attachment ${idx + 1}`}
                      className="max-h-[70vh] w-auto mx-auto rounded-md object-contain"
                    />
                  ) : (
                    <div className="h-64 w-full animate-pulse bg-muted rounded-md" />
                  )}
                </CarouselItem>
              ))}
            </CarouselContent>
            {paths.length > 1 && (
              <>
                <CarouselPrevious className="left-1 sm:-left-4" />
                <CarouselNext className="right-1 sm:-right-4" />
              </>
            )}
          </Carousel>
          {paths.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {paths.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => api?.scrollTo(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    current === idx ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/40'
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground pt-1">
            {(current + 1)} / {paths.length} • Swipe or use arrows
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
