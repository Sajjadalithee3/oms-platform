import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          "bg-primary text-white": variant === "default",
          "bg-gray-100 text-gray-800": variant === "secondary",
          "bg-red-100 text-red-700": variant === "destructive",
          "border border-gray-300 text-gray-700": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
