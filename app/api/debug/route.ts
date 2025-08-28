import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  console.log('🔍 Debug endpoint called')
  
  try {
    const session = await getSession()
    console.log('Session data:', session)
    
    return NextResponse.json({
      authenticated: !!session?.user,
      user: session?.user || null,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: error.message,
      authenticated: false,
      timestamp: new Date().toISOString()
    })
  }
}
