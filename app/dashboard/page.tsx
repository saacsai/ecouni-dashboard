'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

export default function DashboardHome() {
  const [semana, setSemana] = useState('')
  const [stats, setStats] = useState({
    fornecedores: 0,
    produtos: 0,
    pedidos: 0,
    ciclosAbertos: 0,
  })

  useEffect(() => {
    const hoje = new Date()
    const segunda = new Date(hoje)
    segunda.setDate(hoje.getDate() - hoje.getDay() + 1)
    setSemana(segunda.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))

    const sb = getSupabase()
    Promise.all([
      sb.from('ecouni_fornecedores').select('id', { count: 'exact', head: true }).eq('ativo', true),
      sb.from('ecouni_produtos').select('id', { count: 'exact', head: true }).eq('disponivel', true),
      sb.from('ecouni_pedidos').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      sb.from('ecouni_ciclos').select('id', { count: 'exact', head: true }).eq('status', 'aberto'),
    ]).then(([f, p, ped, c]) => {
      setStats({
        fornecedores:  f.count  ?? 0,
        produtos:      p.count  ?? 0,
        pedidos:       ped.count ?? 0,
        ciclosAbertos: c.count  ?? 0,
      })
    })
  }, [])

  const cards = [
    { label: 'Fornecedores ativos',  value: stats.fornecedores,  icon: '🤝', href: '/dashboard/fornecedores' },
    { label: 'Produtos no cardápio', value: stats.produtos,       icon: '🥦', href: '/dashboard/cardapio' },
    { label: 'Pedidos pendentes',    value: stats.pedidos,        icon: '🛒', href: '/dashboard/pedidos' },
    { label: 'Ciclos abertos',       value: stats.ciclosAbertos,  icon: '🔄', href: '/dashboard/ciclos' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Feira EcoUni</h1>
        <p className="text-sm text-gray-400 mt-1">Semana de <strong>{semana}</strong></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <a key={card.label} href={card.href}
            className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <p className="text-2xl mb-1">{card.icon}</p>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.label}</p>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Ciclo desta semana</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { dia: 'Segunda', acao: 'Cardápio publicado', cor: 'bg-blue-50 text-blue-600' },
            { dia: 'Quarta',  acao: 'Pedidos fecham',     cor: 'bg-yellow-50 text-yellow-700' },
            { dia: 'Sexta',   acao: 'Entrega + montagem', cor: 'bg-green-50 text-green-700' },
          ].map(d => (
            <div key={d.dia} className={`rounded-lg p-4 ${d.cor}`}>
              <p className="text-xs font-bold uppercase tracking-wide">{d.dia}</p>
              <p className="text-xs mt-1">{d.acao}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
