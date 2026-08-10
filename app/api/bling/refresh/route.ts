import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const sb = getSupabaseAdmin()

  const { data: row } = await sb
    .from('ecouni_bling_tokens')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!row) {
    return NextResponse.json({ error: 'Nenhum token encontrado' }, { status: 404 })
  }

  const clientId     = process.env.BLING_CLIENT_ID!
  const clientSecret = process.env.BLING_CLIENT_SECRET!
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: row.refresh_token,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: 'Falha ao renovar token', detail: err }, { status: 500 })
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  await sb.from('ecouni_bling_tokens')
    .update({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    expiresAt,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', row.id)

  return NextResponse.json({ ok: true, expires_at: expiresAt })
}
