'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Disponibilidade, Fornecedor, Produto, StatusDisponib } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

const STATUS_CONFIG: Record<StatusDisponib, { label: string; badge: string }> = {
  informado:    { label: 'Informado',    badge: 'bg-blue-100 text-blue-600' },
  pedido_feito: { label: 'Pedido feito', badge: 'bg-yellow-100 text-yellow-700' },
  confirmado:   { label: 'Confirmado',   badge: 'bg-green-100 text-green-700' },
  entregue:     { label: 'Entregue',     badge: 'bg-gray-100 text-gray-500' },
}

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

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

const EMPTY_FORM = {
  fornecedor_id: '',
  produto_id: '',
  quantidade_cx: '' as unknown as number,
  qtd_atacado: 0,
  qtd_ecouni: 0,
  data_entrega: '',
  observacao: '',
  status: 'informado' as StatusDisponib,
}

export default function DisponibilidadePage() {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const semana = useMemo(() => proxSegunda(semanaOffset), [semanaOffset])

  const [lista,       setLista]       = useState<Disponibilidade[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [produtos,    setProdutos]    = useState<Produto[]>([])
  const [loading,     setLoading]     = useState(true)
  const [drawer,      setDrawer]      = useState(false)
  const [form,        setForm]        = useState({ ...EMPTY_FORM })
  const [editId,      setEditId]      = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [alocandoId,  setAlocandoId]  = useState<string | null>(null)
  const [alocForm,    setAlocForm]    = useState({ qtd_atacado: 0, qtd_ecouni: 0 })

  async function carregar() {
    setLoading(true)
    const sb = getSupabase()
    const [{ data: disp }, { data: forn }, { data: prod }] = await Promise.all([
      sb.from('ecouni_disponibilidade')
        .select('*, ecouni_produtos(*), ecouni_fornecedores(*)')
        .eq('semana_ref', semana)
        .order('created_at'),
      sb.from('ecouni_fornecedores').select('*').eq('ativo', true).order('nome'),
      sb.from('ecouni_produtos').select('*').eq('disponivel', true).order('nome'),
    ])
    setLista((disp as Disponibilidade[]) || [])
    setFornecedores(forn || [])
    setProdutos(prod || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [semana])

  function abrir(d?: Disponibilidade) {
    if (d) {
      setForm({
        fornecedor_id: d.fornecedor_id,
        produto_id: d.produto_id,
        quantidade_cx: d.quantidade_cx,
        qtd_atacado: d.qtd_atacado,
        qtd_ecouni: d.qtd_ecouni,
        data_entrega: d.data_entrega || '',
        observacao: d.observacao || '',
        status: d.status,
      })
      setEditId(d.id)
    } else {
      setForm({ ...EMPTY_FORM })
      setEditId(null)
    }
    setDrawer(true)
  }

  async function salvar() {
    setSaving(true)
    const payload = {
      fornecedor_id: form.fornecedor_id,
      produto_id: form.produto_id,
      semana_ref: semana,
      quantidade_cx: Number(form.quantidade_cx),
      qtd_atacado: Number(form.qtd_atacado),
      qtd_ecouni: Number(form.qtd_ecouni),
      data_entrega: form.data_entrega || null,
      observacao: form.observacao || null,
      status: form.status,
    }
    if (editId) {
      await getSupabase().from('ecouni_disponibilidade').update(payload).eq('id', editId)
    } else {
      await getSupabase().from('ecouni_disponibilidade').insert(payload)
    }
    await carregar()
    setDrawer(false)
    setSaving(false)
  }

  async function salvarAlocacao(id: string) {
    await getSupabase().from('ecouni_disponibilidade').update({
      qtd_atacado: alocForm.qtd_atacado,
      qtd_ecouni: alocForm.qtd_ecouni,
    }).eq('id', id)
    setAlocandoId(null)
    carregar()
  }

  async function atualizarStatus(id: string, status: StatusDisponib) {
    await getSupabase().from('ecouni_disponibilidade').update({ status }).eq('id', id)
    carregar()
  }

  const totalCx = lista.reduce((s, d) => s + d.quantidade_cx, 0)
  const totalEcouni = lista.reduce((s, d) => s + d.qtd_ecouni, 0)
  const totalAtacado = lista.reduce((s, d) => s + d.qtd_atacado, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Disponibilidade</h1>
          <p className="text-xs text-gray-400 mt-0.5">O que as cooperativas terão disponível</p>
        </div>
        <button onClick={() => abrir()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: PRIMARY }}>
          + Informar disponibilidade
        </button>
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
          <button onClick={() => setSemanaOffset(0)}
            className="text-xs text-gray-400 hover:text-gray-600 ml-1">
            Hoje
          </button>
        )}
      </div>

      {/* Cards resumo */}
      {lista.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total disponível', value: `${totalCx} cx`, icon: '📦' },
            { label: 'Alocado EcoUni',   value: `${totalEcouni} cx`, icon: '🛒' },
            { label: 'Alocado Atacado',  value: `${totalAtacado} cx`, icon: '🏪' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-lg mb-1">{c.icon}</p>
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🌾</p>
          <p className="text-gray-500 text-sm">Nenhuma disponibilidade informada para esta semana.</p>
          <button onClick={() => abrir()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            Informar primeira disponibilidade
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fornecedor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total cx</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">EcoUni</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Atacado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Entrega</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lista.map(d => {
                const cfg = STATUS_CONFIG[d.status]
                const emAlocacao = alocandoId === d.id
                return (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {d.ecouni_produtos?.nome || '—'}
                      <p className="text-xs text-gray-400 font-normal">{d.ecouni_produtos?.categoria}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {d.ecouni_fornecedores?.nome || '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{d.quantidade_cx}</td>

                    {/* Alocação EcoUni */}
                    <td className="px-4 py-3 text-center">
                      {emAlocacao ? (
                        <input
                          type="number" min={0} max={d.quantidade_cx}
                          value={alocForm.qtd_ecouni}
                          onChange={e => setAlocForm(p => ({ ...p, qtd_ecouni: Number(e.target.value) }))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center outline-none focus:border-[#1B5E37]"
                        />
                      ) : (
                        <span className={`font-semibold ${d.qtd_ecouni > 0 ? 'text-[#1B5E37]' : 'text-gray-300'}`}>
                          {d.qtd_ecouni}
                        </span>
                      )}
                    </td>

                    {/* Alocação Atacado */}
                    <td className="px-4 py-3 text-center">
                      {emAlocacao ? (
                        <input
                          type="number" min={0} max={d.quantidade_cx}
                          value={alocForm.qtd_atacado}
                          onChange={e => setAlocForm(p => ({ ...p, qtd_atacado: Number(e.target.value) }))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-center outline-none focus:border-[#1B5E37]"
                        />
                      ) : (
                        <span className={`font-semibold ${d.qtd_atacado > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                          {d.qtd_atacado}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{fmtDate(d.data_entrega)}</td>

                    <td className="px-4 py-3 text-center">
                      <select
                        value={d.status}
                        onChange={e => atualizarStatus(d.id, e.target.value as StatusDisponib)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer ${cfg.badge}`}
                        style={{ background: 'transparent' }}
                      >
                        {(Object.keys(STATUS_CONFIG) as StatusDisponib[]).map(s => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {emAlocacao ? (
                          <>
                            <button onClick={() => salvarAlocacao(d.id)}
                              className="text-xs px-2 py-1 rounded text-white font-medium"
                              style={{ background: PRIMARY }}>
                              Salvar
                            </button>
                            <button onClick={() => setAlocandoId(null)}
                              className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100">
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setAlocandoId(d.id); setAlocForm({ qtd_atacado: d.qtd_atacado, qtd_ecouni: d.qtd_ecouni }) }}
                              className="text-xs text-blue-500 hover:text-blue-700 px-1 py-1"
                              title="Alocar por canal">
                              ÷
                            </button>
                            <button onClick={() => abrir(d)}
                              className="text-xs text-gray-400 hover:text-gray-700 px-1 py-1">
                              ✎
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="w-full max-w-md bg-white h-full shadow-xl flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{editId ? 'Editar Disponibilidade' : 'Informar Disponibilidade'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Semana de {fmtSemana(semana)}</p>
              </div>
              <button onClick={() => setDrawer(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor (cooperativa) *</label>
                <select value={form.fornecedor_id}
                  onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white">
                  <option value="">Selecionar…</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                {fornecedores.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">Nenhum fornecedor ativo. Cadastre em Fornecedores primeiro.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
                <select value={form.produto_id}
                  onChange={e => setForm(p => ({ ...p, produto_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white">
                  <option value="">Selecionar…</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.categoria})</option>)}
                </select>
                {produtos.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">Nenhum produto disponível. Cadastre em Produtos primeiro.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade total (caixas) *</label>
                <input type="number" min={1} value={form.quantidade_cx || ''}
                  onChange={e => setForm(p => ({ ...p, quantidade_cx: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                  placeholder="Ex: 20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alocado EcoUni (cx)</label>
                  <input type="number" min={0} value={form.qtd_ecouni}
                    onChange={e => setForm(p => ({ ...p, qtd_ecouni: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alocado Atacado (cx)</label>
                  <input type="number" min={0} value={form.qtd_atacado}
                    onChange={e => setForm(p => ({ ...p, qtd_atacado: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data de entrega (sexta)</label>
                <input type="date" value={form.data_entrega}
                  onChange={e => setForm(p => ({ ...p, data_entrega: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusDisponib }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white">
                  {(Object.keys(STATUS_CONFIG) as StatusDisponib[]).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                <textarea value={form.observacao}
                  onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] resize-none"
                  placeholder="Ex: Entrega confirmada pelo gestor, aguarda NF" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={salvar}
                disabled={saving || !form.fornecedor_id || !form.produto_id || !form.quantidade_cx}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: PRIMARY }}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
