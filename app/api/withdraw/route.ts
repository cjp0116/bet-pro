/**
 * Withdrawal API
 * 
 * Processes withdrawals with fraud detection checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { checkWithdrawalFraud } from '@/lib/fraud/fraud-service';
import { parseBody, withdrawalSchema } from '@/lib/input-validation';
import { Prisma } from '@/lib/generated/prisma/client';

const Decimal = Prisma.Decimal;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to make a withdrawal' },
        { status: 401 }
      );
    }

    // Validate input with Zod
    const parsed = await parseBody(req, withdrawalSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { amount, paymentMethod } = parsed.data;
    const userId = session.user.id;

    // Check user's balance
    const account = await prisma.financialAccount.findUnique({
      where: { userId_accountType: { userId, accountType: 'main' } },
    });

    if (!account || Number(account.availableBalance) < amount) {
      return NextResponse.json(
        { error: 'Insufficient funds', message: 'Your available balance is too low' },
        { status: 400 }
      );
    }

    // Check KYC verification status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycVerified: true, kycLevel: true },
    });

    if (!user?.kycVerified) {
      return NextResponse.json(
        {
          error: 'Verification required',
          message: 'Please complete identity verification before withdrawing',
          action: 'verify_identity',
        },
        { status: 403 }
      );
    }

    // Run fraud detection checks
    const fraudCheck = await checkWithdrawalFraud(userId, amount);

    if (!fraudCheck.allowed) {
      console.log(`[Withdrawal] Fraud check blocked withdrawal for user ${userId}:`, fraudCheck);
      return NextResponse.json(
        {
          error: 'Withdrawal blocked',
          message: fraudCheck.message,
          riskLevel: fraudCheck.riskLevel,
        },
        { status: 403 }
      );
    }

    // Additional verification for high-risk withdrawals
    if (fraudCheck.action === 'verify') {
      console.warn(`[Withdrawal] High-risk withdrawal flagged for user ${userId}:`, {
        riskScore: fraudCheck.riskScore,
        amount,
        patterns: fraudCheck.patterns.map(p => p.patternType),
      });

      // For high amounts or high risk, you might require manual approval
      if (amount > 5000 || fraudCheck.riskScore >= 60) {
        return NextResponse.json(
          {
            error: 'Manual review required',
            message: 'Your withdrawal request requires manual review. Please allow 24-48 hours.',
            status: 'pending_review',
          },
          { status: 202 } // Accepted but not processed yet
        );
      }
    }

    // Process withdrawal
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Deduct from available balance
      const updatedAccount = await tx.financialAccount.update({
        where: { id: account.id },
        data: {
          availableBalance: { decrement: amount },
          lockedBalance: { increment: amount }, // Lock until processed
          lastTransactionAt: new Date(),
        },
      });

      // Create transaction record (pending until processed)
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          transactionType: 'withdrawal',
          amount: new Decimal(-amount), // Negative for debit
          balanceBefore: account.balance,
          balanceAfter: updatedAccount.balance,
          status: 'pending',
          description: `Withdrawal to ${paymentMethod}`,
        },
      });

      // Create withdrawal record
      const withdrawalRecord = await tx.withdrawal.create({
        data: {
          transactionId: transaction.id,
          paymentGateway: paymentMethod,
          status: 'pending',
        },
      });

      return { transaction, withdrawalRecord };
    });

    return NextResponse.json({
      success: true,
      transactionId: withdrawal.transaction.id,
      amount,
      status: 'pending',
      estimatedProcessingTime: '1-3 business days',
      message: 'Withdrawal request submitted successfully',
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to process withdrawal. Please try again.' },
      { status: 500 }
    );
  }
}

