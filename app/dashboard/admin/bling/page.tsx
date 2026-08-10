'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

const PRIMARY = '#1B5E37'

export default function BlingAdminPage() {
  const [token,    setToken]    = useState<{ expires_at: string; updated_at: string } | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [renovando, setRenovando] = useState(false)
  const [msg,      setMsg]      = useState('')

  async function carregar() {
    const { data } = await getSupabase()
      .from('ecouni_bling_tokens')
      .select('expires_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    setToken(data)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function renovar() {
    setRenovando(true)
    setMsg('')
    const res = await fetch('/api/bling/refresh', { method: 'POST' })
    if (res.ok) {
      setMsg('Token renovado com sucesso.')
      carregar()
    } else {
      setMsg('Erro ao renovar token. Reconecte o Bling.')
    }
    setRenovando(false)
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR')
  }

  function isExpirado(iso: string) {
    return new Date(iso).getTime() < Date.now()
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Integração Bling</h1>
        <p className="text-xs text-gray-400 mt-0.5">Conexão OAuth com o Bling v3</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : token ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isExpirado(token.expires_at) ? 'bg-red-500' : 'bg-green-500'}`} />
            <p className="text-sm font-medium text-gray-900">
              {isExpirado(token.expires_at) ? 'Token expirado' : 'Bling conectado'}
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Última atualização: <strong>{fmtDate(token.updated_at)}</strong></p>
            <p>Expira em: <strong className={isExpirado(token.expires_at) ? 'text-red-500' : ''}>{fmtDate(token.expires_at)}</strong></p>
          </div>

          {msg && <p className="text-xs text-green-600">{msg}</p>}

          <div className="flex gap-2">
            <button onClick={renovar} disabled={renovando}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: PRIMARY }}>
              {renovando ? 'Renovando…' : 'Renovar token'}
            </button>
            <a href="/api/bling/auth"
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
              Reconectar
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-gray-700 font-medium mb-1">Bling não conectado</p>
          <p className="text-xs text-gray-400 mb-6">Autorize o acesso para que o sistema possa criar pedidos e emitir NF-e.</p>
          <a href="/api/bling/auth"
            className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: PRIMARY }}>
            Conectar Bling
          </a>
        </div>
      )}
    </div>
  )
}
