import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-warm hover:scale-[1.02]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft hover:shadow-warm hover:scale-[1.02]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-soft hover:shadow-card",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:shadow-warm hover:scale-[1.02]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]",
        link: "text-primary underline-offset-4 hover:underline hover:scale-[1.02]",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft hover:shadow-warm hover:scale-[1.02]",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-soft hover:shadow-warm hover:scale-[1.02]",
        sky: "bg-sky text-sky-foreground hover:bg-sky/90 shadow-soft hover:shadow-warm hover:scale-[1.02]",
        premium: "bg-gradient-primary text-white shadow-premium hover:shadow-glow hover:scale-[1.05] btn-premium",
        glass: "glass text-foreground hover:shadow-floating hover:scale-[1.02]",
        gradient: "bg-gradient-warm text-white shadow-warm hover:shadow-glow hover:scale-[1.02]",
        floating: "shadow-floating hover:shadow-premium hover:scale-[1.05] hover:-translate-y-1",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 text-base font-semibold",
        xl: "h-14 rounded-lg px-10 text-lg font-bold",
        icon: "h-10 w-10",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "hover:animate-bounce",
        glow: "animate-glow",
        scale: "hover:animate-scale-in",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, animation, asChild = false, loading = false, icon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(enhancedButtonVariants({ variant, size, animation, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Carregando...
          </>
        ) : (
          <>
            {icon && icon}
            {children}
          </>
        )}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, enhancedButtonVariants }