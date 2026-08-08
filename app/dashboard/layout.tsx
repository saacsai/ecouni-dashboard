'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
    })
  }, [router])

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 min-h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
