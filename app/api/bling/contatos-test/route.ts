import { NextResponse } from 'next/server'
import { blingGet, blingPut } from '@/lib/bling'

export async function GET() {
  try {
    // Busca dados atuais do contato para enviar no PUT completo
    const atual = await blingGet('/contatos/18321422108')
    const c = atual.data

    await blingPut('/contatos/18321422108', {
      nome: c.nome,
      tipo: c.tipo,
      situacao: c.situacao,
      numeroDocumento: c.numeroDocumento,
      celular: c.celular,
      email: c.email,
      tiposContato: [{ descricao: 'Cliente' }],
    })
    // Confirma o que foi salvo
    const atualizado = await blingGet('/contatos/18321422108')
    return NextResponse.json({ ok: true, tiposContato: atualizado.data.tiposContato })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
