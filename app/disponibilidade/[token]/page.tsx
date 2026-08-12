'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

const PRIMARY = '#1B5E37'

type ProdutoVinculado = {
  id: string
  produto_id: string
  prazo_pedido_dias: number
  observacao_prazo: string | null
  ecouni_produtos: { id: string; nome: string; unidade: string; categoria: string } | null
}

type DisponibilidadeExistente = {
  produto_id: string
  semana_ref: string
  quantidade_cx: number
  observacao: string | null
}

type GridCell = {
  quantidade_cx: number
  observacao: string
}

// Chave do grid: `${produto_id}__${semana_ref}`
type Grid = Record<string, GridCell>

function getProximasQuatroSemanas(): Array<{ ref: string; label: string }> {
  const hoje = new Date()
  // Encontra a segunda-feira da semana que vem
  const diaSemana = hoje.getDay() // 0=dom
  const diasAteSegunda = diaSemana === 0 ? 1 : (8 - diaSemana)
  const proxSegunda = new Date(hoje)
  proxSegunda.setDate(hoje.getDate() + diasAteSegunda)
  proxSegunda.setHours(0, 0, 0, 0)

  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(proxSegunda)
    d.setDate(proxSegunda.getDate() + i * 7)
    const ref = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
    return { ref, label }
  })
}

function prazoLabel(dias: number): { texto: string; cor: string } {
  if (dias >= 7) return { texto: `${dias} dias antes`, cor: 'text-amber-600' }
  if (dias >= 3) return { texto: `${dias} dias antes`, cor: 'text-orange-500' }
  return { texto: `${dias} dia${dias !== 1 ? 's' : ''} antes`, cor: 'text-gray-400' }
}

export default function DisponibilidadePage() {
  const { token } = useParams<{ token: string }>()
  const semanas = getProximasQuatroSemanas()

  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [sucesso,    setSucesso]    = useState(false)
  const [erro,       setErro]       = useState('')
  const [nomeForn,   setNomeForn]   = useState('')
  const [produtos,   setProdutos]   = useState<ProdutoVinculado[]>([])
  const [grid,       setGrid]       = useState<Grid>({})
  const [notFound,   setNotFound]   = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/disponibilidade?token=${token}`)
    if (!res.ok) { setNotFound(true); setLoading(false); return }
    const json = await res.json()
    setNomeForn(json.fornecedor.nome)
    setProdutos(json.produtos)

    // Pré-preenche grid com disponibilidades existentes
    const g: Grid = {}
    for (const d of json.disponibilidades as DisponibilidadeExistente[]) {
      g[`${d.produto_id}__${d.semana_ref}`] = {
        quantidade_cx: d.quantidade_cx,
        observacao:    d.observacao ?? '',
      }
    }
    setGrid(g)
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  function setQtd(produto_id: string, semana_ref: string, val: string) {
    const key = `${produto_id}__${semana_ref}`
    const qtd = val === '' ? 0 : Math.max(0, Number(val))
    setGrid(prev => ({
      ...prev,
      [key]: { quantidade_cx: qtd, observacao: prev[key]?.observacao ?? '' },
    }))
  }

  async function salvar() {
    setSaving(true)
    setErro('')
    setSucesso(false)

    const itens: { produto_id: string; semana_ref: string; quantidade_cx: number; observacao: string }[] = []

    for (const p of produtos) {
      for (const s of semanas) {
        const key = `${p.produto_id}__${s.ref}`
        const cell = grid[key]
        itens.push({
          produto_id:    p.produto_id,
          semana_ref:    s.ref,
          quantidade_cx: cell?.quantidade_cx ?? 0,
          observacao:    cell?.observacao ?? '',
        })
      }
    }

    const res = await fetch('/api/disponibilidade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, itens }),
    })

    if (res.ok) {
      setSucesso(true)
      setTimeout(() => setSucesso(false), 4000)
    } else {
      const j = await res.json()
      setErro(j.error || 'Erro ao salvar. Tente novamente.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="font-semibold text-gray-700">Link inválido ou expirado</p>
          <p className="text-sm text-gray-400 mt-1">Entre em contato com a equipe EcoUni.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F7F4] pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: PRIMARY }}>
            🌿
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">Disponibilidade — {nomeForn}</p>
            <p className="text-xs text-gray-400">Informe as quantidades disponíveis para as próximas semanas</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {produtos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 text-sm">Nenhum produto vinculado ainda.</p>
            <p className="text-xs text-gray-400 mt-1">A equipe EcoUni ainda não vinculou produtos à sua cooperativa.</p>
          </div>
        ) : (
          <>
            {/* Legenda de semanas (mobile: visível acima da tabela) */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">
                        Produto
                      </th>
                      {semanas.map(s => (
                        <th key={s.ref} className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">
                          Semana<br />
                          <span className="text-gray-900 font-bold normal-case">{s.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((p, idx) => {
                      const nome   = p.ecouni_produtos?.nome ?? p.produto_id
                      const unidade = p.ecouni_produtos?.unidade ?? '—'
                      const { texto: prazoTexto, cor: prazoCor } = prazoLabel(p.prazo_pedido_dias)

                      return (
                        <tr key={p.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                          <td className="px-4 py-3 align-top">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{nome}</p>
                            <p className="text-xs text-gray-400">{unidade}</p>
                            <p className={`text-xs mt-0.5 font-medium ${prazoCor}`}>
                              Prazo: {prazoTexto}
                            </p>
                            {p.observacao_prazo && (
                              <p className="text-xs text-gray-400 mt-0.5 italic">{p.observacao_prazo}</p>
                            )}
                          </td>
                          {semanas.map(s => {
                            const key = `${p.produto_id}__${s.ref}`
                            const val = grid[key]?.quantidade_cx ?? 0
                            return (
                              <td key={s.ref} className="px-3 py-3 text-center align-top">
                                <input
                                  type="number"
                                  min={0}
                                  value={val === 0 ? '' : val}
                                  onChange={e => setQtd(p.produto_id, s.ref, e.target.value)}
                                  placeholder="0"
                                  className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-[#1B5E37] focus:ring-1 focus:ring-[#1B5E37]/20 bg-white"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">{unidade}</p>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400">
                * Informe 0 ou deixe em branco para indicar que não haverá disponibilidade naquela semana.
              </div>
            </div>

            {/* Salvar */}
            <div className="fixed bottom-4 left-4 right-4 z-10 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  {sucesso && (
                    <p className="text-sm font-semibold text-green-600">✓ Disponibilidade salva com sucesso!</p>
                  )}
                  {erro && (
                    <p className="text-sm text-red-500">{erro}</p>
                  )}
                  {!sucesso && !erro && (
                    <p className="text-xs text-gray-400">Você pode atualizar as quantidades a qualquer momento.</p>
                  )}
                </div>
                <button
                  onClick={salvar}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 whitespace-nowrap"
                  style={{ background: PRIMARY }}
                >
                  {saving ? 'Salvando…' : 'Salvar disponibilidade'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
