'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Grupo } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

const DIAS_SEMANA = [
  { value: 'segunda',  label: 'Segunda' },
  { value: 'terca',    label: 'Terça' },
  { value: 'quarta',   label: 'Quarta' },
  { value: 'quinta',   label: 'Quinta' },
  { value: 'sexta',    label: 'Sexta' },
]

const DIAS_RETIRADA = [
  { value: 'segunda',  label: 'Segunda' },
  { value: 'terca',    label: 'Terça' },
  { value: 'quarta',   label: 'Quarta' },
  { value: 'quinta',   label: 'Quinta' },
  { value: 'sexta',    label: 'Sexta' },
  { value: 'sabado',   label: 'Sábado' },
]

const EMPTY: Omit<Grupo, 'id' | 'created_at'> = {
  nome: '', endereco_entrega: '', municipio: '', contato_nome: '',
  contato_whatsapp: '', contato_email: null, ativo: true,
  status_formacao: 'em_formacao', qtd_participantes_estimada: null, acesso_restrito: false,
  dias_pedido: null, horario_pedido_limite: null, dia_retirada: null,
  horario_retirada_inicio: null, horario_retirada_fim: null,
  pedido_minimo: null, tempo_montagem_min: 15,
}

export default function GruposPage() {
  const [lista,   setLista]   = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [drawer,  setDrawer]  = useState(false)
  const [form,    setForm]    = useState({ ...EMPTY })
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  async function carregar() {
    const { data } = await getSupabase().from('ecouni_grupos').select('*').order('nome')
    setLista(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrir(g?: Grupo) {
    if (g) { setForm({ ...g }); setEditId(g.id) }
    else   { setForm({ ...EMPTY }); setEditId(null) }
    setDrawer(true)
  }

  function toggleDiaPedido(dia: string) {
    setForm(p => {
      const atual = p.dias_pedido ?? []
      const novo = atual.includes(dia)
        ? atual.filter(d => d !== dia)
        : [...atual, dia]
      return { ...p, dias_pedido: novo.length > 0 ? novo : null }
    })
  }

  async function salvar() {
    setSaving(true)
    const payload = {
      nome: form.nome,
      endereco_entrega: form.endereco_entrega || null,
      municipio: form.municipio || null,
      contato_nome: form.contato_nome || null,
      contato_whatsapp: form.contato_whatsapp || null,
      ativo: form.ativo,
      // Regras de operação
      dias_pedido: form.dias_pedido,
      horario_pedido_limite: form.horario_pedido_limite || null,
      dia_retirada: form.dia_retirada || null,
      horario_retirada_inicio: form.horario_retirada_inicio || null,
      horario_retirada_fim: form.horario_retirada_fim || null,
      pedido_minimo: form.pedido_minimo || null,
      tempo_montagem_min: form.tempo_montagem_min ?? 15,
    }
    if (editId) {
      await getSupabase().from('ecouni_grupos').update(payload).eq('id', editId)
    } else {
      await getSupabase().from('ecouni_grupos').insert(payload)
    }
    await carregar()
    setDrawer(false)
    setSaving(false)
  }

  const campos = [
    { label: 'Nome do grupo / empresa *', key: 'nome' as const, placeholder: 'Ex: UNIFORJA' },
    { label: 'Endereço de entrega',       key: 'endereco_entrega' as const, placeholder: 'Rua, número, bairro' },
    { label: 'Município',                 key: 'municipio' as const, placeholder: 'Ex: Santo André' },
    { label: 'Nome do contato',           key: 'contato_nome' as const, placeholder: 'Responsável pelas entregas' },
    { label: 'WhatsApp do contato',       key: 'contato_whatsapp' as const, placeholder: '11999990000' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Grupos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Empresas clientes — container logístico (UNIFORJA, etc)</p>
        </div>
        <button onClick={() => abrir()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: PRIMARY }}>
          + Novo grupo
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-gray-500 text-sm">Nenhum grupo cadastrado ainda.</p>
          <button onClick={() => abrir()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            Cadastrar primeiro grupo
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {lista.map(g => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{g.nome}</p>
                  {g.municipio && <p className="text-xs text-gray-400 mt-0.5">{g.municipio}</p>}
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${g.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {g.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {g.endereco_entrega && (
                <p className="text-xs text-gray-500 mb-2">📍 {g.endereco_entrega}</p>
              )}
              {g.contato_nome && (
                <p className="text-xs text-gray-500">👤 {g.contato_nome}{g.contato_whatsapp ? ` · ${g.contato_whatsapp}` : ''}</p>
              )}
              {g.dia_retirada && (
                <p className="text-xs text-gray-400 mt-1">
                  Retirada: {DIAS_RETIRADA.find(d => d.value === g.dia_retirada)?.label ?? g.dia_retirada}
                  {g.horario_retirada_inicio && ` ${g.horario_retirada_inicio}`}
                  {g.horario_retirada_fim && `–${g.horario_retirada_fim}`}
                </p>
              )}
              <button onClick={() => abrir(g)}
                className="mt-3 text-xs text-gray-400 hover:text-gray-700">
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="w-full max-w-md bg-white h-full shadow-xl flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{editId ? 'Editar Grupo' : 'Novo Grupo'}</h2>
              <button onClick={() => setDrawer(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* ── Campos básicos ── */}
              {campos.map(c => (
                <div key={c.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{c.label}</label>
                  <input type="text"
                    value={(form[c.key] as string) ?? ''}
                    placeholder={c.placeholder}
                    onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo}
                  onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} />
                <label htmlFor="ativo" className="text-sm text-gray-600">Ativo</label>
              </div>

              {/* ── Regras de operação ── */}
              <div className="pt-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    Regras de operação
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Dias para pedido */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-2">Dias para pedido</label>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map(d => {
                      const checked = (form.dias_pedido ?? []).includes(d.value)
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDiaPedido(d.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            checked
                              ? 'border-[#1B5E37] bg-[#1B5E37] text-white'
                              : 'border-gray-200 text-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Horário limite do pedido */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Horário limite do pedido</label>
                  <input
                    type="time"
                    value={form.horario_pedido_limite ?? ''}
                    onChange={e => setForm(p => ({ ...p, horario_pedido_limite: e.target.value || null }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                  />
                </div>

                {/* Dia de retirada */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dia de retirada</label>
                  <select
                    value={form.dia_retirada ?? ''}
                    onChange={e => setForm(p => ({ ...p, dia_retirada: e.target.value || null }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white"
                  >
                    <option value="">Selecionar…</option>
                    {DIAS_RETIRADA.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Horários de retirada */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Início da retirada</label>
                    <input
                      type="time"
                      value={form.horario_retirada_inicio ?? ''}
                      onChange={e => setForm(p => ({ ...p, horario_retirada_inicio: e.target.value || null }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fim da retirada</label>
                    <input
                      type="time"
                      value={form.horario_retirada_fim ?? ''}
                      onChange={e => setForm(p => ({ ...p, horario_retirada_fim: e.target.value || null }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                    />
                  </div>
                </div>

                {/* Pedido mínimo */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pedido mínimo (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.pedido_minimo ?? ''}
                    onChange={e => setForm(p => ({ ...p, pedido_minimo: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                    placeholder="Ex: 30.00"
                  />
                </div>

                {/* Tempo de montagem */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tempo médio de montagem (min)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.tempo_montagem_min ?? 15}
                    onChange={e => setForm(p => ({ ...p, tempo_montagem_min: e.target.value ? Number(e.target.value) : 15 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                    placeholder="15"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={salvar} disabled={saving || !form.nome}
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
