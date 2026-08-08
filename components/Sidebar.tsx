'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Perfil } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

interface NavItem {
  label: string
  href: string
  icon: string
  perfis: Perfil[]
}

interface NavSection {
  titulo: string
  itens: NavItem[]
}

const NAV: NavSection[] = [
  {
    titulo: 'OPERAÇÃO',
    itens: [
      { label: 'Disponibilidade',   href: '/dashboard/disponibilidade', icon: '🌾', perfis: ['admin','gestor','analista'] },
      { label: 'Cardápio',          href: '/dashboard/cardapio',        icon: '📋', perfis: ['admin','gestor','analista'] },
      { label: 'Ciclos',            href: '/dashboard/ciclos',          icon: '🔄', perfis: ['admin','gestor','analista'] },
      { label: 'Pedidos',           href: '/dashboard/pedidos',         icon: '🛒', perfis: ['admin','gestor','analista'] },
      { label: 'Visão do Gestor',   href: '/dashboard/visao',           icon: '📊', perfis: ['admin','gestor'] },
    ],
  },
  {
    titulo: 'ESTOQUE',
    itens: [
      { label: 'Estoque Físico',    href: '/dashboard/estoque',         icon: '📦', perfis: ['admin','gestor','operador'] },
      { label: 'Consignação',       href: '/dashboard/consignacao',     icon: '🚛', perfis: ['admin','gestor'] },
    ],
  },
  {
    titulo: 'ATACADO',
    itens: [
      { label: 'Vendas Atacado',    href: '/dashboard/atacado',         icon: '🏪', perfis: ['admin','gestor','analista'] },
    ],
  },
  {
    titulo: 'CADASTROS',
    itens: [
      { label: 'Produtos',          href: '/dashboard/produtos',        icon: '🥦', perfis: ['admin','gestor'] },
      { label: 'Fornecedores',      href: '/dashboard/fornecedores',    icon: '🤝', perfis: ['admin','gestor'] },
      { label: 'Grupos',            href: '/dashboard/grupos',          icon: '🏢', perfis: ['admin','gestor'] },
      { label: 'Funcionários',      href: '/dashboard/funcionarios',    icon: '👤', perfis: ['admin','gestor','analista'] },
    ],
  },
  {
    titulo: 'ADMIN',
    itens: [
      { label: 'Preços',            href: '/dashboard/precos',          icon: '💰', perfis: ['admin','gestor'] },
      { label: 'Usuários',          href: '/dashboard/usuarios',        icon: '⚙️',  perfis: ['admin'] },
    ],
  },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [perfil,  setPerfil]  = useState<Perfil>('operador')
  const [nome,    setNome]    = useState('')
  const [open,    setOpen]    = useState(false)

  useEffect(() => {
    getSupabase().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await getSupabase()
        .from('ecouni_usuarios')
        .select('nome, perfil')
        .eq('id', user.id)
        .single()
      if (data) {
        setPerfil(data.perfil as Perfil)
        setNome(data.nome)
      }
    })
  }, [])

  async function sair() {
    await getSupabase().auth.signOut()
    router.push('/login')
  }

  const visivel = (item: NavItem) => item.perfis.includes(perfil)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md"
        style={{ background: PRIMARY }}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ width: 256 }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ background: PRIMARY }}
          >
            🌿
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">EcoUni</p>
            <p className="text-[10px] text-gray-400 leading-tight">Agricultura Familiar</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV.map(section => {
            const itensVisiveis = section.itens.filter(visivel)
            if (itensVisiveis.length === 0) return null
            return (
              <div key={section.titulo}>
                <p className="px-2 mb-1.5 text-[10px] font-semibold text-gray-400 tracking-widest">
                  {section.titulo}
                </p>
                <ul className="space-y-0.5">
                  {itensVisiveis.map(item => {
                    const ativo = pathname.startsWith(item.href)
                    return (
                      <li key={item.href}>
                        <button
                          onClick={() => { router.push(item.href); setOpen(false) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors
                            ${ativo ? 'text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                          style={ativo ? { background: PRIMARY } : {}}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Footer user */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: PRIMARY }}
            >
              {nome.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{nome || 'Usuário'}</p>
              <p className="text-[10px] text-gray-400 capitalize">{perfil}</p>
            </div>
            <button onClick={sair} className="text-xs text-gray-400 hover:text-red-500 px-1">
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
