import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

// Simple in-memory queue to prevent concurrent syncs
let isSyncing = false
let lastSyncTime: Date | null = null
const syncQueue: string[] = []

export async function POST(request: NextRequest) {
  try {
    const { accountId, days = 3 } = await request.json()
    
    // Check if a sync is already running
    if (isSyncing) {
      return NextResponse.json(
        { 
          error: 'Sync already in progress',
          message: 'Another sync operation is currently running. Please wait.',
          status: 'busy'
        },
        { status: 429 }
      )
    }
    
    // Rate limiting: Allow sync only once per minute
    if (lastSyncTime) {
      const timeSinceLastSync = Date.now() - lastSyncTime.getTime()
      if (timeSinceLastSync < 60000) { // 1 minute
        const waitTime = Math.ceil((60000 - timeSinceLastSync) / 1000)
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: `Please wait ${waitTime} seconds before syncing again.`,
            status: 'rate_limited',
            retryAfter: waitTime
          },
          { status: 429 }
        )
      }
    }
    
    // Mark as syncing
    isSyncing = true
    lastSyncTime = new Date()
    
    try {
      // Since this runs from the dashboard directory on Render, go up one level to project root
      const projectRoot = path.resolve(process.cwd(), '..')

      // Execute the ETL sync script with specified days
      const command = `cd "${projectRoot}" && node run-standardized-etl.js --days ${days}`
      
      console.log(`Executing sync command: ${command}`)
      
      // Set a timeout of 5 minutes for the sync operation
      const { stdout, stderr } = await Promise.race([
        execAsync(command, { 
          timeout: 300000, // 5 minutes
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Sync timeout')), 300000)
        )
      ])
      
      if (stderr && !stderr.includes('Warning')) {
        console.error('Sync stderr:', stderr)
      }
      
      console.log('Sync completed successfully')
      
      return NextResponse.json({
        success: true,
        message: 'Data sync completed successfully',
        timestamp: new Date().toISOString(),
        details: {
          daysSync: days,
          accountId: accountId || 'all',
          output: stdout.substring(0, 1000) // First 1000 chars of output
        }
      })
      
    } catch (syncError: any) {
      console.error('Sync execution error:', syncError)
      
      if (syncError.message === 'Sync timeout') {
        return NextResponse.json(
          { 
            error: 'Sync timeout',
            message: 'The sync operation took too long and was cancelled.',
            status: 'timeout'
          },
          { status: 504 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Sync failed',
          message: syncError.message || 'An error occurred during sync',
          status: 'error'
        },
        { status: 500 }
      )
    } finally {
      // Reset syncing flag
      isSyncing = false
    }
    
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        error: 'Invalid request',
        message: error.message || 'Failed to process sync request'
      },
      { status: 400 }
    )
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    isSyncing,
    lastSyncTime: lastSyncTime?.toISOString() || null,
    canSync: !isSyncing && (!lastSyncTime || (Date.now() - lastSyncTime.getTime() > 60000))
  })
}