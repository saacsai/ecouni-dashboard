'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PRIMARY } from '@/lib/brand'

function fmtWhats(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function fmtCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

type Etapa = 'form' | 'sucesso'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function GrupoPage() {
  const [etapa,      setEtapa]      = useState<Etapa>('form')
  const [saving,     setSaving]     = useState(false)
  const [erro,       setErro]       = useState('')
  const [cepLoading, setCepLoading] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    dia_retirada: '',
    horario_retirada_inicio: '',
    contato_nome: '',
    contato_whatsapp: '',
    contato_email: '',
    status_formacao: '' as '' | 'em_formacao' | 'formado',
    qtd_participantes_estimada: '',
    acesso_restrito: false,
  })

  function set<K extends keyof typeof form>(key: K, val: string) {
    setForm(p => ({ ...p, [key]: val }))
  }

  async function onCepBlur() {
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(p => ({
          ...p,
          endereco: data.logradouro || p.endereco,
          bairro:   data.bairro     || p.bairro,
          municipio: data.localidade || p.municipio,
          uf:       (data.uf || p.uf).toUpperCase().slice(0, 2),
        }))
      }
    } catch {
      // silently ignore network errors
    } finally {
      setCepLoading(false)
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErro('')

    const res = await fetch('/api/grupos/cadastro', {
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
    form.nome && form.cep && form.endereco && form.numero &&
    form.municipio && form.uf && form.dia_retirada &&
    form.horario_retirada_inicio && form.contato_nome &&
    form.contato_whatsapp && form.contato_email && form.status_formacao

  if (etapa === 'sucesso') {
    return (
      <div className="min-h-screen bg-[#F2F7F4] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cadastro recebido!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Obrigado, <strong>{form.contato_nome.split(' ')[0]}</strong>! O cadastro do grupo{' '}
            <strong>{form.nome}</strong> foi enviado com sucesso. Nossa equipe entrará em contato
            pelo WhatsApp ou e-mail para confirmar a aprovação.
          </p>
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-gray-700">Próximo passo</p>
            <p className="text-sm text-gray-500">
              Após a aprovação do grupo, os participantes poderão se cadastrar em{' '}
              <strong>ecouni.lucianomaeda.com.br/participar</strong> e começar a fazer pedidos
              semanais.
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
          <h2 className="text-base font-semibold text-gray-900 mb-1">Quero que meu grupo participe</h2>
          <p className="text-xs text-gray-400 mb-5">
            Cadastre sua empresa ou organização para receber produtos de agricultura familiar toda semana.
          </p>

          <form onSubmit={enviar} className="space-y-4">

            {/* Nome do grupo */}
            <div>
              <label className={labelCls}>Nome do grupo *</label>
              <input
                type="text" required value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder="Ex: UNIFORJA"
                className={inputCls}
              />
            </div>

            {/* CEP */}
            <div>
              <label className={labelCls}>CEP *</label>
              <div className="relative">
                <input
                  type="text" required value={form.cep}
                  onChange={e => set('cep', fmtCEP(e.target.value))}
                  onBlur={onCepBlur}
                  placeholder="00000-000"
                  className={inputCls}
                />
                {cepLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Buscando…
                  </span>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className={labelCls}>Endereço *</label>
              <input
                type="text" required value={form.endereco}
                onChange={e => set('endereco', e.target.value)}
                placeholder="Ex: Rua das Flores"
                className={inputCls}
              />
            </div>

            {/* Número */}
            <div>
              <label className={labelCls}>Número *</label>
              <input
                type="text" required value={form.numero}
                onChange={e => set('numero', e.target.value)}
                placeholder="Ex: 123"
                className={inputCls}
              />
            </div>

            {/* Complemento */}
            <div>
              <label className={labelCls}>Complemento</label>
              <input
                type="text" value={form.complemento}
                onChange={e => set('complemento', e.target.value)}
                placeholder="Apto, sala, bloco… (opcional)"
                className={inputCls}
              />
            </div>

            {/* Bairro */}
            <div>
              <label className={labelCls}>Bairro</label>
              <input
                type="text" value={form.bairro}
                onChange={e => set('bairro', e.target.value)}
                placeholder="Ex: Centro"
                className={inputCls}
              />
            </div>

            {/* Município */}
            <div>
              <label className={labelCls}>Município *</label>
              <input
                type="text" required value={form.municipio}
                onChange={e => set('municipio', e.target.value)}
                placeholder="Ex: Santo André"
                className={inputCls}
              />
            </div>

            {/* UF */}
            <div>
              <label className={labelCls}>UF *</label>
              <input
                type="text" required value={form.uf}
                onChange={e => set('uf', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className={inputCls}
              />
            </div>

            {/* Dia de realização */}
            <div>
              <label className={labelCls}>Dia de realização *</label>
              <select
                required value={form.dia_retirada}
                onChange={e => set('dia_retirada', e.target.value)}
                className={inputCls + ' bg-white'}
              >
                <option value="">Selecione o dia…</option>
                <option value="quinta">Quinta-feira</option>
                <option value="sexta">Sexta-feira</option>
                <option value="sabado">Sábado</option>
              </select>
            </div>

            {/* Horário */}
            <div>
              <label className={labelCls}>Horário de retirada *</label>
              <input
                type="time" required value={form.horario_retirada_inicio}
                onChange={e => set('horario_retirada_inicio', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Nome do responsável */}
            <div>
              <label className={labelCls}>Nome do responsável *</label>
              <input
                type="text" required value={form.contato_nome}
                onChange={e => set('contato_nome', e.target.value)}
                placeholder="Quem vai coordenar as retiradas"
                className={inputCls}
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className={labelCls}>Telefone / WhatsApp *</label>
              <input
                type="text" required value={form.contato_whatsapp}
                onChange={e => set('contato_whatsapp', fmtWhats(e.target.value))}
                placeholder="(11) 99999-0000"
                className={inputCls}
              />
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email *</label>
              <input
                type="email" required value={form.contato_email}
                onChange={e => set('contato_email', e.target.value)}
                placeholder="responsavel@empresa.com.br"
                className={inputCls}
              />
            </div>

            {/* Status do grupo */}
            <div>
              <label className={labelCls}>Status do grupo *</label>
              <div className="space-y-2 mt-1">
                {[
                  { value: 'em_formacao', label: 'Grupo em formação', desc: 'Ainda estamos reunindo participantes' },
                  { value: 'formado',     label: 'Grupo formado',     desc: 'Já temos participantes confirmados' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.status_formacao === opt.value
                        ? 'border-[#1B5E37] bg-[#F2F7F4]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status_formacao"
                      value={opt.value}
                      checked={form.status_formacao === opt.value}
                      onChange={e => set('status_formacao', e.target.value)}
                      className="mt-0.5 accent-[#1B5E37]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Quantidade de participantes — só quando formado */}
            {form.status_formacao === 'formado' && (
              <div>
                <label className={labelCls}>Quantos participantes?</label>
                <input
                  type="number" min={1} value={form.qtd_participantes_estimada}
                  onChange={e => set('qtd_participantes_estimada', e.target.value)}
                  placeholder="Ex: 20"
                  className={inputCls}
                />
              </div>
            )}

            {/* Acesso ao grupo */}
            <div>
              <label className={labelCls}>Quem pode participar? *</label>
              <div className="space-y-2 mt-1">
                {[
                  { value: false, label: 'Grupo aberto', desc: 'Qualquer pessoa pode se cadastrar sem autorização' },
                  { value: true,  label: 'Requer autorização', desc: 'O responsável aprova cada novo participante' },
                ].map(opt => (
                  <label
                    key={String(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.acesso_restrito === opt.value
                        ? 'border-[#1B5E37] bg-[#F2F7F4]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="acesso_restrito"
                      checked={form.acesso_restrito === opt.value}
                      onChange={() => setForm(p => ({ ...p, acesso_restrito: opt.value }))}
                      className="mt-0.5 accent-[#1B5E37]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {erro && <p className="text-xs text-red-500">{erro}</p>}

            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 mt-2"
              style={{ background: PRIMARY }}
            >
              {saving ? 'Enviando…' : 'Solicitar participação'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Após o cadastro, nossa equipe entrará em contato para configurar as retiradas.
          </p>
        </div>
      </div>
    </div>
  )
}
