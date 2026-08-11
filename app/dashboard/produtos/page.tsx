'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Produto, CategoriaProduto, TipoEstoque } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

const CATEGORIAS: CategoriaProduto[] = ['folhosa', 'legume', 'fruta', 'grao', 'granjeiro', 'min_processado', 'processado', 'outro']
const TIPOS: TipoEstoque[] = ['prospectivo', 'fisico']

const CAT_LABEL: Record<CategoriaProduto, string> = {
  folhosa:        'Verduras',
  legume:         'Legumes',
  fruta:          'Frutas',
  grao:           'Cereais',
  granjeiro:      'Granjeiros',
  min_processado: 'Min. Processados',
  processado:     'Processados',
  outro:          'Outros',
}
const CAT_BADGE: Record<CategoriaProduto, string> = {
  folhosa:        'bg-green-100 text-green-700',
  legume:         'bg-orange-100 text-orange-700',
  fruta:          'bg-pink-100 text-pink-700',
  grao:           'bg-yellow-100 text-yellow-700',
  granjeiro:      'bg-amber-100 text-amber-700',
  min_processado: 'bg-teal-100 text-teal-700',
  processado:     'bg-blue-100 text-blue-700',
  outro:          'bg-gray-100 text-gray-500',
}

const EMPTY = {
  nome: '', categoria: 'folhosa' as CategoriaProduto, tipo_estoque: 'prospectivo' as TipoEstoque,
  unidade: 'cx', itens_por_unidade: null as number | null,
  bling_produto_id: '' as string | null, disponivel: true,
}

export default function ProdutosPage() {
  const [lista,   setLista]   = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [busca,   setBusca]   = useState('')
  const [catFiltro, setCatFiltro] = useState<CategoriaProduto | 'todas'>('todas')
  const [drawer,  setDrawer]  = useState(false)
  const [form,    setForm]    = useState({ ...EMPTY })
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  async function carregar() {
    const { data } = await getSupabase().from('ecouni_produtos').select('*').order('nome')
    setLista(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrir(p?: Produto) {
    if (p) { setForm({ ...p, itens_por_unidade: p.itens_por_unidade ?? null, bling_produto_id: p.bling_produto_id ?? '' }); setEditId(p.id) }
    else   { setForm({ ...EMPTY }); setEditId(null) }
    setDrawer(true)
  }

  async function salvar() {
    setSaving(true)
    const payload = {
      nome: form.nome,
      categoria: form.categoria,
      tipo_estoque: form.tipo_estoque,
      unidade: form.unidade,
      itens_por_unidade: form.itens_por_unidade ? Number(form.itens_por_unidade) : null,
      bling_produto_id: form.bling_produto_id || null,
      disponivel: form.disponivel,
    }
    if (editId) {
      await getSupabase().from('ecouni_produtos').update(payload).eq('id', editId)
    } else {
      await getSupabase().from('ecouni_produtos').insert(payload)
    }
    await carregar()
    setDrawer(false)
    setSaving(false)
  }

  async function toggleDisponivel(p: Produto) {
    await getSupabase().from('ecouni_produtos').update({ disponivel: !p.disponivel }).eq('id', p.id)
    carregar()
  }

  const filtrados = lista.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchCat = catFiltro === 'todas' || p.categoria === catFiltro
    return matchBusca && matchCat
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
          <p className="text-xs text-gray-400 mt-0.5">Catálogo da Feira EcoUni</p>
        </div>
        <div className="flex gap-2">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] w-40"
          />
          <button onClick={() => abrir()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            + Novo
          </button>
        </div>
      </div>

      {/* Filtros categoria */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['todas', ...CATEGORIAS] as const).map(c => (
          <button key={c} onClick={() => setCatFiltro(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              catFiltro === c ? 'text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            style={catFiltro === c ? { background: PRIMARY } : {}}>
            {c === 'todas' ? 'Todas' : CAT_LABEL[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">🥦</p>
          <p className="text-gray-500 text-sm">Nenhum produto cadastrado ainda.</p>
          <button onClick={() => abrir()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            Cadastrar primeiro produto
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Unidade</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_BADGE[p.categoria]}`}>
                      {CAT_LABEL[p.categoria]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell capitalize">{p.tipo_estoque}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {p.unidade}{p.itens_por_unidade ? ` (${p.itens_por_unidade} un/cx)` : ''}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleDisponivel(p)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                      {p.disponivel ? 'Disponível' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => abrir(p)}
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
              <h2 className="font-semibold text-gray-900">{editId ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setDrawer(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input type="text" value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                  placeholder="Ex: Alface Crespa" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
                <select value={form.categoria}
                  onChange={e => setForm(p => ({ ...p, categoria: e.target.value as CategoriaProduto }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de estoque *</label>
                <select value={form.tipo_estoque}
                  onChange={e => setForm(p => ({ ...p, tipo_estoque: e.target.value as TipoEstoque }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white">
                  <option value="prospectivo">Prospectivo (hortifruti — chega e sai no mesmo dia)</option>
                  <option value="fisico">Físico (processado — palete no galpão)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
                  <select value={form.unidade}
                    onChange={e => setForm(p => ({ ...p, unidade: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white">
                    {['cx', 'pacote', 'kg', 'unidade'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Itens por caixa</label>
                  <input type="number" value={form.itens_por_unidade ?? ''}
                    onChange={e => setForm(p => ({ ...p, itens_por_unidade: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                    placeholder="Ex: 10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ID Bling (produto)</label>
                <input type="text" value={form.bling_produto_id ?? ''}
                  onChange={e => setForm(p => ({ ...p, bling_produto_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37]"
                  placeholder="Preenchido após cadastro no Bling" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="disponivel" checked={form.disponivel}
                  onChange={e => setForm(p => ({ ...p, disponivel: e.target.checked }))} />
                <label htmlFor="disponivel" className="text-sm text-gray-600">Disponível no cardápio</label>
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
