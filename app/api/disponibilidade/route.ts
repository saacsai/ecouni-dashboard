import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token obrigatório' }, { status: 400 })

  const sb = getSupabaseAdmin()

  const { data: fornecedor, error: fErr } = await sb
    .from('ecouni_fornecedores')
    .select('id, nome, token_portal')
    .eq('token_portal', token)
    .single()

  if (fErr || !fornecedor) {
    return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
  }

  const [{ data: produtos }, { data: disponibilidades }] = await Promise.all([
    sb.from('ecouni_fornecedor_produtos')
      .select('id, produto_id, prazo_pedido_dias, observacao_prazo, ecouni_produtos(id, nome, unidade, categoria)')
      .eq('fornecedor_id', fornecedor.id)
      .eq('ativo', true)
      .order('created_at'),
    sb.from('ecouni_disponibilidade')
      .select('produto_id, semana_ref, quantidade_cx, observacao')
      .eq('fornecedor_id', fornecedor.id),
  ])

  return NextResponse.json({
    fornecedor: { id: fornecedor.id, nome: fornecedor.nome },
    produtos: produtos ?? [],
    disponibilidades: disponibilidades ?? [],
  })
}

export async function POST(req: NextRequest) {
  const { token, itens } = await req.json()

  if (!token || !itens?.length) {
    return NextResponse.json({ error: 'token e itens são obrigatórios' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  const { data: fornecedor } = await sb
    .from('ecouni_fornecedores')
    .select('id')
    .eq('token_portal', token)
    .single()

  if (!fornecedor) {
    return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
  }

  // Valida que todos os produtos pertencem a este fornecedor
  const { data: vinculados } = await sb
    .from('ecouni_fornecedor_produtos')
    .select('produto_id')
    .eq('fornecedor_id', fornecedor.id)
    .eq('ativo', true)

  const vinculadosIds = new Set((vinculados ?? []).map(v => v.produto_id))
  const invalidos = itens.filter((i: { produto_id: string }) => !vinculadosIds.has(i.produto_id))
  if (invalidos.length > 0) {
    return NextResponse.json({ error: 'Produto não vinculado a este fornecedor' }, { status: 403 })
  }

  // Upsert: filtra itens com quantidade > 0 (remove os zerados)
  const payload = itens
    .filter((i: { quantidade_cx: number }) => i.quantidade_cx > 0)
    .map((i: { produto_id: string; semana_ref: string; quantidade_cx: number; observacao?: string }) => ({
      fornecedor_id:  fornecedor.id,
      produto_id:     i.produto_id,
      semana_ref:     i.semana_ref,
      quantidade_cx:  i.quantidade_cx,
      qtd_atacado:    0,
      qtd_ecouni:     0,
      observacao:     i.observacao || null,
      status:         'informado',
    }))

  if (payload.length > 0) {
    const { error } = await sb
      .from('ecouni_disponibilidade')
      .upsert(payload, { onConflict: 'fornecedor_id,produto_id,semana_ref' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Remove registros zerados (se cooperativa apagou uma entrada anterior)
  const zerados = itens.filter((i: { quantidade_cx: number }) => i.quantidade_cx === 0)
  for (const z of zerados as { produto_id: string; semana_ref: string }[]) {
    await sb.from('ecouni_disponibilidade')
      .delete()
      .eq('fornecedor_id', fornecedor.id)
      .eq('produto_id', z.produto_id)
      .eq('semana_ref', z.semana_ref)
      .eq('status', 'informado')
  }

  return NextResponse.json({ ok: true, salvos: payload.length })
}
