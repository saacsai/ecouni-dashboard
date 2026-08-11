import { NextResponse } from 'next/server'
import { blingPost, blingGet } from '@/lib/bling'

export async function GET() {
  try {
    await blingPost('/contatos/18321422108/tipos', { id: 14584534176 })
    const confirmado = await blingGet('/contatos/18321422108/tipos')
    return NextResponse.json({ ok: true, tiposContato: confirmado.data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
