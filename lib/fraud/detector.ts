/**
 * Fraud detection service with pattern recognition and risk scoring
 * 
 * Detects suspicious betting patterns and account activity
 */

export type FraudPatternType =
  | 'rapid_betting'
  | 'unusual_stake_size'
  | 'arbitrage_detection'
  | 'account_takeover'
  | 'payment_fraud'
  | 'bonus_abuse'
  | 'money_laundering'
  | 'suspicious_location'
  | 'device_change'

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface FraudEvent {
  userId?: string
  eventType: FraudPatternType
  severity: FraudSeverity
  riskScore: number // 0-100
  description: string
  metadata?: Record<string, any>
}

export interface BettingPattern {
  patternType: FraudPatternType
  patternDetails: Record<string, any>
  riskScore: number
}

/**
 * Detect rapid betting pattern
 * Multiple bets placed in a short time window
 */
export function detectRapidBetting(
  bets: Array<{ placedAt: Date; stake: number }>,
  timeWindowMinutes: number = 5,
  threshold: number = 10
): BettingPattern | null {
  if (bets.length < threshold) {
    return null
  }

  // Sort bets by time
  const sortedBets = [...bets].sort((a, b) =>
    a.placedAt.getTime() - b.placedAt.getTime()
  )

  // Check for rapid betting in time windows
  for (let i = 0; i <= sortedBets.length - threshold; i++) {
    const windowStart = sortedBets[i].placedAt
    const windowEnd = new Date(windowStart.getTime() + timeWindowMinutes * 60 * 1000)

    const betsInWindow = sortedBets.filter(
      bet => bet.placedAt >= windowStart && bet.placedAt <= windowEnd
    )

    if (betsInWindow.length >= threshold) {
      const totalStake = betsInWindow.reduce((sum, bet) => sum + bet.stake, 0)

      return {
        patternType: 'rapid_betting',
        patternDetails: {
          betsCount: betsInWindow.length,
          timeWindowMinutes,
          totalStake,
          startTime: windowStart.toISOString(),
          endTime: windowEnd.toISOString()
        },
        riskScore: Math.min(100, betsInWindow.length * 8) // Higher risk with more bets
      }
    }
  }

  return null
}

/**
 * Detect unusual stake sizes
 * Stakes significantly higher than user's average
 */
export function detectUnusualStakeSize(
  currentStake: number,
  userAverageStake: number,
  userMaxStake: number,
  thresholdMultiplier: number = 3
): BettingPattern | null {
  if (userAverageStake === 0) {
    return null // Not enough data
  }

  const stakeRatio = currentStake / userAverageStake

  if (stakeRatio >= thresholdMultiplier) {
    return {
      patternType: 'unusual_stake_size',
      patternDetails: {
        currentStake,
        userAverageStake,
        userMaxStake,
        stakeRatio: stakeRatio.toFixed(2),
        thresholdMultiplier
      },
      riskScore: Math.min(100, Math.round(stakeRatio * 15))
    }
  }

  return null
}

/**
 * Detect arbitrage betting
 * User betting on both sides of the same market
 */
export function detectArbitrage(
  bets: Array<{
    gameId: string
    marketId: string
    selectionId: string
    stake: number
    placedAt: Date
  }>,
  timeWindowMinutes: number = 60
): BettingPattern | null {
  // Group bets by market
  const betsByMarket = new Map<string, typeof bets>()

  for (const bet of bets) {
    const key = `${bet.gameId}:${bet.marketId}`
    if (!betsByMarket.has(key)) {
      betsByMarket.set(key, [])
    }
    betsByMarket.get(key)!.push(bet)
  }

  // Check for opposite bets on same market
  for (const [marketKey, marketBets] of betsByMarket) {
    if (marketBets.length < 2) continue

    // Check if bets are within time window
    const sortedBets = marketBets.sort((a, b) =>
      a.placedAt.getTime() - b.placedAt.getTime()
    )

    for (let i = 0; i < sortedBets.length; i++) {
      for (let j = i + 1; j < sortedBets.length; j++) {
        const timeDiff = sortedBets[j].placedAt.getTime() - sortedBets[i].placedAt.getTime()
        const timeDiffMinutes = timeDiff / (60 * 1000)

        if (timeDiffMinutes <= timeWindowMinutes) {
          // Check if selections are different (opposite sides)
          if (sortedBets[i].selectionId !== sortedBets[j].selectionId) {
            return {
              patternType: 'arbitrage_detection',
              patternDetails: {
                marketKey,
                bet1: {
                  selectionId: sortedBets[i].selectionId,
                  stake: sortedBets[i].stake,
                  placedAt: sortedBets[i].placedAt.toISOString()
                },
                bet2: {
                  selectionId: sortedBets[j].selectionId,
                  stake: sortedBets[j].stake,
                  placedAt: sortedBets[j].placedAt.toISOString()
                },
                timeDiffMinutes: timeDiffMinutes.toFixed(2)
              },
              riskScore: 85 // High risk for arbitrage
            }
          }
        }
      }
    }
  }

  return null
}

/**
 * Detect account takeover pattern
 * Login from new device/location followed by immediate betting
 */
export function detectAccountTakeover(
  loginActivity: {
    deviceFingerprint: string
    ipAddressHash: string
    country?: string
    timestamp: Date
  },
  knownDevices: string[],
  knownIPs: string[],
  betsAfterLogin: number,
  timeWindowMinutes: number = 30
): BettingPattern | null {
  const isNewDevice = !knownDevices.includes(loginActivity.deviceFingerprint)
  const isNewIP = !knownIPs.includes(loginActivity.ipAddressHash)
  const hasImmediateBetting = betsAfterLogin > 0

  if ((isNewDevice || isNewIP) && hasImmediateBetting) {
    return {
      patternType: 'account_takeover',
      patternDetails: {
        isNewDevice,
        isNewIP,
        betsAfterLogin,
        country: loginActivity.country,
        timeWindowMinutes
      },
      riskScore: isNewDevice && isNewIP ? 90 : 70
    }
  }

  return null
}

/**
 * Detect payment fraud patterns
 * Multiple failed payment attempts, chargeback patterns
 */
export function detectPaymentFraud(
  paymentAttempts: Array<{
    success: boolean
    amount: number
    timestamp: Date
    method: string
  }>,
  timeWindowHours: number = 24,
  failedAttemptThreshold: number = 3
): BettingPattern | null {
  const recentAttempts = paymentAttempts.filter(
    attempt => {
      const hoursAgo = (Date.now() - attempt.timestamp.getTime()) / (1000 * 60 * 60)
      return hoursAgo <= timeWindowHours
    }
  )

  const failedAttempts = recentAttempts.filter(attempt => !attempt.success)

  if (failedAttempts.length >= failedAttemptThreshold) {
    const totalFailedAmount = failedAttempts.reduce((sum, attempt) => sum + attempt.amount, 0)

    return {
      patternType: 'payment_fraud',
      patternDetails: {
        failedAttempts: failedAttempts.length,
        totalFailedAmount,
        timeWindowHours,
        methods: [...new Set(failedAttempts.map(a => a.method))]
      },
      riskScore: Math.min(100, failedAttempts.length * 25)
    }
  }

  return null
}

/**
 * Detect bonus abuse
 * Multiple accounts, rapid bonus claiming
 */
export function detectBonusAbuse(
  bonusesClaimed: number,
  accountAgeDays: number,
  totalDeposits: number,
  timeWindowDays: number = 7
): BettingPattern | null {
  // New account with multiple bonuses
  if (accountAgeDays < 7 && bonusesClaimed >= 3) {
    return {
      patternType: 'bonus_abuse',
      patternDetails: {
        bonusesClaimed,
        accountAgeDays,
        totalDeposits,
        timeWindowDays
      },
      riskScore: Math.min(100, bonusesClaimed * 20)
    }
  }

  return null
}

/**
 * Detect money laundering patterns
 * Circular transactions, unusual deposit/withdrawal patterns
 */
export function detectMoneyLaundering(
  transactions: Array<{
    type: 'deposit' | 'withdrawal'
    amount: number
    timestamp: Date
  }>,
  timeWindowDays: number = 7
): BettingPattern | null {
  const recentTransactions = transactions.filter(
    txn => {
      const daysAgo = (Date.now() - txn.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo <= timeWindowDays
    }
  )

  const deposits = recentTransactions.filter(t => t.type === 'deposit')
  const withdrawals = recentTransactions.filter(t => t.type === 'withdrawal')

  // Check for rapid deposit/withdrawal cycles
  if (deposits.length >= 3 && withdrawals.length >= 3) {
    const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0)
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0)

    // If user deposits and withdraws similar amounts quickly
    const withdrawalRatio = totalWithdrawn / totalDeposited

    if (withdrawalRatio > 0.8 && withdrawalRatio < 1.2) {
      return {
        patternType: 'money_laundering',
        patternDetails: {
          depositsCount: deposits.length,
          withdrawalsCount: withdrawals.length,
          totalDeposited,
          totalWithdrawn,
          withdrawalRatio: withdrawalRatio.toFixed(2),
          timeWindowDays
        },
        riskScore: 80
      }
    }
  }

  return null
}

/**
 * Calculate overall risk score for a user
 * 
 * @param fraudEvents - Array of fraud events
 * @returns Risk score (0-100)
 */
export function calculateRiskScore(fraudEvents: FraudEvent[]): number {
  if (fraudEvents.length === 0) {
    return 0
  }

  // Weight events by severity
  const severityWeights: Record<FraudSeverity, number> = {
    low: 1,
    medium: 2,
    high: 4,
    critical: 8
  }

  let totalWeightedScore = 0
  let totalWeight = 0

  for (const event of fraudEvents) {
    const weight = severityWeights[event.severity]
    totalWeightedScore += event.riskScore * weight
    totalWeight += weight
  }

  // Average weighted score, capped at 100
  const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0
  return Math.min(100, Math.round(averageScore))
}

/**
 * Determine severity based on risk score
 */
export function getSeverityFromRiskScore(riskScore: number): FraudSeverity {
  if (riskScore >= 81) return 'critical'
  if (riskScore >= 61) return 'high'
  if (riskScore >= 31) return 'medium'
  return 'low'
}

