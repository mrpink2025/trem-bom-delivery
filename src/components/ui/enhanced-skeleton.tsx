import { cn } from "@/lib/utils"

function EnhancedSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Skeleton components for common patterns
function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <EnhancedSkeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <EnhancedSkeleton className="h-4 w-32" />
            <EnhancedSkeleton className="h-3 w-24" />
          </div>
        </div>
        <EnhancedSkeleton className="h-4 w-full" />
        <EnhancedSkeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-4">
        <EnhancedSkeleton className="h-4 w-32" />
        <EnhancedSkeleton className="h-4 w-24" />
        <EnhancedSkeleton className="h-4 w-40" />
        <EnhancedSkeleton className="h-4 w-20" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <EnhancedSkeleton className="h-3 w-32" />
          <EnhancedSkeleton className="h-3 w-24" />
          <EnhancedSkeleton className="h-3 w-40" />
          <EnhancedSkeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <EnhancedSkeleton className="h-6 w-40" />
        <EnhancedSkeleton className="h-6 w-24" />
      </div>
      <div className="h-64 flex items-end space-x-2">
        {[...Array(12)].map((_, i) => (
          <EnhancedSkeleton 
            key={i} 
            className="flex-1" 
            style={{ height: `${Math.random() * 200 + 50}px` }}
          />
        ))}
      </div>
    </div>
  )
}

function SkeletonMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <EnhancedSkeleton className="h-3 w-20" />
                <EnhancedSkeleton className="h-8 w-16" />
                <EnhancedSkeleton className="h-3 w-16" />
              </div>
              <EnhancedSkeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export { 
  EnhancedSkeleton, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonChart, 
  SkeletonMetrics 
}