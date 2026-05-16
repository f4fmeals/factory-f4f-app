// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Instalacao = {
  id: number
  nome: string
  morada: string | null
  ativo: boolean
  ordem: number
  tem_fabrico: boolean
}

type Staff = {
  id: number
  instalacao_id: number
  nome: string
  ativo: boolean
  ordem: number
}

type RegistoConsumo = {
  id: string
  instalacao_id: number
  tipo: 'consumo' | 'desperdicio'
  produto: string
  quantidade: number
  unidade: string
  motivo: string | null
  registado_por: string | null
  registado_por_nome: string | null
  criado_em: string
}

const CHAVE_INSTALACAO = 'consumos_instalacao_id'

export default function ConsumosHome() {
  const router = useRouter()
  const [aVerificar, setAVerificar] = useState(true)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [roleUtilizador, setRoleUtilizador] = useState('')
  const [userId, setUserId] = useState('')
  const ehGestor = roleUtilizador === 'gestor'

  // Instalações
  const [instalacoes, setInstalacoes] = useState<Instalacao[]>([])
  const [instalacaoSel, setInstalacaoSel] = useState<Instalacao | null>(null)
  const [aCarregarInstalacoes, setACarregarInstalacoes] = useState(false)

  // Staff
  const [staff, setStaff] = useState<Staff[]>([])

  // Registos recentes
  const [registos, setRegistos] = useState<RegistoConsumo[]>([])
  const [aCarregarRegistos, setACarregarRegistos] = useState(false)

  // Modal de registo
  const [modalAberto, setModalAberto] = useState(false)
  const [formTipo, setFormTipo] = useState<'consumo' | 'desperdicio'>('consumo')
  const [formProduto, setFormProduto] = useState('')
  const [formQuantidade, setFormQuantidade] = useState('')
  const [formUnidade, setFormUnidade] = useState('kg')
  const [formMotivo, setFormMotivo] = useState('')
  const [formStaff, setFormStaff] = useState('')
  const [aGuardar, setAGuardar] = useState(false)

  // ===== Inicialização =====
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase.from('perfis').select('nome, role').eq('id', user.id).single()
      if (!perfil || !['gestor', 'cozinha'].includes(perfil.role)) {
        router.push('/')
        return
      }
      setNomeUtilizador(perfil.nome)
      setRoleUtilizador(perfil.role)
      setUserId(user.id)
      setAVerificar(false)
      await carregarInstalacoes()
    }
    verificarAcesso()
  }, [])

  useEffect(() => {
    if (instalacaoSel) {
      carregarStaff(instalacaoSel.id)
      carregarRegistos(instalacaoSel.id)
    } else {
      setStaff([])
      setRegistos([])
    }
  }, [instalacaoSel])

  useEffect(() => {
    document.body.style.overflow = modalAberto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalAberto])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function formatarDataHora(iso: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return `${data} ${hora}`
  }

  // ===== INSTALAÇÕES =====
  async function carregarInstalacoes() {
    setACarregarInstalacoes(true)
    const { data, error } = await supabase
      .from('instalacoes')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('id', { ascending: true })
    if (!error) {
      const lista = (data as Instalacao[]) || []
      setInstalacoes(lista)
      const idGuardado = typeof window !== 'undefined' ? sessionStorage.getItem(CHAVE_INSTALACAO) : null
      if (idGuardado) {
        const encontrada = lista.find((i) => String(i.id) === idGuardado)
        if (encontrada) setInstalacaoSel(encontrada)
      }
    }
    setACarregarInstalacoes(false)
  }

  function escolherInstalacao(inst: Instalacao) {
    setInstalacaoSel(inst)
    if (typeof window !== 'undefined') sessionStorage.setItem(CHAVE_INSTALACAO, String(inst.id))
  }

  function trocarInstalacao() {
    setInstalacaoSel(null)
    if (typeof window !== 'undefined') sessionStorage.removeItem(CHAVE_INSTALACAO)
  }

  // ===== STAFF =====
  async function carregarStaff(instalacaoId: number) {
    const { data, error } = await supabase
      .from('haccp_staff')
      .select('*')
      .eq('instalacao_id', instalacaoId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })
    if (!error) setStaff((data as Staff[]) || [])
  }

  // ===== REGISTOS =====
  async function carregarRegistos(instalacaoId: number) {
    setACarregarRegistos(true)
    const { data, error } = await supabase
      .from('consumos')
      .select('*')
      .eq('instalacao_id', instalacaoId)
      .order('criado_em', { ascending: false })
      .limit(30)
    if (!error) setRegistos((data as RegistoConsumo[]) || [])
    setACarregarRegistos(false)
  }

  function abrirModalRegisto() {
    setFormTipo('consumo')
    setFormProduto('')
    setFormQuantidade('')
    setFormUnidade('kg')
    setFormMotivo('')
    setFormStaff('')
    setModalAberto(true)
  }

  function fecharModalRegisto() { setModalAberto(false) }

  async function guardarRegisto() {
    if (!instalacaoSel) return
    if (!formProduto.trim()) { alert('Indica o produto.'); return }
    const qtd = parseFloat(formQuantidade.replace(',', '.'))
    if (isNaN(qtd) || qtd <= 0) { alert('Indica uma quantidade válida.'); return }
    if (formTipo === 'desperdicio' && !formMotivo.trim()) { alert('Indica o motivo do desperdício.'); return }
    if (!formStaff.trim()) { alert('Seleciona o funcionário.'); return }

    setAGuardar(true)
    const { error } = await supabase.from('consumos').insert([{
      instalacao_id: instalacaoSel.id,
      tipo: formTipo,
      produto: formProduto.trim(),
      quantidade: qtd,
      unidade: formUnidade,
      motivo: formMotivo.trim() || null,
      registado_por: userId || null,
      registado_por_nome: formStaff.trim(),
    }])
    if (error) {
      alert('Erro ao guardar o registo.')
      setAGuardar(false)
      return
    }
    await carregarRegistos(instalacaoSel.id)
    fecharModalRegisto()
    setAGuardar(false)
  }

  // ===== RENDER =====
  if (aVerificar) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>A carregar...</p>
      </div>
    )
  }

  const barraTopo = (
    <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', padding: '6px 32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {nomeUtilizador && <span style={{ color: '#6b7280', fontSize: '13px' }}>Olá, {nomeUtilizador}</span>}
        <button onClick={() => router.push('/')} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>← Início</button>
        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>Sair da sessão</button>
      </div>
    </div>
  )

  // Ecrã de seleção de loja
  if (!instalacaoSel) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        {barraTopo}
        <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>Consumos / Desperdício</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Escolhe a loja com a qual queres trabalhar</p>
          </div>
          {aCarregarInstalacoes ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>A carregar...</p>
          ) : instalacoes.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🏪</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: '0 0 4px' }}>Ainda não há lojas criadas</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Cria as lojas na área de HACCP primeiro.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
              {instalacoes.map((inst) => (
                <button key={inst.id} onClick={() => escolherInstalacao(inst)}
                  style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#80c944'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}>
                  <p style={{ fontSize: '28px', margin: '0 0 8px' }}>🏪</p>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#111', margin: '0 0 4px' }}>{inst.nome}</p>
                  {inst.morada && <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{inst.morada}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Ecrã principal
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {barraTopo}
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>
              Consumos / Desperdício · <span style={{ color: '#80c944' }}>{instalacaoSel.nome}</span>
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {instalacaoSel.morada || 'Registo de consumos e desperdício'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={abrirModalRegisto}
              style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
              + Novo registo
            </button>
            <button onClick={trocarInstalacao}
              style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
              🔄 Trocar loja
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 16px' }}>📋 Registos recentes <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '13px' }}>(últimos 30)</span></p>
          {aCarregarRegistos ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : registos.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há registos. Clica em "+ Novo registo" para começar.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Data/Hora</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Tipo</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Produto</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Qtd.</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Motivo</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Funcionário</th>
                  </tr>
                </thead>
                <tbody>
                  {registos.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{formatarDataHora(r.criado_em)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '99px',
                          background: r.tipo === 'desperdicio' ? '#fee2e2' : '#dcfce7',
                          color: r.tipo === 'desperdicio' ? '#991b1b' : '#166534',
                        }}>
                          {r.tipo === 'desperdicio' ? '🗑️ Desperdício' : '🍽️ Consumo'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#111', fontWeight: '500' }}>{r.produto}</td>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{r.quantidade} {r.unidade}</td>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{r.motivo || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{r.registado_por_nome || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {renderModalRegisto()}
    </div>
  )

  // ===================== RENDERS =====================

  function renderModalRegisto() {
    if (!modalAberto) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) fecharModalRegisto() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>Novo registo</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{instalacaoSel?.nome}</p>
            </div>
            <button onClick={fecharModalRegisto} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Tipo */}
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>Tipo de registo *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setFormTipo('consumo')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                    border: formTipo === 'consumo' ? '2px solid #80c944' : '1px solid #e5e7eb',
                    background: formTipo === 'consumo' ? '#f0fdf4' : '#fff',
                    color: formTipo === 'consumo' ? '#166534' : '#6b7280',
                  }}>
                  🍽️ Consumo
                </button>
                <button onClick={() => setFormTipo('desperdicio')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                    border: formTipo === 'desperdicio' ? '2px solid #dc2626' : '1px solid #e5e7eb',
                    background: formTipo === 'desperdicio' ? '#fef2f2' : '#fff',
                    color: formTipo === 'desperdicio' ? '#991b1b' : '#6b7280',
                  }}>
                  🗑️ Desperdício
                </button>
              </div>
            </div>

            {/* Produto */}
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Produto / artigo *</label>
              <input type="text" value={formProduto} onChange={(e) => setFormProduto(e.target.value)}
                placeholder="ex: Peito de frango"
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
            </div>

            {/* Quantidade + Unidade */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Quantidade *</label>
                <input type="text" inputMode="decimal" value={formQuantidade}
                  onChange={(e) => setFormQuantidade(e.target.value)}
                  placeholder="ex: 2,5"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Unidade *</label>
                <select value={formUnidade} onChange={(e) => setFormUnidade(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                  <option value="un">un</option>
                  <option value="cx">cx</option>
                </select>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Motivo {formTipo === 'desperdicio' ? '*' : '(opcional)'}
              </label>
              <textarea value={formMotivo} onChange={(e) => setFormMotivo(e.target.value)} rows={2}
                placeholder={formTipo === 'desperdicio' ? 'ex: Fora de validade, queimado, sobra de serviço...' : 'Notas adicionais (opcional)'}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', resize: 'vertical' }} />
            </div>

            {/* Funcionário */}
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Funcionário *</label>
              {staff.length === 0 ? (
                <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                  Ainda não há funcionários nesta loja. Adiciona-os na área de HACCP em "⚙️ Configurações".
                </div>
              ) : (
                <select value={formStaff} onChange={(e) => setFormStaff(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                  <option value="">— Seleciona quem fez o registo —</option>
                  {staff.map((s) => (<option key={s.id} value={s.nome}>{s.nome}</option>))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={guardarRegisto} disabled={aGuardar || staff.length === 0}
                style={{ background: staff.length === 0 ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: staff.length === 0 ? 'not-allowed' : 'pointer' }}>
                {aGuardar ? 'A guardar...' : 'Guardar registo'}
              </button>
              <button onClick={fecharModalRegisto} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}