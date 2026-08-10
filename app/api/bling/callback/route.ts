import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Código não recebido' }, { status: 400 })
  }

  const clientId     = process.env.BLING_CLIENT_ID!
  const clientSecret = process.env.BLING_CLIENT_SECRET!
  const redirectUri  = process.env.BLING_REDIRECT_URI!

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: 'Falha ao obter token', detail: err }, { status: 500 })
  }

  const data = await res.json()

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  const sb = getSupabaseAdmin()

  // Limpa tokens anteriores e salva o novo
  await sb.from('ecouni_bling_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await sb.from('ecouni_bling_tokens').insert({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    expiresAt,
  })

  return NextResponse.redirect(new URL('/dashboard/admin/bling', req.nextUrl.origin))
}
