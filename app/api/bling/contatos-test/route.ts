import { NextResponse } from 'next/server'
import { blingGet } from '@/lib/bling'

export async function GET() {
  const data = await blingGet('/contatos?limite=5')
  return NextResponse.json(data)
}
