'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Fornecedor, Produto, FornecedorProduto } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

const EMPTY: Omit<Fornecedor, 'id' | 'created_at'> = {
  nome: '', cnpj_cpf: null, whatsapp: '', contato_nome: null, email: null,
  municipio: '', uf: '', inscricao_estadual: null, numero_caf: null,
  tipos_produto: null, bling_fornecedor_id: null,
  distancia_ceagesp_km: null, token_portal: null, ativo: true,
}

type FornecedorProdutoComProduto = FornecedorProduto & { ecouni_produtos: Pick<Produto, 'id' | 'nome' | 'unidade'> | null }

export default function FornecedoresPage() {
  const [lista,          setLista]          = useState<Fornecedor[]>([])
  const [loading,        setLoading]        = useState(true)
  const [busca,          setBusca]          = useState('')
  const [drawer,         setDrawer]         = useState(false)
  const [form,           setForm]           = useState({ ...EMPTY })
  const [editId,         setEditId]         = useState<string | null>(null)
  const [saving,         setSaving]         = useState(false)

  // Produtos vinculados
  const [todosOsProdutos,      setTodosOsProdutos]      = useState<Pick<Produto, 'id' | 'nome' | 'unidade'>[]>([])
  const [produtosVinculados,   setProdutosVinculados]   = useState<FornecedorProdutoComProduto[]>([])
  const [produtoSelecionado,   setProdutoSelecionado]   = useState('')
  const [vinculando,           setVinculando]           = useState(false)
  const [removendoId,          setRemovendoId]          = useState<string | null>(null)

  async function carregar() {
    const { data } = await getSupabase()
      .from('ecouni_fornecedores')
      .select('*')
      .order('nome')
    setLista(data || [])
    setLoading(false)
  }

  async function carregarProdutos() {
    const { data } = await getSupabase()
      .from('ecouni_produtos')
      .select('id, nome, unidade')
      .order('nome')
    setTodosOsProdutos(data || [])
  }

  async function carregarProdutosVinculados(fornecedorId: string) {
    const { data } = await getSupabase()
      .from('ecouni_fornecedor_produtos')
      .select('*, ecouni_produtos(id, nome, unidade)')
      .eq('fornecedor_id', fornecedorId)
      .order('created_at')
    setProdutosVinculados((data as FornecedorProdutoComProduto[]) || [])
  }

  useEffect(() => { carregar(); carregarProdutos() }, [])

  function abrir(f?: Fornecedor) {
    if (f) {
      setForm({ ...f })
      setEditId(f.id)
      carregarProdutosVinculados(f.id)
    } else {
      setForm({ ...EMPTY })
      setEditId(null)
      setProdutosVinculados([])
    }
    setProdutoSelecionado('')
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

  async function vincularProduto() {
    if (!produtoSelecionado || !editId) return
    setVinculando(true)
    await getSupabase().from('ecouni_fornecedor_produtos').insert({
      fornecedor_id: editId,
      produto_id: produtoSelecionado,
      ativo: true,
    })
    setProdutoSelecionado('')
    await carregarProdutosVinculados(editId)
    setVinculando(false)
  }

  async function removerProduto(fpId: string) {
    if (!editId) return
    setRemovendoId(fpId)
    await getSupabase().from('ecouni_fornecedor_produtos').delete().eq('id', fpId)
    await carregarProdutosVinculados(editId)
    setRemovendoId(null)
  }

  const filtrados = lista.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (f.municipio || '').toLowerCase().includes(busca.toLowerCase())
  )

  // Produtos ainda não vinculados a este fornecedor
  const vinculadosIds = new Set(produtosVinculados.map(pv => pv.produto_id))
  const produtosDisponiveis = todosOsProdutos.filter(p => !vinculadosIds.has(p.id))

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

              {/* ── Produtos vinculados (somente ao editar) ── */}
              {editId && (
                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      Produtos vinculados
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Lista de produtos vinculados */}
                  {produtosVinculados.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">Nenhum produto vinculado ainda.</p>
                  ) : (
                    <ul className="space-y-1.5 mb-3">
                      {produtosVinculados.map(pv => (
                        <li key={pv.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-800">
                            {pv.ecouni_produtos?.nome ?? pv.produto_id}
                            {pv.ecouni_produtos?.unidade && (
                              <span className="text-xs text-gray-400 ml-1">({pv.ecouni_produtos.unidade})</span>
                            )}
                          </span>
                          <button
                            onClick={() => removerProduto(pv.id)}
                            disabled={removendoId === pv.id}
                            className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1 disabled:opacity-40"
                            title="Remover produto"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Adicionar produto */}
                  {produtosDisponiveis.length > 0 && (
                    <div className="flex gap-2">
                      <select
                        value={produtoSelecionado}
                        onChange={e => setProdutoSelecionado(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white"
                      >
                        <option value="">Selecionar produto…</option>
                        {produtosDisponiveis.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                      <button
                        onClick={vincularProduto}
                        disabled={!produtoSelecionado || vinculando}
                        className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 whitespace-nowrap"
                        style={{ background: PRIMARY }}
                      >
                        {vinculando ? '…' : '+ Vincular'}
                      </button>
                    </div>
                  )}
                </div>
              )}
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
