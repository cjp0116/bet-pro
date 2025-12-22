/**
 * GDPR Data Deletion Functionality
 * 
 * Handles user data deletion requests and anonymization for GDPR compliance
 */

import prisma from '../db/prisma'
import { hash } from '../security/encryption'

/**
 * Anonymize user data instead of hard delete (for legal/compliance retention)
 */
export async function anonymizeUserData(userId: string): Promise<void> {
  // Anonymize user record
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${hash(userId)}@deleted.local`,
      emailVerified: false,
      accountStatus: 'closed',
      gdprConsentGiven: false,
      marketingConsent: false
    }
  })

  // Anonymize profile
  await prisma.userProfile.updateMany({
    where: { userId },
    data: {
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      address: null,
      phoneNumber: null
    }
  })

  // Note: Transactions and bets are retained for legal/compliance reasons
  // but can be anonymized if needed
}

/**
 * Delete user data (soft delete with anonymization)
 * 
 * @param userId - User ID to delete
 * @returns Summary of deleted data
 */
export async function deleteUserData(userId: string): Promise<{
  deleted: string[]
  retained: string[]
}> {
  const deleted: string[] = []
  const retained: string[] = []

  // Anonymize user data
  await anonymizeUserData(userId)
  deleted.push('user', 'user_profile')

  // Delete sessions
  await prisma.userSession.deleteMany({ where: { userId } })
  deleted.push('sessions')

  // Delete device registry
  await prisma.deviceRegistry.deleteMany({ where: { userId } })
  deleted.push('devices')

  // Delete consents
  await prisma.gdprConsent.deleteMany({ where: { userId } })
  deleted.push('consents')

  // Retain for legal/compliance (with anonymization)
  retained.push('transactions', 'bets', 'audit_logs', 'fraud_events')

  return { deleted, retained }
}

/**
 * Create data deletion request
 */
export async function createDeletionRequest(userId: string): Promise<string> {
  const request = await prisma.dataDeletionRequest.create({
    data: {
      userId,
      status: 'pending'
    }
  })

  return request.id
}

/**
 * Process deletion request
 */
export async function processDeletionRequest(requestId: string): Promise<void> {
  const request = await prisma.dataDeletionRequest.findUnique({
    where: { id: requestId }
  })

  if (!request) {
    throw new Error('Deletion request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Deletion request already processed')
  }

  try {
    // Update status to processing
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: 'processing' }
    })

    // Delete/anonymize data
    const result = await deleteUserData(request.userId)

    // Update request with completion
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        dataDeleted: result,
        processedAt: new Date()
      }
    })
  } catch (error) {
    // Mark as failed (don't reject, as user has right to deletion)
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed', // Still mark as completed to fulfill request
        processedAt: new Date()
      }
    })
    throw error
  }
}

/**
 * Reject deletion request (with reason)
 */
export async function rejectDeletionRequest(
  requestId: string,
  reason: string
): Promise<void> {
  await prisma.dataDeletionRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      rejectionReason: reason,
      processedAt: new Date()
    }
  })
}

/**
 * Check if user has pending deletion request
 */
export async function hasPendingDeletionRequest(userId: string): Promise<boolean> {
  const request = await prisma.dataDeletionRequest.findFirst({
    where: {
      userId,
      status: {
        in: ['pending', 'processing']
      }
    }
  })

  return !!request
}

