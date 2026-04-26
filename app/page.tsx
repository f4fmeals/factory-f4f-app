// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Inicio() {
  const router = useRouter()
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [role, setRole] = useState('')
  const [aVerificar, setAVerificar] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')

  useEffect(() => {
    async function carregarPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase.from('perfis').select('nome, role').eq('id', user.id).single()
      if (perfil) {
        setNomeUtilizador(perfil.nome)
        setRole(perfil.role || '')
      }
    }
    carregarPerfil()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function entrarNaArea(area: 'gestao' | 'cozinha' | 'haccp' | 'faltas') {
    setMensagemErro('')
    setAVerificar(true)
    const rolesPermitidos: Record<string, string[]> = {
      gestao: ['gestor'],
      cozinha: ['cozinha', 'gestor'],
      haccp: ['cozinha', 'gestor', 'lojista'],
      faltas: ['cozinha', 'gestor', 'lojista'],
    }
    if (!rolesPermitidos[area].includes(role)) {
      setMensagemErro('Não tens acesso a esta área.')
      setAVerificar(false)
      return
    }
    router.push(`/${area}`)
    setAVerificar(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', padding: '6px 32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {nomeUtilizador && <span style={{ color: '#6b7280', fontSize: '13px' }}>Olá, {nomeUtilizador}</span>}
          <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>Sair da sessão</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: '28px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>Cozinha Industrial</p>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '48px' }}>Escolhe a área que queres aceder</p>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => entrarNaArea('gestao')}
            disabled={aVerificar}
            style={{ width: '220px', height: '180px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#80c944'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <span style={{ fontSize: '48px' }}>📋</span>
            <span style={{ fontSize: '18px', fontWeight: '500', color: '#111' }}>Gestão</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Planeamento e produção</span>
          </button>

          <button
            onClick={() => entrarNaArea('cozinha')}
            disabled={aVerificar}
            style={{ width: '220px', height: '180px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#80c944'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <span style={{ fontSize: '48px' }}>👨‍🍳</span>
            <span style={{ fontSize: '18px', fontWeight: '500', color: '#111' }}>Cozinha</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Execução e registo</span>
          </button>

          <button
            onClick={() => entrarNaArea('haccp')}
            disabled={aVerificar}
            style={{ width: '220px', height: '180px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#80c944'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <span style={{ fontSize: '48px' }}>🧪</span>
            <span style={{ fontSize: '18px', fontWeight: '500', color: '#111' }}>HACCP</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Controlo e registos</span>
          </button>

          <button
            onClick={() => entrarNaArea('faltas')}
            disabled={aVerificar}
            style={{ width: '220px', height: '180px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#80c944'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
          >
            <span style={{ fontSize: '48px' }}>🛒</span>
            <span style={{ fontSize: '18px', fontWeight: '500', color: '#111' }}>Faltas</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Lista de compras</span>
          </button>
        </div>

        {mensagemErro && (
          <p style={{ marginTop: '24px', color: '#dc2626', fontSize: '14px', background: '#fee2e2', padding: '10px 20px', borderRadius: '8px' }}>
            {mensagemErro}
          </p>
        )}
      </div>
    </div>
  )
}