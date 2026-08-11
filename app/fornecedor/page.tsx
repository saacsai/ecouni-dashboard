'use client'

import { useState } from 'react'

const PRIMARY = '#1B5E37'

function fmtWhats(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

type Etapa = 'form' | 'sucesso'

export default function FornecedorPage() {
  const [etapa,  setEtapa]  = useState<Etapa>('form')
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState('')
  const [form, setForm] = useState({
    nome: '', contato_nome: '', whatsapp: '', municipio: '', uf: '',
  })

  function set(key: keyof typeof form, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErro('')

    const res = await fetch('/api/fornecedores/cadastro', {
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

  if (etapa === 'sucesso') {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cadastro recebido!</h1>
          <p className="text-gray-500 text-sm">
            Em breve o gestor da EcoUni entrará em contato pelo WhatsApp{' '}
            <strong>{form.whatsapp}</strong> para configurar os produtos que você fornecerá.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: PRIMARY }}>
            🌱
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Feira EcoUni</h1>
          <p className="text-sm text-gray-500 mt-1">Para Cooperativas e Agricultores Familiares</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Cadastro de fornecedor</h2>
          <p className="text-xs text-gray-400 mb-5">
            Preencha os dados abaixo. O gestor da EcoUni entrará em contato para configurar seus produtos.
          </p>

          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome da cooperativa / produtor *
              </label>
              <input
                type="text" required value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: Coop. Verde Vale"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome do contato *
              </label>
              <input
                type="text" required value={form.contato_nome}
                onChange={e => set('contato_nome', e.target.value)}
                placeholder="Quem gerencia essa conta"
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Município *</label>
              <input
                type="text" required value={form.municipio}
                onChange={e => set('municipio', e.target.value)}
                placeholder="Ex: Campinas"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">UF *</label>
              <input
                type="text" required value={form.uf}
                onChange={e => set('uf', e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())}
                placeholder="SP"
                maxLength={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
              />
            </div>

            {erro && <p className="text-xs text-red-500">{erro}</p>}

            <button
              type="submit"
              disabled={saving || !form.nome || !form.contato_nome || !form.whatsapp || !form.municipio || !form.uf}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 mt-2"
              style={{ background: PRIMARY }}
            >
              {saving ? 'Enviando…' : 'Enviar cadastro'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Seus dados são usados apenas para contato e configuração dos produtos na feira.
          </p>
        </div>
      </div>
    </div>
  )
}
