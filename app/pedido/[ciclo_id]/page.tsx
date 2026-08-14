'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import { PRIMARY } from '@/lib/brand'

const CATEGORIAS = [
  { key: 'fruta',          label: 'Frutas',                emoji: '🍎' },
  { key: 'legume',         label: 'Legumes',               emoji: '🫑' },
  { key: 'folhosa',        label: 'Verduras',              emoji: '🥬' },
  { key: 'grao',           label: 'Cereais',               emoji: '🌾' },
  { key: 'granjeiro',      label: 'Granjeiros',            emoji: '🥚' },
  { key: 'min_processado', label: 'Min. Processados',      emoji: '🫙' },
  { key: 'processado',     label: 'Processados',           emoji: '📦' },
  { key: 'outro',          label: 'Outros',                emoji: '🌿' },
]

type ProdutoInfo = {
  id: string
  nome: string
  categoria: string
  unidade: string
  gramas_ref_min: number | null
  gramas_ref_max: number | null
  link_saiba_mais: string | null
}

type Item = {
  cardapio_id: string
  produto_id: string
  produto: ProdutoInfo
  preco: number
}

type CartEntry = {
  produto_id: string
  nome: string
  unidade: string
  preco: number
  quantidade: number
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function refKg(preco: number, min: number | null, max: number | null): string | null {
  if (!min || !max || preco === 0) return null
  const med = (min + max) / 2
  return `≈ ${fmtBRL((preco / med) * 1000)}/kg`
}

export default function PedidoPage() {
  const { ciclo_id } = useParams<{ ciclo_id: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('t')

  const [catAtiva,  setCatAtiva]  = useState(CATEGORIAS[0].key)
  const [items,     setItems]     = useState<Item[]>([])
  const [cart,      setCart]      = useState<CartEntry[]>([])
  const [cartOpen,  setCartOpen]  = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [semana,    setSemana]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [etapa,     setEtapa]     = useState<'pedido' | 'sucesso'>('pedido')
  const [erro,      setErro]      = useState('')

  useEffect(() => {
    async function load() {
      const sb = getSupabase()

      const { data: ciclo } = await sb
        .from('ecouni_ciclos')
        .select('semana_ref, grupo_id')
        .eq('id', ciclo_id)
        .single()

      if (!ciclo) { setLoading(false); return }
      setSemana(ciclo.semana_ref)

      const [{ data: cardapio }, { data: precos }] = await Promise.all([
        sb.from('ecouni_cardapio')
          .select('id, produto_id, ecouni_produtos(id, nome, categoria, unidade, gramas_ref_min, gramas_ref_max, link_saiba_mais)')
          .eq('semana_ref', ciclo.semana_ref)
          .eq('ativo', true),
        sb.from('ecouni_precos')
          .select('produto_id, preco')
          .eq('semana_ref', ciclo.semana_ref)
          .eq('canal', 'ecouni'),
      ])

      const precoMap = new Map((precos ?? []).map(p => [p.produto_id, p.preco]))

      const itens: Item[] = (cardapio ?? [])
        .filter((c): c is typeof c & { ecouni_produtos: ProdutoInfo } => !!c.ecouni_produtos)
        .map(c => ({
          cardapio_id: c.id,
          produto_id:  c.produto_id,
          produto:     c.ecouni_produtos as ProdutoInfo,
          preco:       precoMap.get(c.produto_id) ?? 0,
        }))

      setItems(itens)

      const primeira = CATEGORIAS.find(cat => itens.some(i => i.produto.categoria === cat.key))
      if (primeira) setCatAtiva(primeira.key)

      setLoading(false)
    }
    load()
  }, [ciclo_id])

  const categoriasComItens = useMemo(
    () => CATEGORIAS.filter(cat => items.some(i => i.produto.categoria === cat.key)),
    [items]
  )

  const itensDaCat = useMemo(
    () => items.filter(i => i.produto.categoria === catAtiva),
    [items, catAtiva]
  )

  const totalCart  = cart.reduce((s, c) => s + c.preco * c.quantidade, 0)
  const totalItens = cart.reduce((s, c) => s + c.quantidade, 0)

  function getQtd(produto_id: string) {
    return cart.find(c => c.produto_id === produto_id)?.quantidade ?? 0
  }

  function setQtd(item: Item, qtd: number) {
    setCart(prev => {
      const sem = prev.filter(c => c.produto_id !== item.produto_id)
      if (qtd <= 0) return sem
      return [...sem, {
        produto_id: item.produto_id,
        nome:       item.produto.nome,
        unidade:    item.produto.unidade,
        preco:      item.preco,
        quantidade: qtd,
      }]
    })
  }

  async function confirmar() {
    if (cart.length === 0) return
    setSaving(true)
    setErro('')

    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ciclo_id,
        token,
        itens: cart.map(c => ({
          produto_id:    c.produto_id,
          quantidade:    c.quantidade,
          preco_unitario: c.preco,
        })),
      }),
    })

    if (res.ok) {
      setEtapa('sucesso')
    } else {
      const json = await res.json()
      setErro(json.error || 'Erro ao enviar pedido. Tente novamente.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando cardápio…</p>
      </div>
    )
  }

  if (etapa === 'sucesso') {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido enviado!</h1>
          <p className="text-gray-500 text-sm mb-4">
            Total: <strong>{fmtBRL(totalCart)}</strong>
          </p>
          <p className="text-xs text-gray-400">
            Nossa equipe vai confirmar e enviar o link de pagamento pelo WhatsApp em breve.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F7F4] pb-28">

      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
          <Image src="/logo_ecouni.png" alt="EcoUni" width={88} height={36} className="object-contain flex-shrink-0" />
          {semana && (
            <p className="text-[10px] text-gray-400 ml-1">
              Semana de {new Date(semana + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </p>
          )}
        </div>

        {/* Abas de categoria */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {categoriasComItens.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCatAtiva(cat.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                catAtiva === cat.key ? 'text-white' : 'bg-gray-100 text-gray-600'
              }`}
              style={catAtiva === cat.key ? { background: PRIMARY } : {}}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Produtos */}
      <div className="px-4 py-4 space-y-3">
        {itensDaCat.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Nenhum produto nesta categoria esta semana.</p>
        ) : (
          itensDaCat.map(item => {
            const qtd = getQtd(item.produto_id)
            const kg  = refKg(item.preco, item.produto.gramas_ref_min, item.produto.gramas_ref_max)
            const uni = item.produto.unidade.toLowerCase()

            return (
              <div key={item.produto_id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{item.produto.nome}</p>

                    {/* Gramagem */}
                    {item.produto.gramas_ref_min && item.produto.gramas_ref_max && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.produto.gramas_ref_min}–{item.produto.gramas_ref_max}g/{uni}
                      </p>
                    )}

                    {/* Preço */}
                    {item.preco > 0 && (
                      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">
                          {fmtBRL(item.preco)}
                          <span className="text-xs font-normal text-gray-500">/{uni}</span>
                        </span>
                        {kg && <span className="text-xs text-gray-400">{kg}</span>}
                      </div>
                    )}

                    {/* Saiba mais */}
                    {item.produto.link_saiba_mais && (
                      <a
                        href={item.produto.link_saiba_mais}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium mt-1 inline-block"
                        style={{ color: PRIMARY }}
                      >
                        Saiba mais →
                      </a>
                    )}
                  </div>

                  {/* Seletor de quantidade */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    {qtd === 0 ? (
                      <button
                        onClick={() => setQtd(item, 1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow"
                        style={{ background: PRIMARY }}
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setQtd(item, qtd - 1)}
                          className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-lg"
                          style={{ borderColor: PRIMARY, color: PRIMARY }}
                        >
                          −
                        </button>
                        <span className="text-base font-bold text-gray-900 w-6 text-center">{qtd}</span>
                        <button
                          onClick={() => setQtd(item, qtd + 1)}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ background: PRIMARY }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotal do item */}
                {qtd > 0 && item.preco > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-400">{qtd} {uni}</span>
                    <span className="text-sm font-semibold text-gray-900">{fmtBRL(qtd * item.preco)}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Barra flutuante do carrinho */}
      {cart.length > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-between px-5 shadow-xl"
            style={{ background: PRIMARY }}
          >
            <span className="bg-white/25 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">
              {totalItens}
            </span>
            <span>Ver carrinho</span>
            <span className="font-bold">{fmtBRL(totalCart)}</span>
          </button>
        </div>
      )}

      {/* Drawer do carrinho */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-base">Seu carrinho</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 text-lg leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {cart.map(c => (
                <div key={c.produto_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-xs text-gray-400">{fmtBRL(c.preco)}/{c.unidade.toLowerCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const item = items.find(i => i.produto_id === c.produto_id)
                        if (item) setQtd(item, c.quantidade - 1)
                      }}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-600"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{c.quantidade}</span>
                    <button
                      onClick={() => {
                        const item = items.find(i => i.produto_id === c.produto_id)
                        if (item) setQtd(item, c.quantidade + 1)
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: PRIMARY }}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right">
                    {fmtBRL(c.preco * c.quantidade)}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-5 py-5 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Total do pedido</span>
                <span className="text-xl font-bold text-gray-900">{fmtBRL(totalCart)}</span>
              </div>
              {erro && <p className="text-xs text-red-500 mb-3">{erro}</p>}
              <button
                onClick={confirmar}
                disabled={saving}
                className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60"
                style={{ background: PRIMARY }}
              >
                {saving ? 'Enviando…' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
