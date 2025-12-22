/**
 * Risk scoring algorithms for fraud detection
 * 
 * Calculates risk scores based on various factors and patterns
 */

import { FraudEvent, FraudPatternType, FraudSeverity } from './detector'

export interface RiskFactors {
  accountAge?: number // Days
  totalBets?: number
  totalDeposits?: number
  totalWithdrawals?: number
  averageStake?: number
  maxStake?: number
  loginFrequency?: number // Logins per day
  deviceChanges?: number // Number of unique devices
  locationChanges?: number // Number of unique locations
  failedLoginAttempts?: number
  failedPaymentAttempts?: number
  bonusesClaimed?: number
  kycVerified?: boolean
  emailVerified?: boolean
  twoFactorEnabled?: boolean
}

/**
 * Calculate base risk score from user factors
 * 
 * @param factors - Risk factors for the user
 * @returns Base risk score (0-100)
 */
export function calculateBaseRiskScore(factors: RiskFactors): number {
  let score = 0

  // Account age - newer accounts are riskier
  if (factors.accountAge !== undefined) {
    if (factors.accountAge < 1) score += 20
    else if (factors.accountAge < 7) score += 15
    else if (factors.accountAge < 30) score += 10
    else if (factors.accountAge < 90) score += 5
  }

  // Verification status - unverified accounts are riskier
  if (!factors.emailVerified) score += 15
  if (!factors.kycVerified) score += 20
  if (!factors.twoFactorEnabled) score += 10

  // Betting patterns
  if (factors.totalBets !== undefined) {
    if (factors.totalBets === 0) score += 10 // No betting history
    else if (factors.totalBets < 5) score += 5
  }

  // Financial patterns
  if (factors.totalDeposits !== undefined) {
    if (factors.totalDeposits === 0) score += 5
  }

  // Security indicators
  if (factors.failedLoginAttempts && factors.failedLoginAttempts > 5) {
    score += Math.min(20, factors.failedLoginAttempts * 2)
  }

  if (factors.failedPaymentAttempts && factors.failedPaymentAttempts > 3) {
    score += Math.min(25, factors.failedPaymentAttempts * 5)
  }

  // Device and location changes
  if (factors.deviceChanges && factors.deviceChanges > 5) {
    score += Math.min(15, (factors.deviceChanges - 5) * 2)
  }

  if (factors.locationChanges && factors.locationChanges > 3) {
    score += Math.min(20, (factors.locationChanges - 3) * 5)
  }

  // Bonus abuse indicators
  if (factors.bonusesClaimed && factors.bonusesClaimed > 3) {
    score += Math.min(15, factors.bonusesClaimed * 3)
  }

  return Math.min(100, score)
}

/**
 * Calculate risk score for a specific action
 * 
 * @param actionType - Type of action being performed
 * @param factors - Risk factors
 * @param baseScore - Base risk score
 * @returns Action-specific risk score
 */
export function calculateActionRiskScore(
  actionType: 'bet' | 'deposit' | 'withdrawal' | 'login',
  factors: RiskFactors,
  baseScore: number
): number {
  let actionScore = baseScore

  switch (actionType) {
    case 'bet':
      // Check for unusual betting patterns
      if (factors.averageStake && factors.maxStake) {
        const stakeRatio = factors.maxStake / factors.averageStake
        if (stakeRatio > 5) {
          actionScore += 20
        } else if (stakeRatio > 3) {
          actionScore += 10
        }
      }
      break

    case 'deposit':
      // Large deposits are riskier
      if (factors.totalDeposits && factors.totalDeposits > 10000) {
        actionScore += 15
      }
      break

    case 'withdrawal':
      // Withdrawals without betting history are riskier
      if (factors.totalBets === 0 || (factors.totalBets && factors.totalBets < 5)) {
        actionScore += 25
      }
      // Large withdrawals are riskier
      if (factors.totalWithdrawals && factors.totalWithdrawals > 5000) {
        actionScore += 15
      }
      break

    case 'login':
      // Login from new device/location is riskier
      if (factors.deviceChanges && factors.deviceChanges > 0) {
        actionScore += 10
      }
      if (factors.locationChanges && factors.locationChanges > 0) {
        actionScore += 15
      }
      break
  }

  return Math.min(100, actionScore)
}

/**
 * Adjust risk score based on fraud events
 * 
 * @param baseScore - Base risk score
 * @param fraudEvents - Recent fraud events
 * @returns Adjusted risk score
 */
export function adjustRiskScoreFromEvents(
  baseScore: number,
  fraudEvents: FraudEvent[]
): number {
  if (fraudEvents.length === 0) {
    return baseScore
  }

  // Calculate weighted average of fraud event risk scores
  const severityMultipliers: Record<FraudSeverity, number> = {
    low: 0.1,
    medium: 0.3,
    high: 0.6,
    critical: 1.0
  }

  let totalWeightedScore = baseScore
  let totalWeight = 1

  for (const event of fraudEvents) {
    const multiplier = severityMultipliers[event.severity]
    totalWeightedScore += event.riskScore * multiplier
    totalWeight += multiplier
  }

  const adjustedScore = totalWeightedScore / totalWeight
  return Math.min(100, Math.round(adjustedScore))
}

/**
 * Determine risk level from risk score
 */
export function getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 81) return 'critical'
  if (riskScore >= 61) return 'high'
  if (riskScore >= 31) return 'medium'
  return 'low'
}

/**
 * Get recommended action based on risk score
 */
export function getRecommendedAction(riskScore: number): {
  action: 'monitor' | 'flag' | 'verify' | 'suspend' | 'block'
  message: string
} {
  if (riskScore >= 81) {
    return {
      action: 'suspend',
      message: 'Account suspended - requires manual review'
    }
  }
  if (riskScore >= 61) {
    return {
      action: 'verify',
      message: 'Additional verification required'
    }
  }
  if (riskScore >= 31) {
    return {
      action: 'flag',
      message: 'Account flagged for review'
    }
  }
  return {
    action: 'monitor',
    message: 'Account under normal monitoring'
  }
}

