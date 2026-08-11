'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { Participante, Grupo } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

function formatWhatsapp(w: string): string {
  const d = w.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return w
}

function maskCpf(cpf: string | null): string {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return cpf
}

type ParticipanteComGrupo = Participante & { ecouni_grupos: Pick<Grupo, 'nome'> | null }

export default function ParticipantesPage() {
  const [lista,        setLista]        = useState<ParticipanteComGrupo[]>([])
  const [grupos,       setGrupos]       = useState<Pick<Grupo, 'id' | 'nome'>[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filtroGrupo,  setFiltroGrupo]  = useState('')
  const [togglingId,   setTogglingId]   = useState<string | null>(null)

  async function carregar() {
    const { data } = await getSupabase()
      .from('ecouni_participantes')
      .select('*, ecouni_grupos(nome)')
      .order('nome')
    setLista((data as ParticipanteComGrupo[]) || [])
    setLoading(false)
  }

  async function carregarGrupos() {
    const { data } = await getSupabase()
      .from('ecouni_grupos')
      .select('id, nome')
      .order('nome')
    setGrupos(data || [])
  }

  useEffect(() => {
    carregar()
    carregarGrupos()
  }, [])

  async function toggleAtivo(p: ParticipanteComGrupo) {
    setTogglingId(p.id)
    await getSupabase()
      .from('ecouni_participantes')
      .update({ ativo: !p.ativo })
      .eq('id', p.id)
    await carregar()
    setTogglingId(null)
  }

  const filtrados = filtroGrupo
    ? lista.filter(p => p.grupo_id === filtroGrupo)
    : lista

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Participantes</h1>
          <p className="text-xs text-gray-400 mt-0.5">Consumidores cadastrados pela Feira EcoUni</p>
        </div>
        <select
          value={filtroGrupo}
          onChange={e => setFiltroGrupo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1B5E37] bg-white"
        >
          <option value="">Todos os grupos</option>
          {grupos.map(g => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-12 text-center">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-gray-500 text-sm">Nenhum participante cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Grupo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">CPF</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ativo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Bling</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                    {formatWhatsapp(p.whatsapp)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {p.ecouni_grupos?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden lg:table-cell">
                    {maskCpf(p.cpf)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleAtivo(p)}
                      disabled={togglingId === p.id}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-opacity ${
                        togglingId === p.id ? 'opacity-40' : ''
                      } ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {p.bling_cliente_id ? (
                      <span className="text-green-600 font-bold">✓</span>
                    ) : (
                      <span className="text-red-400 font-bold">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
            {filtrados.length} participante{filtrados.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
