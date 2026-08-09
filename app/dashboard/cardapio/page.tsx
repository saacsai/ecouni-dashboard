'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Disponibilidade, Cardapio } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

function proxSegunda(offset = 0): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + diff + offset * 7)
  return d.toISOString().split('T')[0]
}

function fmtSemana(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function CardapioPage() {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const semana = useMemo(() => proxSegunda(semanaOffset), [semanaOffset])

  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([])
  const [cardapio,         setCardapio]         = useState<Cardapio[]>([])
  const [loading,          setLoading]          = useState(true)
  const [publicando,       setPublicando]       = useState(false)

  async function carregar() {
    setLoading(true)
    const sb = getSupabase()
    const [{ data: disp }, { data: card }] = await Promise.all([
      sb.from('ecouni_disponibilidade')
        .select('*, ecouni_produtos(*), ecouni_fornecedores(*)')
        .eq('semana_ref', semana)
        .gt('qtd_ecouni', 0),
      sb.from('ecouni_cardapio')
        .select('*, ecouni_produtos(*)')
        .eq('semana_ref', semana),
    ])
    setDisponibilidades((disp as Disponibilidade[]) || [])
    setCardapio(card || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [semana])

  // IDs já no cardápio
  const noCardapio = useMemo(() =>
    new Set(cardapio.map(c => c.produto_id)),
  [cardapio])

  async function toggleCardapio(disp: Disponibilidade) {
    const sb = getSupabase()
    if (noCardapio.has(disp.produto_id)) {
      // remover
      await sb.from('ecouni_cardapio')
        .delete()
        .eq('semana_ref', semana)
        .eq('produto_id', disp.produto_id)
    } else {
      // adicionar
      await sb.from('ecouni_cardapio').insert({
        semana_ref: semana,
        disponibilidade_id: disp.id,
        produto_id: disp.produto_id,
        quantidade_cx: disp.qtd_ecouni,
        ativo: true,
      })
    }
    carregar()
  }

  async function publicarTodos() {
    setPublicando(true)
    const sb = getSupabase()
    const novos = disponibilidades.filter(d => !noCardapio.has(d.produto_id))
    if (novos.length > 0) {
      await sb.from('ecouni_cardapio').insert(
        novos.map(d => ({
          semana_ref: semana,
          disponibilidade_id: d.id,
          produto_id: d.produto_id,
          quantidade_cx: d.qtd_ecouni,
          ativo: true,
        }))
      )
    }
    await carregar()
    setPublicando(false)
  }

  async function toggleAtivo(c: Cardapio) {
    await getSupabase().from('ecouni_cardapio').update({ ativo: !c.ativo }).eq('id', c.id)
    carregar()
  }

  const itensForaDoCardapio = disponibilidades.filter(d => !noCardapio.has(d.produto_id))
  const totalCxCardapio = cardapio.filter(c => c.ativo).reduce((s, c) => s + c.quantidade_cx, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cardápio</h1>
          <p className="text-xs text-gray-400 mt-0.5">Produtos liberados para pedidos EcoUni nesta semana</p>
        </div>
        {itensForaDoCardapio.length > 0 && (
          <button onClick={publicarTodos} disabled={publicando}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: PRIMARY }}>
            {publicando ? 'Publicando…' : `Publicar todos (${itensForaDoCardapio.length} itens)`}
          </button>
        )}
      </div>

      {/* Navegação de semana */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setSemanaOffset(o => o - 1)}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm">
          ‹
        </button>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700">
          Semana de <strong>{fmtSemana(semana)}</strong>
        </div>
        <button onClick={() => setSemanaOffset(o => o + 1)}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm">
          ›
        </button>
        {semanaOffset !== 0 && (
          <button onClick={() => setSemanaOffset(0)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
            Hoje
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : disponibilidades.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 text-sm">Nenhuma disponibilidade com alocação EcoUni nesta semana.</p>
          <p className="text-xs text-gray-400 mt-2">Vá em Disponibilidade e defina a quantidade alocada para EcoUni.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cardápio publicado */}
          {cardapio.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">No cardápio desta semana</h2>
                <span className="text-xs text-gray-400">{totalCxCardapio} cx disponíveis</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Categoria</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtd (cx)</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Visível</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {cardapio.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {c.ecouni_produtos?.nome || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 capitalize hidden md:table-cell">
                          {c.ecouni_produtos?.categoria}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900">{c.quantidade_cx}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleAtivo(c)}
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                            }`}>
                            {c.ativo ? 'Ativo' : 'Oculto'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              const disp = disponibilidades.find(d => d.produto_id === c.produto_id)
                              if (disp) toggleCardapio(disp)
                            }}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1">
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Disponíveis para adicionar */}
          {itensForaDoCardapio.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Disponíveis mas fora do cardápio ({itensForaDoCardapio.length})
              </h2>
              <div className="bg-white rounded-xl border border-dashed border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {itensForaDoCardapio.map(d => (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-700">
                          {d.ecouni_produtos?.nome}
                          <span className="ml-2 text-xs text-gray-400 capitalize">{d.ecouni_produtos?.categoria}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                          {d.ecouni_fornecedores?.nome}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{d.qtd_ecouni} cx</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => toggleCardapio(d)}
                            className="text-xs font-medium px-3 py-1 rounded-lg text-white"
                            style={{ background: PRIMARY }}>
                            + Adicionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
