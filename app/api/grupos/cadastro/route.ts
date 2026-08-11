import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { nome, endereco_entrega, municipio, contato_nome, contato_whatsapp } = await req.json()

  if (!nome || !endereco_entrega || !municipio || !contato_nome || !contato_whatsapp) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  const whatsappDigits = contato_whatsapp.replace(/\D/g, '')

  const { data: existente } = await sb
    .from('ecouni_grupos')
    .select('id')
    .eq('contato_whatsapp', whatsappDigits)
    .single()

  if (existente) {
    return NextResponse.json({ error: 'WhatsApp já cadastrado para outro grupo.' }, { status: 409 })
  }

  const { data, error } = await sb.from('ecouni_grupos').insert({
    nome,
    endereco_entrega,
    municipio,
    contato_nome,
    contato_whatsapp: whatsappDigits,
    ativo: false,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, grupo: data })
}
