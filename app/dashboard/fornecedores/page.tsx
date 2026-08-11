'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Fornecedor } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

const EMPTY: Omit<Fornecedor, 'id' | 'created_at'> = {
  nome: '', whatsapp: '', municipio: '', uf: '', bling_fornecedor_id: null,
  distancia_ceagesp_km: null, token_portal: null, ativo: true,
}

export default function FornecedoresPage() {
  const [lista,    setLista]    = useState<Fornecedor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busca,    setBusca]    = useState('')
  const [drawer,   setDrawer]   = useState(false)
  const [form,     setForm]     = useState({ ...EMPTY })
  const [editId,   setEditId]   = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  async function carregar() {
    const { data } = await getSupabase()
      .from('ecouni_fornecedores')
      .select('*')
      .order('nome')
    setLista(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrir(f?: Fornecedor) {
    if (f) { setForm({ ...f }); setEditId(f.id) }
    else   { setForm({ ...EMPTY }); setEditId(null) }
    setDrawer(true)
  }

  async function salvar() {
    setSaving(true)
    const sb = getSupabase()
    const payload = {
      nome: form.nome,
      whatsapp: form.whatsapp,
      municipio: form.municipio || null,
      uf: form.uf || null,
      bling_fornecedor_id: form.bling_fornecedor_id || null,
      distancia_ceagesp_km: form.distancia_ceagesp_km || null,
      ativo: form.ativo,
    }
    if (editId) {
      await sb.from('ecouni_fornecedores').update(payload).eq('id', editId)
    } else {
      await sb.from('ecouni_fornecedores').insert(payload)
    }
    await carregar()
    setDrawer(false)
    setSaving(false)
  }

  async function toggleAtivo(f: Fornecedor) {
    await getSupabase().from('ecouni_fornecedores').update({ ativo: !f.ativo }).eq('id', f.id)
    carregar()
  }

  const filtrados = lista.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (f.municipio || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-xs text-gray-400 mt-0.5">Cooperativas parceiras da Feira EcoUni</p>
        </div>
        <div className="flex gap-2">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] w-48"
          />
          <button onClick={() => abrir()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            + Novo
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-gray-500 text-sm">Nenhum fornecedor cadastrado ainda.</p>
          <button onClick={() => abrir()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            Cadastrar primeiro fornecedor
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Município / UF</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Dist. CEAGESP</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map(f => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.nome}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {[f.municipio, f.uf].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden lg:table-cell">{f.whatsapp}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                    {f.distancia_ceagesp_km ? `${f.distancia_ceagesp_km} km` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleAtivo(f)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        f.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                      {f.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => abrir(f)}
                      className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
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
              <h2 className="font-semibold text-gray-900">{editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button onClick={() => setDrawer(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {([
                { label: 'Nome da cooperativa *', key: 'nome', type: 'text' },
                { label: 'WhatsApp *', key: 'whatsapp', type: 'text', placeholder: '11999990000' },
                { label: 'Município', key: 'municipio', type: 'text' },
                { label: 'UF', key: 'uf', type: 'text', placeholder: 'SP' },
                { label: 'Distância CEAGESP (km)', key: 'distancia_ceagesp_km', type: 'number' },
                { label: 'ID Bling (fornecedor)', key: 'bling_fornecedor_id', type: 'text' },
              ] as { label: string; key: keyof typeof form; type: string; placeholder?: string }[]).map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={(form[f.key] as string | number) ?? ''}
                    placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo}
                  onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} />
                <label htmlFor="ativo" className="text-sm text-gray-600">Ativo</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={salvar} disabled={saving || !form.nome || !form.whatsapp}
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
