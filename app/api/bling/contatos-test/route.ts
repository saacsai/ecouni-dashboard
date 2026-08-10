import { NextResponse } from 'next/server'
import { blingGet } from '@/lib/bling'

export async function GET() {
  try {
    const list = await blingGet('/contatos?limite=1')
    const id = list?.data?.[0]?.id
    if (!id) return NextResponse.json({ error: 'nenhum contato' })
    const detail = await blingGet(`/contatos/${id}`)
    return NextResponse.json(detail)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
