import { NextResponse } from 'next/server'
import { blingGet } from '@/lib/bling'

export async function GET() {
  try {
    // Tenta listar tipos disponíveis e tipos do contato
    const [tipos, contato] = await Promise.all([
      blingGet('/contatos/tipos').catch(e => ({ error: String(e) })),
      blingGet('/contatos/18321422108/tipos').catch(e => ({ error: String(e) })),
    ])
    return NextResponse.json({ tipos, contatoTipos: contato })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
