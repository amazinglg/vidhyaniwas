const PageSkeleton = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-fade-in">
    <p className="text-sm font-medium text-muted-foreground tracking-wide">Loading</p>
    <div className="flex items-center gap-1.5" aria-label="Loading">
      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
    </div>
  </div>
);

export default PageSkeleton;
