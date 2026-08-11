import { NextResponse } from 'next/server'
import { blingGet, blingPut } from '@/lib/bling'

export async function GET() {
  try {
    // Busca dados atuais do contato para enviar no PUT completo
    const atual = await blingGet('/contatos/18321422108')
    const c = atual.data

    const data = await blingPut('/contatos/18321422108', {
      nome: c.nome,
      tipo: c.tipo,
      situacao: c.situacao,
      numeroDocumento: c.numeroDocumento,
      celular: c.celular,
      email: c.email,
      tiposContato: [{ descricao: 'Cliente' }],
    })
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
