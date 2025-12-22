/**
 * GDPR Data Export Functionality
 * 
 * Handles user data export requests for GDPR compliance
 */

import prisma from '../db/prisma'

export type ExportFormat = 'json' | 'csv'

export interface ExportData {
  user: any
  profile: any
  transactions: any[]
  bets: any[]
  activityLogs: any[]
  consents: any[]
  devices: any[]
}

/**
 * Export all user data for GDPR compliance
 * 
 * @param userId - User ID to export data for
 * @param format - Export format (json or csv)
 * @returns Exported data
 */
export async function exportUserData(
  userId: string,
  format: ExportFormat = 'json'
): Promise<ExportData> {
  // Fetch all user data
  const [user, profile, transactions, bets, activityLogs, consents, devices] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        accountStatus: true,
        kycVerified: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.userProfile.findUnique({
      where: { userId }
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.bet.findMany({
      where: { userId },
      include: {
        selections: {
          include: {
            selection: true
          }
        }
      },
      orderBy: { placedAt: 'desc' }
    }),
    prisma.accountActivityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit to recent activity
    }),
    prisma.gdprConsent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.deviceRegistry.findMany({
      where: { userId }
    })
  ])

  const exportData: ExportData = {
    user,
    profile,
    transactions,
    bets,
    activityLogs,
    consents,
    devices
  }

  if (format === 'csv') {
    return convertToCSV(exportData)
  }

  return exportData
}

/**
 * Convert export data to CSV format
 */
function convertToCSV(data: ExportData): any {
  // Simple CSV conversion - in production, use a proper CSV library
  const csvData: Record<string, string> = {}

  csvData['user'] = JSON.stringify(data.user)
  csvData['profile'] = JSON.stringify(data.profile)
  csvData['transactions'] = JSON.stringify(data.transactions)
  csvData['bets'] = JSON.stringify(data.bets)
  csvData['activity_logs'] = JSON.stringify(data.activityLogs)
  csvData['consents'] = JSON.stringify(data.consents)
  csvData['devices'] = JSON.stringify(data.devices)

  return csvData
}

/**
 * Create data export request record
 */
export async function createExportRequest(
  userId: string,
  format: ExportFormat = 'json'
): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

  const request = await prisma.dataExportRequest.create({
    data: {
      userId,
      exportFormat: format,
      status: 'pending',
      expiresAt
    }
  })

  return request.id
}

/**
 * Process export request and generate file
 */
export async function processExportRequest(requestId: string): Promise<string> {
  const request = await prisma.dataExportRequest.findUnique({
    where: { id: requestId },
    include: { user: true }
  })

  if (!request) {
    throw new Error('Export request not found')
  }

  if (request.status !== 'pending') {
    throw new Error('Export request already processed')
  }

  try {
    // Update status to processing
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: 'processing' }
    })

    // Export data
    const data = await exportUserData(request.userId, request.exportFormat as ExportFormat)

    // In production, save to secure storage (S3, etc.)
    const filePath = `/exports/${request.userId}/${requestId}.${request.exportFormat}`

    // Update request with file path and completed status
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        filePath,
        processedAt: new Date()
      }
    })

    return filePath
  } catch (error) {
    // Mark as failed
    await prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        status: 'failed',
        processedAt: new Date()
      }
    })
    throw error
  }
}

