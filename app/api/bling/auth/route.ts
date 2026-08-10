import { NextResponse } from 'next/server'

export async function GET() {
  const clientId    = process.env.BLING_CLIENT_ID!
  const redirectUri = process.env.BLING_REDIRECT_URI!

  const url = new URL('https://www.bling.com.br/Api/v3/oauth/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('state', 'ecouni')

  return NextResponse.redirect(url.toString())
}
