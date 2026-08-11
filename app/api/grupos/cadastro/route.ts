import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    nome,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    municipio,
    uf,
    dia_retirada,
    horario_retirada_inicio,
    contato_nome,
    contato_whatsapp,
    contato_email,
    status_formacao,
    qtd_participantes_estimada,
    acesso_restrito,
  } = body

  // Required fields validation
  if (
    !nome || !cep || !endereco || !numero || !municipio || !uf ||
    !dia_retirada || !horario_retirada_inicio ||
    !contato_nome || !contato_whatsapp || !contato_email || !status_formacao
  ) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  const whatsappDigits = contato_whatsapp.replace(/\D/g, '')

  // Duplicate check: whatsapp OR email
  const { data: existente } = await sb
    .from('ecouni_grupos')
    .select('id')
    .or(`contato_whatsapp.eq.${whatsappDigits},contato_email.eq.${contato_email}`)
    .maybeSingle()

  if (existente) {
    return NextResponse.json(
      { error: 'WhatsApp ou e-mail já cadastrado para outro grupo.' },
      { status: 409 },
    )
  }

  // Build endereco_entrega
  const endereco_entrega =
    `${endereco}, ${numero}` +
    (complemento ? `, ${complemento}` : '') +
    ' - ' +
    (bairro ? `${bairro}, ` : '') +
    `${municipio} - ${uf.toUpperCase()}`

  const { data, error } = await sb
    .from('ecouni_grupos')
    .insert({
      nome,
      endereco_entrega,
      municipio,
      uf: uf.toUpperCase(),
      contato_nome,
      contato_whatsapp: whatsappDigits,
      contato_email,
      dia_retirada,
      horario_retirada_inicio,
      status_formacao,
      qtd_participantes_estimada:
        status_formacao === 'formado' && qtd_participantes_estimada
          ? Number(qtd_participantes_estimada)
          : null,
      acesso_restrito: acesso_restrito === true,
      ativo: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, grupo: data })
}
