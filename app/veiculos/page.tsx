// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Veiculo = {
  id: number
  matricula: string
  marca: string
  modelo: string
  ano: number | null
  combustivel: string | null
  km_atuais: number
  data_proxima_ipo: string | null
  ativo: boolean
  ordem: number
}

type Condutor = {
  id: number
  nome: string
  ativo: boolean
  ordem: number
}

type RegistoSemanal = {
  id: number
  veiculo_id: number
  data_registo: string
  km: number
}

const COMBUSTIVEIS: { valor: string; label: string }[] = [
  { valor: 'gasolina', label: 'Gasolina' },
  { valor: 'gasoleo', label: 'Gasóleo' },
  { valor: 'eletrico', label: 'Elétrico' },
  { valor: 'hibrido', label: 'Híbrido' },
  { valor: 'gpl', label: 'GPL' },
  { valor: 'outro', label: 'Outro' },
]

export default function VeiculosHome() {
  const router = useRouter()
  const [aVerificar, setAVerificar] = useState(true)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [roleUtilizador, setRoleUtilizador] = useState<string>('')
  const ehGestor = roleUtilizador === 'gestor'

  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [aCarregarVeiculos, setACarregarVeiculos] = useState(false)
  const [ultimosRegistos, setUltimosRegistos] = useState<Record<number, RegistoSemanal>>({})

  // Form de veículo (criar/editar)
  const [formVeiculoAberto, setFormVeiculoAberto] = useState(false)
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState<Veiculo | null>(null)
  const [formMatricula, setFormMatricula] = useState('')
  const [formMarca, setFormMarca] = useState('')
  const [formModelo, setFormModelo] = useState('')
  const [formAno, setFormAno] = useState<string>('')
  const [formCombustivel, setFormCombustivel] = useState('gasoleo')
  const [formKm, setFormKm] = useState<string>('0')
  const [formIpo, setFormIpo] = useState('')
  const [aGuardarVeiculo, setAGuardarVeiculo] = useState(false)

  // Condutores
  const [condutores, setCondutores] = useState<Condutor[]>([])
  const [aCarregarCondutores, setACarregarCondutores] = useState(false)
  const [gestaoCondutoresAberta, setGestaoCondutoresAberta] = useState(false)
  const [condutorEmEdicao, setCondutorEmEdicao] = useState<Condutor | null>(null)
  const [novoCondutorAberto, setNovoCondutorAberto] = useState(false)
  const [formCondutorNome, setFormCondutorNome] = useState('')
  const [aGuardarCondutor, setAGuardarCondutor] = useState(false)

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
      setAVerificar(false)
      await carregarVeiculos()
      await carregarCondutores()
    }
    verificarAcesso()
  }, [])

  useEffect(() => {
    const bloquear = formVeiculoAberto || gestaoCondutoresAberta
    document.body.style.overflow = bloquear ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [formVeiculoAberto, gestaoCondutoresAberta])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ===== VEÍCULOS =====
  async function carregarVeiculos() {
    setACarregarVeiculos(true)
    const { data, error } = await supabase
      .from('veiculos')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('matricula', { ascending: true })
    if (!error) {
      const lista = (data as Veiculo[]) || []
      setVeiculos(lista)
      // Carrega o último registo semanal de cada veículo
      if (lista.length > 0) {
        const ids = lista.map(v => v.id)
        const { data: regs } = await supabase
          .from('veiculos_registos_semanais')
          .select('id, veiculo_id, data_registo, km')
          .in('veiculo_id', ids)
          .order('data_registo', { ascending: false })
        const mapa: Record<number, RegistoSemanal> = {}
        ;((regs as RegistoSemanal[]) || []).forEach(r => {
          if (!mapa[r.veiculo_id]) mapa[r.veiculo_id] = r
        })
        setUltimosRegistos(mapa)
      } else {
        setUltimosRegistos({})
      }
    }
    setACarregarVeiculos(false)
  }

  function abrirFormNovoVeiculo() {
    if (!ehGestor) return
    setVeiculoEmEdicao(null)
    setFormMatricula(''); setFormMarca(''); setFormModelo('')
    setFormAno(''); setFormCombustivel('gasoleo'); setFormKm('0'); setFormIpo('')
    setFormVeiculoAberto(true)
  }

  function abrirFormEditarVeiculo(v: Veiculo) {
    if (!ehGestor) return
    setVeiculoEmEdicao(v)
    setFormMatricula(v.matricula); setFormMarca(v.marca); setFormModelo(v.modelo)
    setFormAno(v.ano ? String(v.ano) : '')
    setFormCombustivel(v.combustivel || 'gasoleo')
    setFormKm(String(v.km_atuais))
    setFormIpo(v.data_proxima_ipo || '')
    setFormVeiculoAberto(true)
  }

  function fecharFormVeiculo() { setFormVeiculoAberto(false); setVeiculoEmEdicao(null) }

  async function guardarVeiculo() {
    if (!ehGestor) return
    const matricula = formMatricula.trim().toUpperCase()
    if (!matricula) { alert('Introduz a matrícula.'); return }
    if (!formMarca.trim()) { alert('Introduz a marca.'); return }
    if (!formModelo.trim()) { alert('Introduz o modelo.'); return }
    setAGuardarVeiculo(true)
    const payload = {
      matricula,
      marca: formMarca.trim(),
      modelo: formModelo.trim(),
      ano: formAno ? Number(formAno) : null,
      combustivel: formCombustivel,
      km_atuais: Number(formKm) || 0,
      data_proxima_ipo: formIpo || null,
    }
    if (veiculoEmEdicao) {
      const { error } = await supabase.from('veiculos').update(payload).eq('id', veiculoEmEdicao.id)
      if (error) {
        if (error.code === '23505') alert('Já existe um veículo com esta matrícula.')
        else alert('Erro ao atualizar veículo.')
        setAGuardarVeiculo(false); return
      }
    } else {
      const { error } = await supabase.from('veiculos').insert([payload])
      if (error) {
        if (error.code === '23505') alert('Já existe um veículo com esta matrícula.')
        else alert('Erro ao criar veículo.')
        setAGuardarVeiculo(false); return
      }
    }
    fecharFormVeiculo()
    await carregarVeiculos()
    setAGuardarVeiculo(false)
  }

  async function apagarVeiculo(v: Veiculo) {
    if (!ehGestor) return
    if (!window.confirm(`Apagar o veículo "${v.matricula}"? Todos os registos e manutenções associados serão também apagados.`)) return
    const { error } = await supabase.from('veiculos').delete().eq('id', v.id)
    if (error) { alert('Erro ao apagar o veículo.'); return }
    await carregarVeiculos()
  }

  // ===== CONDUTORES =====
  async function carregarCondutores() {
    setACarregarCondutores(true)
    const { data, error } = await supabase
      .from('veiculos_condutores')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })
    if (!error) setCondutores((data as Condutor[]) || [])
    setACarregarCondutores(false)
  }

  function abrirFormNovoCondutor() {
    if (!ehGestor) return
    setCondutorEmEdicao(null); setFormCondutorNome(''); setNovoCondutorAberto(true)
  }
  function abrirFormEditarCondutor(c: Condutor) {
    if (!ehGestor) return
    setCondutorEmEdicao(c); setFormCondutorNome(c.nome); setNovoCondutorAberto(false)
  }
  function fecharFormCondutor() { setNovoCondutorAberto(false); setCondutorEmEdicao(null); setFormCondutorNome('') }

  async function guardarCondutor() {
    if (!ehGestor) return
    const nome = formCondutorNome.trim()
    if (!nome) { alert('Introduz o nome do condutor.'); return }
    setAGuardarCondutor(true)
    if (condutorEmEdicao) {
      const { error } = await supabase.from('veiculos_condutores').update({ nome }).eq('id', condutorEmEdicao.id)
      if (error) {
        if (error.code === '23505') alert('Já existe um condutor com este nome.')
        else alert('Erro ao atualizar condutor.')
        setAGuardarCondutor(false); return
      }
    } else {
      const { error } = await supabase.from('veiculos_condutores').insert([{ nome }])
      if (error) {
        if (error.code === '23505') alert('Já existe um condutor com este nome.')
        else alert('Erro ao criar condutor.')
        setAGuardarCondutor(false); return
      }
    }
    fecharFormCondutor()
    await carregarCondutores()
    setAGuardarCondutor(false)
  }

  async function removerCondutor(c: Condutor) {
    if (!ehGestor) return
    if (!window.confirm(`Remover "${c.nome}"? O histórico de registos com este nome é mantido.`)) return
    const { error } = await supabase.from('veiculos_condutores').update({ ativo: false }).eq('id', c.id)
    if (error) { alert('Erro ao remover condutor.'); return }
    await carregarCondutores()
  }

  // ===== ALERTAS =====
  function obterDataHoje() {
    const h = new Date()
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
  }

  function diasEntre(d1: string, d2: string): number {
    const a = new Date(d1); const b = new Date(d2)
    return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  }

  function obterAlertaSemanal(v: Veiculo): { tipo: 'ok' | 'sem_registos' | 'em_atraso'; dias?: number; data?: string } {
    const ult = ultimosRegistos[v.id]
    if (!ult) return { tipo: 'sem_registos' }
    const dias = diasEntre(ult.data_registo, obterDataHoje())
    if (dias > 7) return { tipo: 'em_atraso', dias, data: ult.data_registo }
    return { tipo: 'ok', dias, data: ult.data_registo }
  }

  function obterAlertaIpo(v: Veiculo): { tipo: 'ok' | 'sem_data' | 'proxima' | 'expirada'; dias?: number } {
    if (!v.data_proxima_ipo) return { tipo: 'sem_data' }
    const dias = diasEntre(obterDataHoje(), v.data_proxima_ipo)
    if (dias < 0) return { tipo: 'expirada', dias: Math.abs(dias) }
    if (dias <= 30) return { tipo: 'proxima', dias }
    return { tipo: 'ok', dias }
  }

  function corDeFundoCard(v: Veiculo): { background: string; borderColor: string } {
    const ipo = obterAlertaIpo(v)
    const sem = obterAlertaSemanal(v)
    if (ipo.tipo === 'expirada') return { background: '#fef2f2', borderColor: '#fca5a5' }
    if (ipo.tipo === 'proxima') return { background: '#fff7ed', borderColor: '#fdba74' }
    if (sem.tipo === 'em_atraso' || sem.tipo === 'sem_registos') return { background: '#fefce8', borderColor: '#fde047' }
    return { background: '#fff', borderColor: '#e5e7eb' }
  }

  function formatarCombustivel(c: string | null) {
    if (!c) return '—'
    return COMBUSTIVEIS.find(x => x.valor === c)?.label || c
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

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {barraTopo}

      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>🚗 Veículos</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Manutenção, registo semanal e inspeções periódicas</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ehGestor && (
              <button onClick={() => setGestaoCondutoresAberta(true)}
                style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
                👤 Condutores
              </button>
            )}
            {ehGestor && (
              <button onClick={abrirFormNovoVeiculo}
                style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                + Novo veículo
              </button>
            )}
          </div>
        </div>

        {/* Legenda de alertas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', fontSize: '12px', color: '#6b7280' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '3px' }} /> OK
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '3px' }} /> Registo semanal em atraso
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '3px' }} /> IPO no próximo mês
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '3px' }} /> IPO expirada
          </span>
        </div>

        {aCarregarVeiculos ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>A carregar...</p>
        ) : veiculos.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🚗</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: '0 0 4px' }}>Ainda não há veículos</p>
            {ehGestor ? (
              <>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>Clica em "Novo veículo" para adicionar o primeiro.</p>
                <button onClick={abrirFormNovoVeiculo}
                  style={{ background: '#80c944', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                  + Novo veículo
                </button>
              </>
            ) : (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Pede a um gestor para adicionar veículos.</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {veiculos.map((v) => {
              const cores = corDeFundoCard(v)
              const ipo = obterAlertaIpo(v)
              const sem = obterAlertaSemanal(v)
              return (
                <div key={v.id} onClick={() => router.push(`/veiculos/${v.id}`)}
                  style={{ background: cores.background, border: `1px solid ${cores.borderColor}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: '#111', margin: 0, letterSpacing: '0.5px' }}>{v.matricula}</p>
                      <p style={{ fontSize: '13px', color: '#374151', margin: '2px 0 0' }}>{v.marca} {v.modelo}{v.ano ? ` · ${v.ano}` : ''}</p>
                    </div>
                    <span style={{ fontSize: '22px' }}>🚗</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                    <span>{formatarCombustivel(v.combustivel)}</span>
                    <span>{v.km_atuais.toLocaleString('pt-PT')} km</span>
                  </div>

                  {/* Alertas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Alerta IPO */}
                    {ipo.tipo === 'expirada' && (
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#991b1b', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px', margin: 0 }}>
                        🛑 IPO expirada há {ipo.dias} {ipo.dias === 1 ? 'dia' : 'dias'}
                      </p>
                    )}
                    {ipo.tipo === 'proxima' && (
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#9a3412', background: '#ffedd5', padding: '6px 10px', borderRadius: '6px', margin: 0 }}>
                        ⚠️ IPO em {ipo.dias} {ipo.dias === 1 ? 'dia' : 'dias'}
                      </p>
                    )}
                    {ipo.tipo === 'ok' && v.data_proxima_ipo && (
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                        IPO: {v.data_proxima_ipo}
                      </p>
                    )}
                    {ipo.tipo === 'sem_data' && (
                      <p style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                        Sem data de IPO definida
                      </p>
                    )}

                    {/* Alerta semanal */}
                    {sem.tipo === 'em_atraso' && (
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#854d0e', background: '#fef9c3', padding: '6px 10px', borderRadius: '6px', margin: 0 }}>
                        🛠️ Registo semanal há {sem.dias} dias
                      </p>
                    )}
                    {sem.tipo === 'sem_registos' && (
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#854d0e', background: '#fef9c3', padding: '6px 10px', borderRadius: '6px', margin: 0 }}>
                        🛠️ Sem registos semanais
                      </p>
                    )}
                    {sem.tipo === 'ok' && (
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                        Último registo: {sem.data} ({sem.dias === 0 ? 'hoje' : `há ${sem.dias}d`})
                      </p>
                    )}
                  </div>

                  {ehGestor && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => abrirFormEditarVeiculo(v)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => apagarVeiculo(v)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Apagar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {renderModalVeiculo()}
      {ehGestor && renderModalCondutores()}
    </div>
  )

  // ===== MODAIS =====

  function renderModalVeiculo() {
    if (!formVeiculoAberto) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) fecharFormVeiculo() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>{veiculoEmEdicao ? 'Editar veículo' : 'Novo veículo'}</p>
            <button onClick={fecharFormVeiculo} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Matrícula *</label>
              <input type="text" value={formMatricula} onChange={(e) => setFormMatricula(e.target.value)}
                placeholder="ex: AA-00-BB"
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', textTransform: 'uppercase' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Marca *</label>
                <input type="text" value={formMarca} onChange={(e) => setFormMarca(e.target.value)} placeholder="ex: Renault"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Modelo *</label>
                <input type="text" value={formModelo} onChange={(e) => setFormModelo(e.target.value)} placeholder="ex: Kangoo"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Ano</label>
                <input type="number" value={formAno} onChange={(e) => setFormAno(e.target.value)} placeholder="ex: 2020"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Combustível</label>
                <select value={formCombustivel} onChange={(e) => setFormCombustivel(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                  {COMBUSTIVEIS.map(c => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Km atuais</label>
                <input type="number" value={formKm} onChange={(e) => setFormKm(e.target.value)} placeholder="0"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Próxima IPO</label>
                <input type="date" value={formIpo} onChange={(e) => setFormIpo(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button onClick={guardarVeiculo} disabled={aGuardarVeiculo}
                style={{ background: '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                {aGuardarVeiculo ? 'A guardar...' : 'Guardar'}
              </button>
              <button onClick={fecharFormVeiculo} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderModalCondutores() {
    if (!gestaoCondutoresAberta) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setGestaoCondutoresAberta(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>👤 Condutores</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>Pessoas que aparecem no menu ao registar.</p>
            </div>
            <button onClick={() => setGestaoCondutoresAberta(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕ Fechar</button>
          </div>

          {!novoCondutorAberto && !condutorEmEdicao && (
            <button onClick={abrirFormNovoCondutor}
              style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '16px' }}>+ Novo condutor</button>
          )}

          {(novoCondutorAberto || condutorEmEdicao) && (
            <div style={{ border: '2px solid #80c944', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 12px' }}>{condutorEmEdicao ? 'Editar condutor' : 'Novo condutor'}</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome *</label>
                  <input type="text" value={formCondutorNome} onChange={(e) => setFormCondutorNome(e.target.value)} placeholder="ex: João Pereira"
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={guardarCondutor} disabled={aGuardarCondutor}
                    style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                    {aGuardarCondutor ? 'A guardar...' : 'Guardar'}
                  </button>
                  <button onClick={fecharFormCondutor} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {aCarregarCondutores ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : condutores.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há condutores.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {condutores.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0 }}>{c.nome}</p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => abrirFormEditarCondutor(c)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => removerCondutor(c)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
}
