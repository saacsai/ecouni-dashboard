'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Ciclo, StatusPedido } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

const STATUS_CFG: Record<StatusPedido, { label: string; badge: string }> = {
  pendente:       { label: 'Pendente',       badge: 'bg-yellow-100 text-yellow-700' },
  aguardando_pix: { label: 'Aguard. PIX',    badge: 'bg-orange-100 text-orange-700' },
  pago:           { label: 'Pago',           badge: 'bg-green-100 text-green-700' },
  cancelado:      { label: 'Cancelado',      badge: 'bg-red-100 text-red-500' },
}

type ItemFull = {
  id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  ecouni_produtos: { nome: string; unidade: string; categoria: string } | null
}

type PedidoFull = {
  id: string
  ciclo_id: string
  funcionario_id: string
  status: StatusPedido
  valor_total: number
  slot_retirada: string | null
  created_at: string
  ecouni_funcionarios: {
    id: string
    nome: string
    whatsapp: string
    ecouni_grupos: { nome: string } | null
  } | null
  ecouni_pedidos_itens: ItemFull[]
}

type Aba = 'pedidos' | 'por_produto' | 'romaneio'

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PedidosPage() {
  const [ciclos,    setCiclos]    = useState<Ciclo[]>([])
  const [cicloId,   setCicloId]   = useState<string>('')
  const [pedidos,   setPedidos]   = useState<PedidoFull[]>([])
  const [loading,   setLoading]   = useState(false)
  const [aba,       setAba]       = useState<Aba>('pedidos')

  // Carrega ciclos na montagem
  useEffect(() => {
    getSupabase()
      .from('ecouni_ciclos')
      .select('*, ecouni_grupos(nome)')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const lista = (data as Ciclo[]) || []
        setCiclos(lista)
        if (lista.length > 0) setCicloId(lista[0].id)
      })
  }, [])

  // Carrega pedidos do ciclo selecionado
  useEffect(() => {
    if (!cicloId) return
    setLoading(true)
    getSupabase()
      .from('ecouni_pedidos')
      .select(`
        id, ciclo_id, funcionario_id, status, valor_total, slot_retirada, created_at,
        ecouni_funcionarios:funcionario_id ( id, nome, whatsapp, ecouni_grupos(nome) ),
        ecouni_pedidos_itens ( id, produto_id, quantidade, preco_unitario, ecouni_produtos(nome, unidade, categoria) )
      `)
      .eq('ciclo_id', cicloId)
      .neq('status', 'cancelado')
      .order('created_at')
      .then(({ data }) => {
        setPedidos((data as PedidoFull[]) || [])
        setLoading(false)
      })
  }, [cicloId])

  // Resumo por produto (para pré-turno e romaneio)
  const porProduto = useMemo(() => {
    const map = new Map<string, { nome: string; unidade: string; categoria: string; quantidade: number; pedidos: number }>()
    for (const p of pedidos) {
      for (const it of p.ecouni_pedidos_itens) {
        const prod = it.ecouni_produtos
        if (!prod) continue
        const entry = map.get(it.produto_id) ?? { nome: prod.nome, unidade: prod.unidade, categoria: prod.categoria, quantidade: 0, pedidos: 0 }
        entry.quantidade += it.quantidade
        entry.pedidos    += 1
        map.set(it.produto_id, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [pedidos])

  // KPIs
  const totalValor  = pedidos.reduce((s, p) => s + p.valor_total, 0)
  const pagos       = pedidos.filter(p => p.status === 'pago').length
  const pendentes   = pedidos.filter(p => p.status === 'pendente').length

  const cicloAtual = ciclos.find(c => c.id === cicloId)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Pedidos recebidos por ciclo</p>
        </div>

        {/* Seletor de ciclo */}
        <select
          value={cicloId}
          onChange={e => setCicloId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#1B5E37] bg-white max-w-xs"
        >
          {ciclos.length === 0 && <option>Nenhum ciclo</option>}
          {ciclos.map(c => (
            <option key={c.id} value={c.id}>
              {c.ecouni_grupos?.nome ?? '—'} · {c.semana_ref}
            </option>
          ))}
        </select>
      </div>

      {/* KPI cards */}
      {pedidos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total pedidos',  value: pedidos.length,         icon: '🛒', cor: 'text-gray-900' },
            { label: 'Valor total',    value: fmtBRL(totalValor),     icon: '💰', cor: 'text-gray-900' },
            { label: 'Pagos',          value: pagos,                  icon: '✅', cor: 'text-green-700' },
            { label: 'Pendentes',      value: pendentes,              icon: '⏳', cor: 'text-yellow-700' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-lg mb-1">{c.icon}</p>
              <p className={`text-xl font-bold ${c.cor}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { id: 'pedidos',     label: '🛒 Pedidos' },
          { id: 'por_produto', label: '📦 Por Produto' },
          { id: 'romaneio',    label: '🖨️ Romaneio' },
        ] as { id: Aba; label: string }[]).map(a => (
          <button key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              aba === a.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : pedidos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-500 text-sm">Nenhum pedido neste ciclo.</p>
          {!cicloId && <p className="text-gray-400 text-xs mt-1">Selecione um ciclo acima.</p>}
        </div>
      ) : (

        <>
          {/* ABA: Pedidos */}
          {aba === 'pedidos' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Participante</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Grupo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Itens</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.ecouni_funcionarios?.nome ?? '—'}</p>
                        <p className="text-xs text-gray-400">{p.ecouni_funcionarios?.whatsapp}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs hidden md:table-cell">
                        {p.ecouni_funcionarios?.ecouni_grupos?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {p.ecouni_pedidos_itens.map(it => (
                            <span key={it.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded px-1.5 py-0.5 text-xs">
                              {it.ecouni_produtos?.nome ?? '?'} ×{it.quantidade}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtBRL(p.valor_total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CFG[p.status].badge}`}>
                          {STATUS_CFG[p.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                        {p.slot_retirada ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA: Por Produto */}
          {aba === 'por_produto' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-500">Lista pré-turno — o que preparar antes da montagem</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porProduto.map(pp => (
                    <tr key={pp.nome} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{pp.nome}</p>
                        <p className="text-xs text-gray-400">{pp.categoria}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 text-xs">{pp.pedidos} pedidos</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-extrabold" style={{ color: PRIMARY }}>
                          {pp.quantidade}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{pp.unidade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA: Romaneio (linha de montagem) */}
          {aba === 'romaneio' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500">Linha de montagem — um pedido por vez</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: PRIMARY }}
                >
                  🖨️ Imprimir
                </button>
              </div>

              <div className="space-y-3 print:space-y-2">
                {/* Cabeçalho de impressão */}
                <div className="hidden print:block mb-4">
                  <p className="text-lg font-bold">EcoUni — Romaneio de Montagem</p>
                  <p className="text-sm text-gray-600">
                    {cicloAtual?.ecouni_grupos?.nome} · Semana {cicloAtual?.semana_ref}
                  </p>
                  <hr className="my-2" />
                </div>

                {pedidos.map((p, idx) => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 print:rounded-none print:border print:border-gray-300 print:p-3">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-bold text-gray-400 mr-2">#{String(idx + 1).padStart(3, '0')}</span>
                        <span className="font-semibold text-gray-900">{p.ecouni_funcionarios?.nome ?? '—'}</span>
                        <span className="text-xs text-gray-400 ml-2">{p.ecouni_funcionarios?.ecouni_grupos?.nome}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{fmtBRL(p.valor_total)}</p>
                        {p.slot_retirada && (
                          <p className="text-xs text-gray-400">{p.slot_retirada}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {p.ecouni_pedidos_itens
                        .sort((a, b) => (a.ecouni_produtos?.nome ?? '').localeCompare(b.ecouni_produtos?.nome ?? ''))
                        .map(it => (
                          <div key={it.id}
                            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 print:border-gray-400"
                          >
                            <span className="text-sm font-semibold text-gray-900">{it.quantidade}×</span>
                            <span className="text-sm text-gray-700">{it.ecouni_produtos?.nome ?? '—'}</span>
                            <span className="text-xs text-gray-400">{it.ecouni_produtos?.unidade}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
