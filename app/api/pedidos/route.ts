import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { ciclo_id, token, itens } = await req.json()

  if (!ciclo_id || !itens || itens.length === 0) {
    return NextResponse.json({ error: 'ciclo_id e itens são obrigatórios' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  // Identifica participante pelo token_portal
  let participante_id: string | null = null
  if (token) {
    const { data: p } = await sb
      .from('ecouni_participantes')
      .select('id')
      .eq('token_portal', token)
      .single()
    participante_id = p?.id ?? null
  }

  // Calcula valor total
  const valor_total: number = itens.reduce(
    (sum: number, i: { quantidade: number; preco_unitario: number }) =>
      sum + i.quantidade * i.preco_unitario,
    0
  )

  // Verifica se já existe pedido pendente para este participante + ciclo
  if (participante_id) {
    const { data: existente } = await sb
      .from('ecouni_pedidos')
      .select('id')
      .eq('ciclo_id', ciclo_id)
      .eq('funcionario_id', participante_id)
      .in('status', ['pendente', 'aguardando_pix'])
      .single()

    if (existente) {
      // Remove itens antigos e substitui
      await sb.from('ecouni_pedidos_itens').delete().eq('pedido_id', existente.id)
      await sb.from('ecouni_pedidos').update({ valor_total, status: 'pendente' }).eq('id', existente.id)

      const novosItens = itens.map((i: { produto_id: string; quantidade: number; preco_unitario: number }) => ({
        pedido_id:      existente.id,
        produto_id:     i.produto_id,
        quantidade:     i.quantidade,
        preco_unitario: i.preco_unitario,
      }))
      await sb.from('ecouni_pedidos_itens').insert(novosItens)

      return NextResponse.json({ ok: true, pedido_id: existente.id, atualizado: true })
    }
  }

  // Cria novo pedido
  const pedidoPayload: Record<string, unknown> = {
    ciclo_id,
    status: 'pendente',
    valor_total,
    valor_minimo: 0,
  }
  if (participante_id) pedidoPayload.funcionario_id = participante_id

  const { data: pedido, error } = await sb
    .from('ecouni_pedidos')
    .insert(pedidoPayload)
    .select('id')
    .single()

  if (error || !pedido) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar pedido' }, { status: 500 })
  }

  const novosItens = itens.map((i: { produto_id: string; quantidade: number; preco_unitario: number }) => ({
    pedido_id:      pedido.id,
    produto_id:     i.produto_id,
    quantidade:     i.quantidade,
    preco_unitario: i.preco_unitario,
  }))

  const { error: itemsError } = await sb.from('ecouni_pedidos_itens').insert(novosItens)

  if (itemsError) {
    // Rollback manual: remove o pedido criado
    await sb.from('ecouni_pedidos').delete().eq('id', pedido.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, pedido_id: pedido.id })
}
