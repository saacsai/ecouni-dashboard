import { getSupabaseAdmin } from '@/lib/supabase'

const BLING_API = 'https://www.bling.com.br/Api/v3'

async function getAccessToken(): Promise<string> {
  const sb = getSupabaseAdmin()

  const { data: row } = await sb
    .from('ecouni_bling_tokens')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!row) throw new Error('Bling não conectado. Acesse /dashboard/admin/bling para autorizar.')

  // Renova se expira em menos de 5 minutos
  const expiresAt = new Date(row.expires_at).getTime()
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'supabase.co')}/api/bling/refresh`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Falha ao renovar token Bling')
    const { data: fresh } = await sb
      .from('ecouni_bling_tokens')
      .select('access_token')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    return fresh!.access_token
  }

  return row.access_token
}

export async function blingGet(path: string) {
  const token = await getAccessToken()
  const res = await fetch(`${BLING_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Bling GET ${path} falhou: ${res.status}`)
  return res.json()
}

export async function blingPost(path: string, body: object) {
  const token = await getAccessToken()
  const res = await fetch(`${BLING_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bling POST ${path} falhou: ${res.status} — ${err}`)
  }
  return res.json()
}

export async function blingPatch(path: string, body: object) {
  const token = await getAccessToken()
  const res = await fetch(`${BLING_API}${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Bling PATCH ${path} falhou: ${res.status} — ${err}`)
  }
  return res.json()
}
