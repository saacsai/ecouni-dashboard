import { NextResponse } from 'next/server'
import { blingPatch } from '@/lib/bling'

export async function GET() {
  try {
    const data = await blingPatch('/contatos/18321422108', {
      tiposContato: [{ descricao: 'Cliente' }],
    })
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
