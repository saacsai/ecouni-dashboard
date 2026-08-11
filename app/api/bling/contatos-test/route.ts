import { NextResponse } from 'next/server'
import { blingGet } from '@/lib/bling'

export async function GET() {
  const data = await blingGet('/contatos/18321387269')
  return NextResponse.json(data)
}
