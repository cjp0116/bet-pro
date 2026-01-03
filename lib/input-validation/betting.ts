/**
 * Betting Input Validation Schemas
 */

import { z } from 'zod'

/**
 * Bet type enum
 */
export const betTypeSchema = z.enum(['single', 'parlay'])

/**
 * Market type enum
 */
export const marketTypeSchema = z.enum(['spread', 'moneyline', 'total'])

/**
 * Single bet selection schema
 */
export const betSelectionSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  type: marketTypeSchema,
  selection: z.string().min(1, 'Selection is required'), // 'home', 'away', 'over', 'under', or team name
  odds: z.number().int('Odds must be an integer').refine(
    (val) => val !== 0 && (val >= 100 || val <= -100),
    'Invalid American odds format'
  ),
  stake: z.number().min(1, 'Minimum stake is $1').optional(), // For single bets
  team: z.string().optional(),
  line: z.string().optional(),
})

export type BetSelection = z.infer<typeof betSelectionSchema>

/**
 * Place bet request schema
 */
export const placeBetSchema = z.object({
  betType: betTypeSchema,
  selections: z
    .array(betSelectionSchema)
    .min(1, 'At least one selection is required')
    .max(15, 'Maximum 15 selections allowed'),
  totalStake: z
    .number()
    .positive('Total stake must be positive')
    .min(1, 'Minimum stake is $1')
    .max(10000, 'Maximum stake is $10,000'),
  potentialPayout: z.number().positive('Potential payout must be positive'),
}).refine(
  (data) => {
    // Parlay must have 2+ selections
    if (data.betType === 'parlay' && data.selections.length < 2) {
      return false
    }
    return true
  },
  { message: 'Parlay bets require at least 2 selections', path: ['selections'] }
).refine(
  (data) => {
    // Single bets with multiple selections need individual stakes (min $1)
    if (data.betType === 'single' && data.selections.length > 1) {
      return data.selections.every((s) => s.stake && s.stake >= 1)
    }
    return true
  },
  { message: 'Each single bet selection requires a stake of at least $1', path: ['selections'] }
)

export type PlaceBetInput = z.infer<typeof placeBetSchema>

/**
 * Accept odds change schema (when odds have moved)
 */
export const acceptOddsChangeSchema = z.object({
  betType: betTypeSchema,
  selections: z.array(
    z.object({
      gameId: z.string().min(1),
      type: marketTypeSchema,
      selection: z.string().min(1),
      originalOdds: z.number().int(),
      currentOdds: z.number().int(),
      stake: z.number().min(1, 'Minimum stake is $1').optional(),
    })
  ).min(1),
  totalStake: z.number().positive().min(1).max(10000),
  acceptNewOdds: z.literal(true), // Must explicitly accept
})

export type AcceptOddsChangeInput = z.infer<typeof acceptOddsChangeSchema>

