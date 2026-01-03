/**
 * Financial Input Validation Schemas
 */

import { z } from 'zod'

/**
 * Payment method enum
 */
export const paymentMethodSchema = z.enum([
  'card',
  'bank',
  'paypal',
  'apple_pay',
  'google_pay',
  'crypto',
])

export type PaymentMethod = z.infer<typeof paymentMethodSchema>

/**
 * Deposit request schema
 */
export const depositSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(10, 'Minimum deposit is $10')
    .max(10000, 'Maximum deposit is $10,000'),
  paymentMethod: paymentMethodSchema,
  paymentMethodId: z.string().optional(), // ID of saved payment method
})

export type DepositInput = z.infer<typeof depositSchema>

/**
 * Withdrawal request schema
 */
export const withdrawalSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(20, 'Minimum withdrawal is $20')
    .max(50000, 'Maximum withdrawal is $50,000'),
  paymentMethod: paymentMethodSchema,
  paymentMethodId: z.string().optional(),
})

export type WithdrawalInput = z.infer<typeof withdrawalSchema>

/**
 * Add payment method schema
 */
export const addPaymentMethodSchema = z.object({
  type: paymentMethodSchema,
  // For cards
  cardNumber: z
    .string()
    .regex(/^\d{13,19}$/, 'Invalid card number')
    .optional(),
  expiryMonth: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional(),
  expiryYear: z
    .number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 20)
    .optional(),
  cvv: z
    .string()
    .regex(/^\d{3,4}$/, 'Invalid CVV')
    .optional(),
  // For bank accounts
  accountNumber: z.string().min(4).max(34).optional(),
  routingNumber: z.string().length(9, 'Routing number must be 9 digits').optional(),
  // Common
  nickname: z.string().max(50).optional(),
  isDefault: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.type === 'card') {
      return data.cardNumber && data.expiryMonth && data.expiryYear && data.cvv
    }
    if (data.type === 'bank') {
      return data.accountNumber && data.routingNumber
    }
    // Other methods might use external auth (PayPal, Apple Pay, etc.)
    return true
  },
  { message: 'Required fields missing for selected payment method' }
)

export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>

/**
 * Transfer between accounts schema
 */
export const transferSchema = z.object({
  fromAccountType: z.enum(['main', 'bonus', 'promo']),
  toAccountType: z.enum(['main', 'bonus', 'promo']),
  amount: z.number().positive('Amount must be positive').min(1),
}).refine(
  (data) => data.fromAccountType !== data.toAccountType,
  { message: 'Cannot transfer to the same account', path: ['toAccountType'] }
)

export type TransferInput = z.infer<typeof transferSchema>

