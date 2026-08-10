import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { blingPost } from '@/lib/bling'

export async function POST(req: NextRequest) {
  const { nome, cpf, whatsapp, grupo_id } = await req.json()

  if (!nome || !cpf || !whatsapp || !grupo_id) {
    return NextResponse.json({ error: 'Campos obrigatórios: nome, cpf, whatsapp, grupo_id' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  // Verifica se CPF já cadastrado
  const { data: existente } = await sb
    .from('ecouni_participantes')
    .select('id')
    .eq('cpf', cpf.replace(/\D/g, ''))
    .single()

  if (existente) {
    return NextResponse.json({ error: 'CPF já cadastrado no sistema.' }, { status: 409 })
  }

  // Cria contato no Bling
  let bling_cliente_id: string | null = null
  let bling_error: string | null = null
  try {
    const blingRes = await blingPost('/contatos', {
      nome,
      numeroDocumento: cpf.replace(/\D/g, ''),
      celular: whatsapp.replace(/\D/g, ''),
      tipo: 'F',
      situacao: 'A',
    })
    bling_cliente_id = String(blingRes?.data?.id ?? '')
  } catch (e) {
    bling_error = e instanceof Error ? e.message : String(e)
    console.error('Bling contato error:', bling_error)
  }

  // Salva no Supabase
  const { data, error } = await sb.from('ecouni_participantes').insert({
    nome,
    cpf: cpf.replace(/\D/g, ''),
    whatsapp: whatsapp.replace(/\D/g, ''),
    grupo_id,
    bling_cliente_id,
    ativo: true,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, participante: data, bling_error })
}
