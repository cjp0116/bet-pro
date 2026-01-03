/**
 * Fraud Service - Server-side fraud detection with database persistence
 * 
 * Integrates fraud detection functions with Prisma for persistence
 * and provides hooks for user flows (bets, deposits, withdrawals, login)
 */
import 'server-only'

import { prisma } from '@/lib/db/prisma'
import {
  detectRapidBetting,
  detectUnusualStakeSize,
  detectArbitrage,
  detectAccountTakeover,
  detectPaymentFraud,
  detectMoneyLaundering,
  calculateRiskScore,
  getSeverityFromRiskScore,
  type FraudEvent,
  type BettingPattern,
} from './detector'
import {
  calculateBaseRiskScore,
  calculateActionRiskScore,
  getRiskLevel,
  getRecommendedAction,
  type RiskFactors,
} from './risk-scorer'

// ============================================
// Fraud Event Persistence
// ============================================

/**
 * Save a fraud event to the database
 */
export async function saveFraudEvent(event: FraudEvent): Promise<string> {
  const created = await prisma.fraudEvent.create({
    data: {
      userId: event.userId,
      eventType: event.eventType,
      severity: event.severity,
      riskScore: event.riskScore,
      description: event.description,
      metadata: event.metadata,
      status: 'pending_review',
    },
  })
  return created.id
}

/**
 * Get recent fraud events for a user
 */
export async function getUserFraudEvents(
  userId: string,
  days: number = 30
): Promise<FraudEvent[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const events = await prisma.fraudEvent.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
  })

  return events.map(e => ({
    userId: e.userId ?? undefined,
    eventType: e.eventType as FraudEvent['eventType'],
    severity: e.severity as FraudEvent['severity'],
    riskScore: e.riskScore,
    description: e.description ?? '',
    metadata: e.metadata as Record<string, unknown> | undefined,
  }))
}

// ============================================
// Risk Factor Collection
// ============================================

/**
 * Collect risk factors for a user from the database
 */
export async function collectUserRiskFactors(userId: string): Promise<RiskFactors> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      password: { select: { failedLoginAttempts: true } },
      bets: { select: { totalStake: true, placedAt: true } },
      financialAccounts: {
        where: { accountType: 'main' },
        include: {
          transactions: {
            where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          },
        },
      },
      userSessions: {
        select: { deviceFingerprint: true, ipAddressHash: true },
        distinct: ['deviceFingerprint'],
      },
    },
  })

  if (!user) {
    return {}
  }

  const accountAgeDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  const bets = user.bets || []
  const stakes = bets.map(b => Number(b.totalStake))
  const totalBets = bets.length
  const averageStake = totalBets > 0 ? stakes.reduce((a, b) => a + b, 0) / totalBets : 0
  const maxStake = totalBets > 0 ? Math.max(...stakes) : 0

  const transactions = user.financialAccounts?.[0]?.transactions || []
  const deposits = transactions.filter(t => t.transactionType === 'deposit')
  const withdrawals = transactions.filter(t => t.transactionType === 'withdrawal')

  const uniqueDevices = new Set(user.userSessions?.map(s => s.deviceFingerprint) || [])
  const uniqueIPs = new Set(user.userSessions?.map(s => s.ipAddressHash) || [])

  return {
    accountAge: accountAgeDays,
    totalBets,
    totalDeposits: deposits.length,
    totalWithdrawals: withdrawals.length,
    averageStake,
    maxStake,
    deviceChanges: uniqueDevices.size,
    locationChanges: uniqueIPs.size,
    failedLoginAttempts: user.password?.failedLoginAttempts ?? 0,
    kycVerified: user.kycVerified,
    emailVerified: !!user.emailVerified,
  }
}

// ============================================
// User Flow Integrations
// ============================================

export interface FraudCheckResult {
  allowed: boolean
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  action: 'monitor' | 'flag' | 'verify' | 'suspend' | 'block'
  message: string
  patterns: BettingPattern[]
  fraudEventIds: string[]
}

/**
 * Check fraud signals before placing a bet
 */
export async function checkBetFraud(
  userId: string,
  stake: number,
  gameId: string,
  marketType: string,
  selectionId: string
): Promise<FraudCheckResult> {
  const patterns: BettingPattern[] = []
  const fraudEventIds: string[] = []

  // Collect risk factors
  const factors = await collectUserRiskFactors(userId)
  const baseScore = calculateBaseRiskScore(factors)

  // Get recent bets for pattern detection
  const recentBets = await prisma.bet.findMany({
    where: {
      userId,
      placedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
    },
    select: { totalStake: true, placedAt: true, oddsSnapshot: true },
  })

  // Check rapid betting
  const rapidBetting = detectRapidBetting(
    recentBets.map(b => ({ placedAt: b.placedAt, stake: Number(b.totalStake) })),
    5, // 5 minute window
    10 // 10 bets threshold
  )
  if (rapidBetting) {
    patterns.push(rapidBetting)
    const eventId = await saveFraudEvent({
      userId,
      eventType: 'rapid_betting',
      severity: getSeverityFromRiskScore(rapidBetting.riskScore),
      riskScore: rapidBetting.riskScore,
      description: `Rapid betting detected: ${rapidBetting.patternDetails.betsCount} bets in ${rapidBetting.patternDetails.timeWindowMinutes} minutes`,
      metadata: rapidBetting.patternDetails,
    })
    fraudEventIds.push(eventId)
  }

  // Check unusual stake size
  if (factors.averageStake && factors.maxStake) {
    const unusualStake = detectUnusualStakeSize(stake, factors.averageStake, factors.maxStake)
    if (unusualStake) {
      patterns.push(unusualStake)
      const eventId = await saveFraudEvent({
        userId,
        eventType: 'unusual_stake_size',
        severity: getSeverityFromRiskScore(unusualStake.riskScore),
        riskScore: unusualStake.riskScore,
        description: `Unusual stake: $${stake} is ${unusualStake.patternDetails.stakeRatio}x average`,
        metadata: unusualStake.patternDetails,
      })
      fraudEventIds.push(eventId)
    }
  }

  // Check for arbitrage (betting on opposite sides)
  const arbBets = await prisma.bet.findMany({
    where: {
      userId,
      placedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    select: { id: true, placedAt: true, totalStake: true, oddsSnapshot: true },
  })

  // Parse odds snapshots to extract game/market/selection info
  const parsedBets = arbBets.map(b => {
    const snapshot = b.oddsSnapshot as Record<string, number> | null
    const keys = snapshot ? Object.keys(snapshot) : []
    const firstKey = keys[0] || ''
    const [gId, sel] = firstKey.split(':')
    return {
      gameId: gId || '',
      marketId: marketType,
      selectionId: sel || '',
      stake: Number(b.totalStake),
      placedAt: b.placedAt,
    }
  })

  // Add current bet
  parsedBets.push({
    gameId,
    marketId: marketType,
    selectionId,
    stake,
    placedAt: new Date(),
  })

  const arbitrage = detectArbitrage(parsedBets)
  if (arbitrage) {
    patterns.push(arbitrage)
    const eventId = await saveFraudEvent({
      userId,
      eventType: 'arbitrage_detection',
      severity: getSeverityFromRiskScore(arbitrage.riskScore),
      riskScore: arbitrage.riskScore,
      description: 'Potential arbitrage: bets on opposite sides of same market',
      metadata: arbitrage.patternDetails,
    })
    fraudEventIds.push(eventId)
  }

  // Calculate final risk score
  const patternScores = patterns.map(p => ({
    riskScore: p.riskScore,
    severity: getSeverityFromRiskScore(p.riskScore),
    eventType: p.patternType,
    description: '',
  }))
  const combinedScore = calculateRiskScore(patternScores)
  const actionScore = calculateActionRiskScore('bet', factors, Math.max(baseScore, combinedScore))
  const riskLevel = getRiskLevel(actionScore)
  const recommendation = getRecommendedAction(actionScore)

  // Update user's risk score in database
  await prisma.user.update({
    where: { id: userId },
    data: { riskScore: actionScore },
  })

  return {
    allowed: recommendation.action !== 'suspend' && recommendation.action !== 'block',
    riskScore: actionScore,
    riskLevel,
    action: recommendation.action,
    message: recommendation.message,
    patterns,
    fraudEventIds,
  }
}

/**
 * Check fraud signals before processing a deposit
 */
export async function checkDepositFraud(
  userId: string,
  amount: number,
  paymentMethod: string
): Promise<FraudCheckResult> {
  const patterns: BettingPattern[] = []
  const fraudEventIds: string[] = []

  const factors = await collectUserRiskFactors(userId)
  const baseScore = calculateBaseRiskScore(factors)

  // Get recent transactions for pattern detection
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: {
      transactionType: true,
      amount: true,
      status: true,
      createdAt: true,
    },
  })

  // Check for money laundering patterns
  const mlPattern = detectMoneyLaundering(
    recentTransactions.map(t => ({
      type: t.transactionType as 'deposit' | 'withdrawal',
      amount: Number(t.amount),
      timestamp: t.createdAt,
    }))
  )
  if (mlPattern) {
    patterns.push(mlPattern)
    const eventId = await saveFraudEvent({
      userId,
      eventType: 'money_laundering',
      severity: getSeverityFromRiskScore(mlPattern.riskScore),
      riskScore: mlPattern.riskScore,
      description: 'Suspicious deposit/withdrawal pattern detected',
      metadata: mlPattern.patternDetails,
    })
    fraudEventIds.push(eventId)
  }

  const actionScore = calculateActionRiskScore('deposit', factors, baseScore)
  const riskLevel = getRiskLevel(actionScore)
  const recommendation = getRecommendedAction(actionScore)

  await prisma.user.update({
    where: { id: userId },
    data: { riskScore: Math.max(factors.failedPaymentAttempts ?? 0, actionScore) },
  })

  return {
    allowed: recommendation.action !== 'suspend' && recommendation.action !== 'block',
    riskScore: actionScore,
    riskLevel,
    action: recommendation.action,
    message: recommendation.message,
    patterns,
    fraudEventIds,
  }
}

/**
 * Check fraud signals before processing a withdrawal
 */
export async function checkWithdrawalFraud(
  userId: string,
  amount: number
): Promise<FraudCheckResult> {
  const patterns: BettingPattern[] = []
  const fraudEventIds: string[] = []

  const factors = await collectUserRiskFactors(userId)
  const baseScore = calculateBaseRiskScore(factors)

  // Get recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: {
      transactionType: true,
      amount: true,
      createdAt: true,
    },
  })

  // Check for money laundering
  const mlPattern = detectMoneyLaundering(
    recentTransactions.map(t => ({
      type: t.transactionType as 'deposit' | 'withdrawal',
      amount: Number(t.amount),
      timestamp: t.createdAt,
    }))
  )
  if (mlPattern) {
    patterns.push(mlPattern)
    const eventId = await saveFraudEvent({
      userId,
      eventType: 'money_laundering',
      severity: getSeverityFromRiskScore(mlPattern.riskScore),
      riskScore: mlPattern.riskScore,
      description: 'Suspicious withdrawal pattern detected',
      metadata: mlPattern.patternDetails,
    })
    fraudEventIds.push(eventId)
  }

  // Check for withdrawal without betting (possible money pass-through)
  if (factors.totalBets === 0 || (factors.totalBets && factors.totalBets < 3)) {
    const pattern: BettingPattern = {
      patternType: 'money_laundering',
      patternDetails: {
        reason: 'Withdrawal with minimal betting activity',
        totalBets: factors.totalBets,
        withdrawalAmount: amount,
      },
      riskScore: 60,
    }
    patterns.push(pattern)
    const eventId = await saveFraudEvent({
      userId,
      eventType: 'money_laundering',
      severity: 'high',
      riskScore: 60,
      description: `Withdrawal of $${amount} with only ${factors.totalBets} bets placed`,
      metadata: pattern.patternDetails,
    })
    fraudEventIds.push(eventId)
  }

  const actionScore = calculateActionRiskScore('withdrawal', factors, baseScore)
  const riskLevel = getRiskLevel(actionScore)
  const recommendation = getRecommendedAction(actionScore)

  await prisma.user.update({
    where: { id: userId },
    data: { riskScore: actionScore },
  })

  return {
    allowed: recommendation.action !== 'suspend' && recommendation.action !== 'block',
    riskScore: actionScore,
    riskLevel,
    action: recommendation.action,
    message: recommendation.message,
    patterns,
    fraudEventIds,
  }
}

/**
 * Check for account takeover during login
 */
export async function checkLoginFraud(
  userId: string,
  deviceFingerprint: string,
  ipAddressHash: string,
  country?: string
): Promise<FraudCheckResult> {
  const patterns: BettingPattern[] = []
  const fraudEventIds: string[] = []

  // Get known devices and IPs for this user
  const knownSessions = await prisma.userSession.findMany({
    where: { userId },
    select: { deviceFingerprint: true, ipAddressHash: true },
  })

  const knownDevices = knownSessions.map(s => s.deviceFingerprint)
  const knownIPs = knownSessions.map(s => s.ipAddressHash)

  // Check for account takeover pattern
  const takeoverPattern = detectAccountTakeover(
    {
      deviceFingerprint,
      ipAddressHash,
      country,
      timestamp: new Date(),
    },
    knownDevices,
    knownIPs,
    0, // No bets yet on this login
    30
  )

  if (takeoverPattern) {
    patterns.push(takeoverPattern)
    const eventId = await saveFraudEvent({
      userId,
      eventType: 'account_takeover',
      severity: getSeverityFromRiskScore(takeoverPattern.riskScore),
      riskScore: takeoverPattern.riskScore,
      description: 'Login from unknown device/location',
      metadata: {
        ...takeoverPattern.patternDetails,
        deviceFingerprint,
        ipAddressHash,
        country,
      },
    })
    fraudEventIds.push(eventId)
  }

  const factors = await collectUserRiskFactors(userId)
  const baseScore = calculateBaseRiskScore(factors)
  const actionScore = calculateActionRiskScore('login', factors, baseScore)
  const riskLevel = getRiskLevel(actionScore)
  const recommendation = getRecommendedAction(actionScore)

  return {
    allowed: recommendation.action !== 'suspend' && recommendation.action !== 'block',
    riskScore: actionScore,
    riskLevel,
    action: recommendation.action,
    message: recommendation.message,
    patterns,
    fraudEventIds,
  }
}

