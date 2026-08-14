'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import type { Grupo } from '@/lib/supabase'
import { PRIMARY } from '@/lib/brand'

function fmtCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function fmtWhats(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

type Etapa = 'form' | 'sucesso'

export default function ParticiparPage() {
  const [grupos,  setGrupos]  = useState<Pick<Grupo, 'id' | 'nome' | 'municipio' | 'acesso_restrito'>[]>([])
  const [etapa,   setEtapa]   = useState<Etapa>('form')
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState('')
  const [form, setForm] = useState({
    nome: '', cpf: '', whatsapp: '', email: '', grupo_id: '',
  })

  useEffect(() => {
    getSupabase()
      .from('ecouni_grupos')
      .select('id, nome, municipio, acesso_restrito')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setGrupos(data || []))
  }, [])

  function set(key: keyof typeof form, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErro('')

    const res = await fetch('/api/participantes/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()

    if (!res.ok) {
      setErro(json.error || 'Erro ao cadastrar. Tente novamente.')
      setSaving(false)
      return
    }

    setEtapa('sucesso')
    setSaving(false)
  }

  const grupoSel = grupos.find(g => g.id === form.grupo_id)

  if (etapa === 'sucesso') {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Image src="/logo_ecouni.png" alt="EcoUni" width={160} height={64} className="object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cadastro realizado!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Bem-vindo(a) à Feira EcoUni, <strong>{form.nome.split(' ')[0]}</strong>!
            {grupoSel && <> Você está vinculado(a) ao grupo <strong>{grupoSel.nome}</strong>.</>}
          </p>
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-gray-700">Próximo passo</p>
            <p className="text-sm text-gray-500">
              Nossa assistente <strong>LIA</strong> vai entrar em contato pelo WhatsApp
              <strong> {form.whatsapp}</strong> com o cardápio da semana e para tirar suas dúvidas.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <Image src="/logo_ecouni.png" alt="EcoUni" width={180} height={72} className="object-contain" priority />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Quero participar</h2>
          <p className="text-xs text-gray-400 mb-5">
            Cadastre-se para receber o cardápio semanal e fazer seu pedido pelo WhatsApp.
          </p>

          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
              <input
                type="text" required value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Seu nome"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CPF *</label>
              <input
                type="text" required value={form.cpf}
                onChange={e => set('cpf', fmtCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp *</label>
              <input
                type="text" required value={form.whatsapp}
                onChange={e => set('whatsapp', fmtWhats(e.target.value))}
                placeholder="(11) 99999-0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="seu@email.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grupo de consumo *</label>
              <select
                required value={form.grupo_id}
                onChange={e => set('grupo_id', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37] bg-white"
              >
                <option value="">Selecione seu grupo…</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.nome}{g.municipio ? ` / ${g.municipio}` : ''}
                  </option>
                ))}
              </select>
              {grupos.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Nenhum grupo disponível no momento.</p>
              )}
              {form.grupo_id && grupos.find(g => g.id === form.grupo_id)?.acesso_restrito && (
                <p className="text-xs text-amber-600 mt-1">
                  Este grupo requer autorização do responsável. Seu cadastro ficará pendente até aprovação.
                </p>
              )}
            </div>

            {erro && <p className="text-xs text-red-500">{erro}</p>}

            <button
              type="submit"
              disabled={saving || !form.nome || !form.cpf || !form.whatsapp || !form.grupo_id}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 mt-2"
              style={{ background: PRIMARY }}
            >
              {saving ? 'Cadastrando…' : 'Quero participar'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Seus dados são usados apenas para identificação e entrega dos pedidos.
          </p>
        </div>
      </div>
    </div>
  )
}
