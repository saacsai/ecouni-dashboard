import { NextResponse } from 'next/server'
import { blingGet } from '@/lib/bling'

export async function GET() {
  try {
    const data = await blingGet('/contatos?limite=1')
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
