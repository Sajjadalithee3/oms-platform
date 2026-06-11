import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  color?: string
}

export function StatCard({ title, value, icon, description, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-[#1A1A2E] mt-1">{value}</p>
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${color || "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
