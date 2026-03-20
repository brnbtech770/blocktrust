import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  const key = process.env.RESEND_API_KEY
  const keyPrefix = key?.substring(0, 10) || 'MISSING'

  if (!key) {
    return NextResponse.json({ status: 'NO_KEY', keyPrefix })
  }

  try {
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from: 'BlockTrust <noreply@blocktrust.tech>',
      to: ['brnbtech@gmail.com'],
      subject: '[DEBUG PROD] Test email - ' + new Date().toISOString(),
      html: '<p>Test direct depuis la route /api/debug-email en prod</p>',
    })

    return NextResponse.json({
      status: error ? 'RESEND_ERROR' : 'SENT',
      keyPrefix,
      data,
      error,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      status: 'EXCEPTION',
      keyPrefix,
      error: String(err),
    })
  }
}
