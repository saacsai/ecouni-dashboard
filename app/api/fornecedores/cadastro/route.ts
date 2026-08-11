import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { blingPost, blingPatch } from '@/lib/bling'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    cnpj_cpf,
    nome,
    contato_nome,
    whatsapp,
    email,
    municipio,
    uf,
    inscricao_estadual,
    numero_caf,
    tipos_produto,
  } = body

  if (!cnpj_cpf || !nome || !contato_nome || !whatsapp || !municipio || !uf || !tipos_produto?.length) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: documento, nome, contato, whatsapp, município, UF e tipo de produto.' },
      { status: 400 },
    )
  }

  const sb = getSupabaseAdmin()
  const docDigits  = cnpj_cpf.replace(/\D/g, '')
  const whatsDigits = whatsapp.replace(/\D/g, '')
  const isCNPJ = docDigits.length === 14

  // Duplicate check: whatsapp OR cnpj_cpf
  const { data: existente } = await sb
    .from('ecouni_fornecedores')
    .select('id')
    .or(`whatsapp.eq.${whatsDigits},cnpj_cpf.eq.${docDigits}`)
    .maybeSingle()

  if (existente) {
    return NextResponse.json(
      { error: 'WhatsApp ou documento já cadastrado para outro fornecedor.' },
      { status: 409 },
    )
  }

  // Cria contato no Bling
  let bling_fornecedor_id: string | null = null
  try {
    const blingBody: Record<string, unknown> = {
      nome,
      numeroDocumento: docDigits,
      celular: whatsDigits,
      tipo: isCNPJ ? 'J' : 'F',
      situacao: 'A',
      tiposContato: [{ descricao: 'Fornecedor' }],
    }
    if (email) blingBody.email = email

    const blingRes = await blingPost('/contatos', blingBody)
    bling_fornecedor_id = String(blingRes?.data?.id ?? '')
    if (bling_fornecedor_id) {
      await blingPatch(`/contatos/${bling_fornecedor_id}`, {
        tiposContato: [{ descricao: 'Fornecedor' }],
      })
    }
  } catch (e) {
    console.error('Bling contato error:', e)
  }

  const { data, error } = await sb
    .from('ecouni_fornecedores')
    .insert({
      nome,
      cnpj_cpf: docDigits,
      whatsapp: whatsDigits,
      contato_nome,
      email:              email || null,
      municipio,
      uf:                 uf.toUpperCase(),
      inscricao_estadual: inscricao_estadual || null,
      numero_caf:         numero_caf || null,
      tipos_produto:      tipos_produto,
      bling_fornecedor_id,
      ativo: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, fornecedor: data })
}
