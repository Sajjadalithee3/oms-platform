"use client"

interface ProfileProgressProps {
  percentage: number
  incomplete?: string[]
  onSectionClick?: (section: string) => void
}

export function ProfileProgress({ percentage, incomplete = [], onSectionClick }: ProfileProgressProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#1A1A2E]">Profile Completion</span>
        <span className="text-sm font-bold text-primary">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {incomplete.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {incomplete.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => onSectionClick?.(section)}
              className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              {section}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
