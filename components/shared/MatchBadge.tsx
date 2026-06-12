import { cn } from "@/lib/utils"

interface MatchBadgeProps {
  score: number
  matchedSkills?: string[]
  missingSkills?: string[]
  className?: string
}

export function MatchBadge({ score, matchedSkills, missingSkills, className }: MatchBadgeProps) {
  const color =
    score >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : score >= 60
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : score >= 40
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-red-100 text-red-700 border-red-200"

  return (
    <div className={cn("group relative inline-block", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
          color
        )}
      >
        {score}% match
      </span>
      {(matchedSkills?.length || missingSkills?.length) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-[#1A1A2E] text-white text-xs rounded-lg p-3 shadow-lg min-w-[200px]">
            {matchedSkills && matchedSkills.length > 0 && (
              <div className="mb-2">
                <p className="font-semibold text-green-400 mb-1">Matched:</p>
                <p>{matchedSkills.join(", ")}</p>
              </div>
            )}
            {missingSkills && missingSkills.length > 0 && (
              <div>
                <p className="font-semibold text-red-400 mb-1">Missing:</p>
                <p>{missingSkills.join(", ")}</p>
              </div>
            )}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A2E]" />
          </div>
        </div>
      )}
    </div>
  )
}
