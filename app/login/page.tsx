'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import { PRIMARY } from '@/lib/brand'

export default function LoginPage() {
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')
  const [msg,     setMsg]     = useState('')
  const [modo,    setModo]    = useState<'login' | 'recuperar'>('login')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await getSupabase().auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setErro('Erro ao enviar email.')
    } else {
      setMsg('Email enviado! Verifique sua caixa de entrada.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F7F4] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo_ecouni.png"
            alt="EcoUni"
            width={180}
            height={72}
            className="object-contain"
            priority
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {modo === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
                  placeholder="••••••••"
                />
              </div>
              {erro && <p className="text-xs text-red-500">{erro}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: PRIMARY }}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
              <button
                type="button"
                onClick={() => setModo('recuperar')}
                className="w-full text-xs text-gray-400 hover:text-gray-600 text-center pt-1"
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleRecuperar} className="space-y-4">
              <p className="text-sm text-gray-600">Digite seu email para receber o link de redefinição.</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1B5E37]"
                  placeholder="seu@email.com"
                />
              </div>
              {erro && <p className="text-xs text-red-500">{erro}</p>}
              {msg  && <p className="text-xs text-green-600">{msg}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: PRIMARY }}
              >
                {loading ? 'Enviando…' : 'Enviar link'}
              </button>
              <button
                type="button"
                onClick={() => { setModo('login'); setMsg('') }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 text-center pt-1"
              >
                Voltar ao login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
