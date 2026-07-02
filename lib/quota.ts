import { prisma } from "@/lib/prisma"

export function monthsSince(date: Date): number {
  const now = new Date()
  let months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  if (now.getDate() < date.getDate()) months -= 1
  return Math.max(0, months)
}

export function getProviderLearnerCap(provider: { createdAt: Date; learnerQuotaOverride: number | null }): number {
  if (provider.learnerQuotaOverride != null) return provider.learnerQuotaOverride
  return Math.min(20 * 2 ** monthsSince(provider.createdAt), 640)
}

export async function getProviderQuotaStatus(providerId: string): Promise<{
  cap: number
  used: number
  remaining: number
  overridden: boolean
}> {
  const provider = await prisma.providerProfile.findUnique({ where: { id: providerId } })
  if (!provider) {
    return { cap: 0, used: 0, remaining: 0, overridden: false }
  }
  const used = await prisma.learnerProfile.count({ where: { providerId } })
  const cap = getProviderLearnerCap(provider)
  return { cap, used, remaining: Math.max(0, cap - used), overridden: provider.learnerQuotaOverride != null }
}

export function getProviderAdCap(): number {
  return 3
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export async function getProviderAdsUsedThisMonth(providerId: string): Promise<number> {
  const provider = await prisma.providerProfile.findUnique({ where: { id: providerId } })
  if (!provider) return 0
  const windowStart = addMonths(provider.createdAt, monthsSince(provider.createdAt))
  return prisma.advertisement.count({ where: { providerId, createdAt: { gte: windowStart } } })
}
