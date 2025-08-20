import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const MobileTabs = TabsPrimitive.Root

const MobileTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      // Mobile-specific improvements
      "w-full",
      "flex-wrap sm:flex-nowrap",
      "gap-1 sm:gap-0",
      "h-auto sm:h-9",
      "overflow-hidden",
      className
    )}
    {...props}
  />
))
MobileTabsList.displayName = TabsPrimitive.List.displayName

const MobileTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      // Mobile optimizations
      "min-w-0 flex-1 sm:flex-none",
      "text-xs sm:text-sm",
      "px-2 py-1.5 sm:px-3 sm:py-1",
      "truncate",
      // Ensure proper touch targets
      "min-h-[44px] sm:min-h-[36px]",
      className
    )}
    {...props}
  />
))
MobileTabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const MobileTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
MobileTabsContent.displayName = TabsPrimitive.Content.displayName

export { MobileTabs, MobileTabsList, MobileTabsTrigger, MobileTabsContent }