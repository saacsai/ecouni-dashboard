'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Ciclo, Grupo, StatusCiclo } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

const STATUS_CONFIG: Record<StatusCiclo, { label: string; badge: string; next?: StatusCiclo; nextLabel?: string }> = {
  aberto:       { label: 'Aberto',       badge: 'bg-blue-100 text-blue-600',   next: 'fechado',      nextLabel: 'Fechar pedidos' },
  fechado:      { label: 'Fechado',      badge: 'bg-yellow-100 text-yellow-700', next: 'consolidado', nextLabel: 'Consolidar' },
  consolidado:  { label: 'Consolidado',  badge: 'bg-purple-100 text-purple-700', next: 'entregue',   nextLabel: 'Marcar entregue' },
  entregue:     { label: 'Entregue',     badge: 'bg-gray-100 text-gray-500' },
}

function sugerirVeiculo(caixas: number): string {
  if (caixas === 0)   return '—'
  if (caixas <= 30)   return 'Fiorino / Van'
  if (caixas <= 80)   return 'VUC'
  if (caixas <= 200)  return 'Truck'
  return 'Carreta'
}

function proxSegunda(offsetWeeks = 0): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + diff + offsetWeeks * 7)
  return d.toISOString().split('T')[0]
}

function addDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

const EMPTY_FORM = {
  grupo_id: '',
  semana_ref: proxSegunda(),
  data_cardapio: '',
  data_fechamento: '',
  data_entrega: '',
  valor_frete: '' as unknown as number,
  plus_montagem: '' as unknown as number,
  observacao: '',
}

export default function CiclosPage() {
  const [lista,    setLista]    = useState<Ciclo[]>([])
  const [grupos,   setGrupos]   = useState<Pick<Grupo, 'id' | 'nome'>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [drawer,   setDrawer]   = useState(false)
  const [form,     setForm]     = useState({ ...EMPTY_FORM })
  const [editId,   setEditId]   = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [filtro,   setFiltro]   = useState<StatusCiclo | 'todos'>('aberto')

  async function carregar() {
    const sb = getSupabase()
    const [{ data: ciclos }, { data: grps }] = await Promise.all([
      sb.from('ecouni_ciclos')
        .select('*, ecouni_grupos(nome)')
        .order('semana_ref', { ascending: false })
        .limit(50),
      sb.from('ecouni_grupos').select('id, nome').eq('ativo', true).order('nome'),
    ])
    setLista((ciclos as Ciclo[]) || [])
    setGrupos(grps || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrir(c?: Ciclo) {
    if (c) {
      setForm({
        grupo_id: c.grupo_id,
        semana_ref: c.semana_ref,
        data_cardapio: c.data_cardapio || '',
        data_fechamento: c.data_fechamento || '',
        data_entrega: c.data_entrega || '',
        valor_frete: c.valor_frete ?? ('' as unknown as number),
        plus_montagem: c.plus_montagem ?? ('' as unknown as number),
        observacao: c.observacao || '',
      })
      setEditId(c.id)
    } else {
      const semana = proxSegunda()
      setForm({
        ...EMPTY_FORM,
        semana_ref: semana,
        data_cardapio: semana,                 // segunda
        data_fechamento: addDias(semana, 2),   // quarta
        data_entrega: addDias(semana, 4),      // sexta
      })
      setEditId(null)
    }
    setDrawer(true)
  }

  // Quando muda semana_ref, auto-preenche as datas
  function onSemanaChange(val: string) {
    setForm(p => ({
      ...p,
      semana_ref: val,
      data_cardapio: val,
      data_fechamento: addDias(val, 2),
      data_entrega: addDias(val, 4),
    }))
  }

  async function salvar() {
    setSaving(true)
    const payload = {
      grupo_id: form.grupo_id,
      semana_ref: form.semana_ref,
      data_cardapio: form.data_cardapio || null,
      data_fechamento: form.data_fechamento || null,
      data_entrega: form.data_entrega || null,
      valor_frete: form.valor_frete ? Number(form.valor_frete) : null,
      plus_montagem: form.plus_montagem ? Number(form.plus_montagem) : null,
      observacao: form.observacao || null,
    }
    if (editId) {
      await getSupabase().from('ecouni_ciclos').update(payload).eq('id', editId)
    } else {
      await getSupabase().from('ecouni_ciclos').insert({ ...payload, status: 'aberto' })
    }
    await carregar()
    setDrawer(false)
    setSaving(false)
  }

  async function avancarStatus(c: Ciclo) {
    const cfg = STATUS_CONFIG[c.status]
    if (!cfg.next) return
    await getSupabase().from('ecouni_ciclos').update({ status: cfg.next }).eq('id', c.id)
    carregar()
  }

  const filtrados = lista.filter(c => filtro === 'todos' || c.status === filtro)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ciclos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Rodadas semanais por grupo de entrega</p>
        </div>
        <button onClick={() => abrir()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: PRIMARY }}>
          + Novo ciclo
        </button>
      </div>

      {/* Filtros status */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['todos', 'aberto', 'fechado', 'consolidado', 'entregue'] as const).map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === s ? 'text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            style={filtro === s ? { background: PRIMARY } : {}}>
            {s === 'todos' ? 'Todos' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🔄</p>
          <p className="text-gray-500 text-sm">Nenhum ciclo encontrado.</p>
          <button onClick={() => abrir()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            Criar primeiro ciclo
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Semana</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Entrega</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Caixas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Veículo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const cfg = STATUS_CONFIG[c.status]
                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.ecouni_grupos?.nome || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{fmtDate(c.semana_ref)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{fmtDate(c.data_entrega)}</td>
                    <td className="px-4 py-3 text-center text-gray-700 font-semibold hidden lg:table-cell">
                      {c.total_caixas || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                      {sugerirVeiculo(c.total_caixas)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {cfg.next && (
                          <button onClick={() => avancarStatus(c)}
                            className="text-xs font-medium px-2 py-1 rounded text-white whitespace-nowrap"
                            style={{ background: PRIMARY }}>
                            {cfg.nextLabel}
                          </button>
                        )}
                        <button onClick={() => abrir(c)}
                          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1">
                          ✎
                        </button>
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
              <h2 className="font-semibold text-gray-900">{editId ? 'Editar Ciclo' : 'Novo Ciclo'}</h2>
              <button onClick={() => setDrawer(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grupo *</label>
                <select value={form.grupo_id}
                  onChange={e => setForm(p => ({ ...p, grupo_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white">
                  <option value="">Selecionar…</option>
                  {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
                {grupos.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">Nenhum grupo ativo. Cadastre em Grupos primeiro.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Segunda-feira da semana *</label>
                <input type="date" value={form.semana_ref}
                  onChange={e => onSemanaChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cardápio (seg)</label>
                  <input type="date" value={form.data_cardapio}
                    onChange={e => setForm(p => ({ ...p, data_cardapio: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-[#1B5E37]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fechamento (qua)</label>
                  <input type="date" value={form.data_fechamento}
                    onChange={e => setForm(p => ({ ...p, data_fechamento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-[#1B5E37]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entrega (sex)</label>
                  <input type="date" value={form.data_entrega}
                    onChange={e => setForm(p => ({ ...p, data_entrega: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-[#1B5E37]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor do frete (R$)</label>
                  <input type="number" min={0} step={0.01}
                    value={form.valor_frete ?? ''}
                    onChange={e => setForm(p => ({ ...p, valor_frete: e.target.value as unknown as number }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                    placeholder="0,00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Plus montagem (R$)</label>
                  <input type="number" min={0} step={0.01}
                    value={form.plus_montagem ?? ''}
                    onChange={e => setForm(p => ({ ...p, plus_montagem: e.target.value as unknown as number }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                    placeholder="0,00" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                <textarea value={form.observacao}
                  onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] resize-none"
                  placeholder="Alguma observação sobre este ciclo" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={salvar} disabled={saving || !form.grupo_id || !form.semana_ref}
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
