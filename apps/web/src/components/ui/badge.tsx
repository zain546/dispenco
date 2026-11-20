import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-tight whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground font-semibold shadow-2xs [a]:hover:bg-primary/90",
        secondary:
          "border-border/80 bg-muted/80 text-foreground [a]:hover:bg-muted",
        destructive:
          "border-destructive/30 bg-destructive/15 text-destructive dark:bg-destructive/20 dark:border-destructive/35",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-500/35",
        warning:
          "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 dark:border-amber-500/35",
        outline:
          "border-border/80 bg-card/60 text-foreground [a]:hover:bg-muted/50",
        ghost:
          "border-transparent hover:bg-muted/60 hover:text-foreground text-muted-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
