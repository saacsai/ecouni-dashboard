import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { nome, contato_nome, whatsapp, municipio, uf } = await req.json()

  if (!nome || !contato_nome || !whatsapp || !municipio || !uf) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: nome, contato_nome, whatsapp, municipio, uf' },
      { status: 400 },
    )
  }

  const sb = getSupabaseAdmin()
  const whatsappDigits = whatsapp.replace(/\D/g, '')

  // Verifica se WhatsApp já cadastrado
  const { data: existente } = await sb
    .from('ecouni_fornecedores')
    .select('id')
    .eq('whatsapp', whatsappDigits)
    .single()

  if (existente) {
    return NextResponse.json({ error: 'WhatsApp já cadastrado.' }, { status: 409 })
  }

  // Salva no Supabase
  const { data, error } = await sb.from('ecouni_fornecedores').insert({
    nome,
    whatsapp: whatsappDigits,
    municipio,
    uf: uf.toUpperCase(),
    ativo: true,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, fornecedor: data })
}
