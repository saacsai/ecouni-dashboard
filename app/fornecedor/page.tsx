'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PRIMARY } from '@/lib/brand'

const TIPOS_PRODUTO = [
  'Frutas', 'Verduras', 'Legumes', 'Cereais', 'Granjeiros',
  'Minimamente Processados', 'Processados', 'Outros',
]

function fmtDoc(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function fmtWhats(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

type Etapa = 'form' | 'sucesso'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function FornecedorPage() {
  const [etapa,      setEtapa]      = useState<Etapa>('form')
  const [saving,     setSaving]     = useState(false)
  const [erro,       setErro]       = useState('')
  const [docLoading, setDocLoading] = useState(false)

  const [form, setForm] = useState({
    cnpj_cpf: '',
    nome: '',
    contato_nome: '',
    whatsapp: '',
    email: '',
    municipio: '',
    uf: '',
    inscricao_estadual: '',
    numero_caf: '',
    tipos_produto: [] as string[],
  })

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(p => ({ ...p, [key]: val }))
  }

  const docDigits = form.cnpj_cpf.replace(/\D/g, '')
  const isCNPJ = docDigits.length > 11
  const docLabel = isCNPJ ? 'CNPJ' : 'CPF / CNPJ'

  async function onDocBlur() {
    if (docDigits.length !== 14) return
    setDocLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${docDigits}`)
      if (res.ok) {
        const data = await res.json()
        setForm(p => ({
          ...p,
          nome:      data.razao_social || p.nome,
          email:     data.email        || p.email,
          municipio: data.municipio    || p.municipio,
          uf:        (data.uf || p.uf).toUpperCase().slice(0, 2),
        }))
      }
    } catch {
      // silently ignore
    } finally {
      setDocLoading(false)
    }
  }

  function toggleTipo(tipo: string) {
    setForm(p => ({
      ...p,
      tipos_produto: p.tipos_produto.includes(tipo)
        ? p.tipos_produto.filter(t => t !== tipo)
        : [...p.tipos_produto, tipo],
    }))
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

  const canSubmit =
    form.cnpj_cpf && form.nome && form.contato_nome &&
    form.whatsapp && form.municipio && form.uf && form.tipos_produto.length > 0

  if (etapa === 'sucesso') {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cadastro recebido!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Obrigado, <strong>{form.contato_nome.split(' ')[0]}</strong>!
            O cadastro de <strong>{form.nome}</strong> foi enviado com sucesso.
          </p>
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-gray-700">Próximo passo</p>
            <p className="text-sm text-gray-500">
              Nossa equipe entrará em contato pelo WhatsApp <strong>{form.whatsapp}</strong>{' '}
              para configurar os produtos que você fornecerá à Feira EcoUni.
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
          <h2 className="text-base font-semibold text-gray-900 mb-1">Quero fornecer para a EcoUni</h2>
          <p className="text-xs text-gray-400 mb-5">
            Cooperativas e agricultores familiares. Preencha e nossa equipe entra em contato.
          </p>

          <form onSubmit={enviar} className="space-y-4">

            {/* CNPJ / CPF */}
            <div>
              <label className={labelCls}>{docLabel} *</label>
              <div className="relative">
                <input
                  type="text" required value={form.cnpj_cpf}
                  onChange={e => set('cnpj_cpf', fmtDoc(e.target.value))}
                  onBlur={onDocBlur}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className={inputCls}
                />
                {docLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Buscando…
                  </span>
                )}
              </div>
              {isCNPJ && (
                <p className="text-xs text-gray-400 mt-1">Dados preenchidos automaticamente pelo CNPJ</p>
              )}
            </div>

            {/* Nome */}
            <div>
              <label className={labelCls}>Nome da cooperativa / produtor *</label>
              <input
                type="text" required value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: Coop. Verde Vale"
                className={inputCls}
              />
            </div>

            {/* Contato */}
            <div>
              <label className={labelCls}>Nome do responsável *</label>
              <input
                type="text" required value={form.contato_nome}
                onChange={e => set('contato_nome', e.target.value)}
                placeholder="Quem vai gerenciar a conta"
                className={inputCls}
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className={labelCls}>WhatsApp *</label>
              <input
                type="text" required value={form.whatsapp}
                onChange={e => set('whatsapp', fmtWhats(e.target.value))}
                placeholder="(11) 99999-0000"
                className={inputCls}
              />
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="contato@cooperativa.com.br"
                className={inputCls}
              />
            </div>

            {/* Município */}
            <div>
              <label className={labelCls}>Município *</label>
              <input
                type="text" required value={form.municipio}
                onChange={e => set('municipio', e.target.value)}
                placeholder="Ex: Campinas"
                className={inputCls}
              />
            </div>

            {/* UF */}
            <div>
              <label className={labelCls}>UF *</label>
              <input
                type="text" required value={form.uf}
                onChange={e => set('uf', e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase())}
                placeholder="SP"
                maxLength={2}
                className={inputCls}
              />
            </div>

            {/* Inscrição Estadual */}
            <div>
              <label className={labelCls}>Inscrição Estadual</label>
              <input
                type="text" value={form.inscricao_estadual}
                onChange={e => set('inscricao_estadual', e.target.value)}
                placeholder="Opcional"
                className={inputCls}
              />
            </div>

            {/* CAF */}
            <div>
              <label className={labelCls}>Número da CAF</label>
              <input
                type="text" value={form.numero_caf}
                onChange={e => set('numero_caf', e.target.value)}
                placeholder="Cadastro Nacional da Agricultura Familiar (opcional)"
                className={inputCls}
              />
            </div>

            {/* Tipos de produto */}
            <div>
              <label className={labelCls}>O que você produz? *</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TIPOS_PRODUTO.map(tipo => {
                  const checked = form.tipos_produto.includes(tipo)
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => toggleTipo(tipo)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        checked
                          ? 'border-[#1B5E37] bg-[#1B5E37] text-white'
                          : 'border-gray-200 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {tipo}
                    </button>
                  )
                })}
              </div>
              {form.tipos_produto.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Selecione pelo menos um tipo</p>
              )}
            </div>

            {erro && <p className="text-xs text-red-500">{erro}</p>}

            <button
              type="submit"
              disabled={saving || !canSubmit}
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
