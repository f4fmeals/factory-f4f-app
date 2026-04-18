'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setACarregar(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('error:', error)
    console.log('user:', data?.user)

    if (error) {
      setErro('Email ou password incorretos.')
      setACarregar(false)
      return
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('perfis')
      .select('role')
      .eq('id', data.user.id)
      .single()

    console.log('perfil:', perfil)
    console.log('perfilError:', perfilError)

    if (perfil?.role === 'gestor') {
      router.push('/')
    } else {
      router.push('/tablet')
    }

    setACarregar(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '2rem', background: '#f9fafb' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: '#000000' }}>
          Factory F4F
        </h1>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#000000' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem 0.75rem', borderRadius: '6px', background: '#ffffff', color: '#000000', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#000000' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem 0.75rem', borderRadius: '6px', background: '#ffffff', color: '#000000', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          {erro && (
            <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{erro}</p>
          )}

          <button
            type="submit"
            disabled={aCarregar}
            style={{ width: '100%', backgroundColor: '#80c944', color: '#ffffff', padding: '0.625rem', borderRadius: '6px', fontWeight: '500', fontSize: '1rem', border: 'none', cursor: 'pointer' }}
          >
            {aCarregar ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}