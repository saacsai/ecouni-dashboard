'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Cardapio, Preco } from '@/lib/supabase'

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

export default function PrecosPage() {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const semana = useMemo(() => proxSegunda(semanaOffset), [semanaOffset])

  const [cardapio, setCardapio] = useState<Cardapio[]>([])
  const [precoMap, setPrecoMap] = useState<Map<string, number>>(new Map())
  const [inputs,   setInputs]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    const sb = getSupabase()
    const [{ data: card }, { data: precos }] = await Promise.all([
      sb.from('ecouni_cardapio')
        .select('*, ecouni_produtos(*)')
        .eq('semana_ref', semana)
        .eq('ativo', true),
      sb.from('ecouni_precos')
        .select('*')
        .eq('semana_ref', semana)
        .eq('canal', 'ecouni'),
    ])
    setCardapio(card || [])
    const map = new Map((precos as Preco[] || []).map(p => [p.produto_id, p.preco]))
    setPrecoMap(map)
    const nextInputs: Record<string, string> = {}
    ;(card || []).forEach(c => {
      nextInputs[c.produto_id] = map.has(c.produto_id) ? String(map.get(c.produto_id)) : ''
    })
    setInputs(nextInputs)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [semana])

  async function salvar(produtoId: string) {
    const valor = parseFloat((inputs[produtoId] || '').replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    setSalvandoId(produtoId)
    const sb = getSupabase()
    await sb.from('ecouni_precos').upsert({
      produto_id: produtoId,
      semana_ref: semana,
      canal: 'ecouni',
      preco: valor,
    }, { onConflict: 'produto_id,semana_ref,canal' })
    await carregar()
    setSalvandoId(null)
  }

  const semPreco = cardapio.filter(c => !precoMap.has(c.produto_id)).length

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Preços</h1>
          <p className="text-xs text-gray-400 mt-0.5">Preço por unidade para os produtos no cardápio EcoUni desta semana</p>
        </div>
      </div>

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
        {semPreco > 0 && (
          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full ml-auto">
            {semPreco} produto{semPreco > 1 ? 's' : ''} sem preço
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : cardapio.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-500 text-sm">Nenhum produto no cardápio EcoUni desta semana.</p>
          <p className="text-xs text-gray-400 mt-2">Vá em Cardápio e publique produtos antes de definir preços.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Unidade</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preço (R$)</th>
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
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {c.ecouni_produtos?.unidade}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={inputs[c.produto_id] ?? ''}
                      onChange={e => setInputs(prev => ({ ...prev, [c.produto_id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') salvar(c.produto_id) }}
                      className="w-24 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => salvar(c.produto_id)}
                      disabled={salvandoId === c.produto_id}
                      className="text-xs font-medium px-3 py-1 rounded-lg text-white disabled:opacity-60"
                      style={{ background: PRIMARY }}>
                      {salvandoId === c.produto_id ? 'Salvando…' : 'Salvar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
