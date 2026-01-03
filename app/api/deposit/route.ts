/**
 * Deposit API
 * 
 * Processes deposits with fraud detection checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { checkDepositFraud } from '@/lib/fraud/fraud-service';
import { parseBody, depositSchema } from '@/lib/input-validation';
import { Prisma } from '@/lib/generated/prisma/client';

const Decimal = Prisma.Decimal;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to make a deposit' },
        { status: 401 }
      );
    }

    // Validate input with Zod
    const parsed = await parseBody(req, depositSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { amount, paymentMethod } = parsed.data;
    const userId = session.user.id;

    // Run fraud detection checks
    const fraudCheck = await checkDepositFraud(userId, amount, paymentMethod);

    if (!fraudCheck.allowed) {
      console.log(`[Deposit] Fraud check blocked deposit for user ${userId}:`, fraudCheck);
      return NextResponse.json(
        {
          error: 'Deposit blocked',
          message: fraudCheck.message,
          riskLevel: fraudCheck.riskLevel,
        },
        { status: 403 }
      );
    }

    // Log if additional verification is needed
    if (fraudCheck.action === 'verify') {
      console.warn(`[Deposit] Additional verification required for user ${userId}:`, {
        riskScore: fraudCheck.riskScore,
        amount,
      });
      // In production, you might redirect to KYC or require additional steps
    }

    // Get or create financial account
    let account = await prisma.financialAccount.findUnique({
      where: { userId_accountType: { userId, accountType: 'main' } },
    });

    if (!account) {
      account = await prisma.financialAccount.create({
        data: {
          userId,
          accountType: 'main',
          balance: new Decimal(0),
          availableBalance: new Decimal(0),
          currency: 'USD',
        },
      });
    }

    // Process deposit (in production, this would integrate with payment gateway)
    const deposit = await prisma.$transaction(async (tx) => {
      // Update balance
      const updatedAccount = await tx.financialAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: amount },
          availableBalance: { increment: amount },
          lastTransactionAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          transactionType: 'deposit',
          amount: new Decimal(amount),
          balanceBefore: account.balance,
          balanceAfter: updatedAccount.balance,
          status: 'completed',
          description: `Deposit via ${paymentMethod}`,
          processedAt: new Date(),
        },
      });

      // Create deposit record
      const depositRecord = await tx.deposit.create({
        data: {
          transactionId: transaction.id,
          paymentGateway: paymentMethod,
          status: 'completed',
        },
      });

      return { transaction, depositRecord, newBalance: updatedAccount.availableBalance };
    });

    return NextResponse.json({
      success: true,
      transactionId: deposit.transaction.id,
      amount,
      newBalance: Number(deposit.newBalance),
      message: 'Deposit successful',
    });

  } catch (error) {
    console.error('Error processing deposit:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to process deposit. Please try again.' },
      { status: 500 }
    );
  }
}

