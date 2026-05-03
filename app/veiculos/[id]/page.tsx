// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type AbaVeiculo = 'semanal' | 'manutencoes'

type Veiculo = {
  id: number
  matricula: string
  marca: string
  modelo: string
  ano: number | null
  combustivel: string | null
  km_atuais: number
  data_proxima_ipo: string | null
}

type Condutor = {
  id: number
  nome: string
  ativo: boolean
}

type RegistoSemanal = {
  id: number
  veiculo_id: number
  data_registo: string
  km: number
  oleo_estado: 'bom' | 'baixo'
  oleo_corrigido: boolean
  agua_estado: 'bom' | 'baixo'
  agua_corrigido: boolean
  pneus_estado: 'ok' | 'nao_ok'
  interior_limpo: boolean
  observacoes: string | null
  nome_condutor: string
  created_at: string
}

type Manutencao = {
  id: number
  veiculo_id: number
  data_manutencao: string
  categoria: string
  descricao: string
  km: number | null
  custo: number | null
  oficina: string | null
  nome_condutor: string | null
  created_at: string
}

const COMBUSTIVEIS_LABEL: Record<string, string> = {
  gasolina: 'Gasolina', gasoleo: 'Gasóleo', eletrico: 'Elétrico',
  hibrido: 'Híbrido', gpl: 'GPL', outro: 'Outro',
}

const CATEGORIAS_MANUT: { valor: string; label: string; emoji: string }[] = [
  { valor: 'revisao', label: 'Revisão', emoji: '🔧' },
  { valor: 'pneus', label: 'Pneus', emoji: '🛞' },
  { valor: 'travagem', label: 'Travagem', emoji: '🛑' },
  { valor: 'bateria', label: 'Bateria', emoji: '🔋' },
  { valor: 'ipo', label: 'IPO', emoji: '📋' },
  { valor: 'outro', label: 'Outro', emoji: '🔩' },
]

export default function VeiculoDetalhe() {
  const router = useRouter()
  const params = useParams()
  const veiculoId = Number(params.id)

  const [aVerificar, setAVerificar] = useState(true)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [roleUtilizador, setRoleUtilizador] = useState<string>('')
  const ehGestor = roleUtilizador === 'gestor'

  const [veiculo, setVeiculo] = useState<Veiculo | null>(null)
  const [condutores, setCondutores] = useState<Condutor[]>([])
  const [abaAtiva, setAbaAtiva] = useState<AbaVeiculo>('semanal')

  // Registos semanais
  const [registos, setRegistos] = useState<RegistoSemanal[]>([])
  const [aCarregarRegistos, setACarregarRegistos] = useState(false)
  const [modalRegistoAberto, setModalRegistoAberto] = useState(false)
  const [formRegKm, setFormRegKm] = useState('')
  const [formRegOleo, setFormRegOleo] = useState<'bom' | 'baixo'>('bom')
  const [formRegOleoCorrigido, setFormRegOleoCorrigido] = useState(false)
  const [formRegAgua, setFormRegAgua] = useState<'bom' | 'baixo'>('bom')
  const [formRegAguaCorrigido, setFormRegAguaCorrigido] = useState(false)
  const [formRegPneus, setFormRegPneus] = useState<'ok' | 'nao_ok'>('ok')
  const [formRegInteriorLimpo, setFormRegInteriorLimpo] = useState(false)
  const [formRegCondutor, setFormRegCondutor] = useState('')
  const [formRegObs, setFormRegObs] = useState('')
  const [aGuardarRegisto, setAGuardarRegisto] = useState(false)

  // Manutenções
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [aCarregarManut, setACarregarManut] = useState(false)
  const [modalManutAberto, setModalManutAberto] = useState(false)
  const [manutPreSetCategoria, setManutPreSetCategoria] = useState<string | null>(null)
  const [formManutData, setFormManutData] = useState('')
  const [formManutCategoria, setFormManutCategoria] = useState('revisao')
  const [formManutDescricao, setFormManutDescricao] = useState('')
  const [formManutKm, setFormManutKm] = useState('')
  const [formManutCusto, setFormManutCusto] = useState('')
  const [formManutOficina, setFormManutOficina] = useState('')
  const [formManutCondutor, setFormManutCondutor] = useState('')
  const [aGuardarManut, setAGuardarManut] = useState(false)

  // Modal IPO done
  const [modalIpoFeitaAberto, setModalIpoFeitaAberto] = useState(false)
  const [formIpoData, setFormIpoData] = useState('')
  const [formIpoKm, setFormIpoKm] = useState('')
  const [formIpoCusto, setFormIpoCusto] = useState('')
  const [formIpoOficina, setFormIpoOficina] = useState('')
  const [formIpoProxima, setFormIpoProxima] = useState('')
  const [aGuardarIpo, setAGuardarIpo] = useState(false)

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase.from('perfis').select('nome, role').eq('id', user.id).single()
      if (!perfil || !['gestor', 'cozinha'].includes(perfil.role)) {
        router.push('/'); return
      }
      setNomeUtilizador(perfil.nome)
      setRoleUtilizador(perfil.role)
      await carregarVeiculo()
      await carregarCondutores()
      await carregarRegistos()
      await carregarManutencoes()
      setAVerificar(false)
    }
    if (!isNaN(veiculoId)) inicializar()
    else router.push('/veiculos')
  }, [veiculoId])

  useEffect(() => {
    const bloquear = modalRegistoAberto || modalManutAberto || modalIpoFeitaAberto
    document.body.style.overflow = bloquear ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalRegistoAberto, modalManutAberto, modalIpoFeitaAberto])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function obterDataHoje() {
    const h = new Date()
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
  }

  function obterDataDaqui1Ano() {
    const h = new Date()
    h.setFullYear(h.getFullYear() + 1)
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
  }

  function diasEntre(d1: string, d2: string): number {
    const a = new Date(d1); const b = new Date(d2)
    return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  }

  async function carregarVeiculo() {
    const { data, error } = await supabase.from('veiculos').select('*').eq('id', veiculoId).single()
    if (error || !data) { router.push('/veiculos'); return }
    setVeiculo(data as Veiculo)
  }

  async function carregarCondutores() {
    const { data } = await supabase
      .from('veiculos_condutores').select('*')
      .eq('ativo', true).order('nome', { ascending: true })
    setCondutores((data as Condutor[]) || [])
  }

  // ===== REGISTOS SEMANAIS =====
  async function carregarRegistos() {
    setACarregarRegistos(true)
    const { data, error } = await supabase
      .from('veiculos_registos_semanais').select('*')
      .eq('veiculo_id', veiculoId)
      .order('data_registo', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error) setRegistos((data as RegistoSemanal[]) || [])
    setACarregarRegistos(false)
  }

  function abrirModalRegisto() {
    if (!veiculo) return
    setFormRegKm(String(veiculo.km_atuais))
    setFormRegOleo('bom'); setFormRegOleoCorrigido(false)
    setFormRegAgua('bom'); setFormRegAguaCorrigido(false)
    setFormRegPneus('ok')
    setFormRegInteriorLimpo(false)
    setFormRegCondutor(''); setFormRegObs('')
    setModalRegistoAberto(true)
  }

  async function guardarRegisto() {
    if (!veiculo) return
    const km = Number(formRegKm)
    if (!km || km < veiculo.km_atuais) {
      alert(`Os Km têm de ser pelo menos ${veiculo.km_atuais.toLocaleString('pt-PT')}.`)
      return
    }
    if (!formRegInteriorLimpo) { alert('Tens de confirmar que o interior do veículo está limpo e sem lixo.'); return }
    if (!formRegCondutor) { alert('Seleciona o condutor.'); return }
    setAGuardarRegisto(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('veiculos_registos_semanais').insert([{
      veiculo_id: veiculo.id,
      data_registo: obterDataHoje(),
      km,
      oleo_estado: formRegOleo,
      oleo_corrigido: formRegOleo === 'baixo' ? formRegOleoCorrigido : false,
      agua_estado: formRegAgua,
      agua_corrigido: formRegAgua === 'baixo' ? formRegAguaCorrigido : false,
      pneus_estado: formRegPneus,
      interior_limpo: formRegInteriorLimpo,
      observacoes: formRegObs.trim() || null,
      nome_condutor: formRegCondutor,
      user_id: user?.id || null,
    }])
    if (error) { alert('Erro ao guardar o registo.'); setAGuardarRegisto(false); return }
    await carregarVeiculo()
    await carregarRegistos()
    setModalRegistoAberto(false)
    setAGuardarRegisto(false)
  }

  async function apagarRegisto(r: RegistoSemanal) {
    if (!ehGestor) return
    if (!window.confirm(`Apagar este registo de ${r.data_registo}?`)) return
    const { error } = await supabase.from('veiculos_registos_semanais').delete().eq('id', r.id)
    if (error) { alert('Erro ao apagar registo.'); return }
    await carregarRegistos()
  }

  // ===== MANUTENÇÕES =====
  async function carregarManutencoes() {
    setACarregarManut(true)
    const { data, error } = await supabase
      .from('veiculos_manutencoes').select('*')
      .eq('veiculo_id', veiculoId)
      .order('data_manutencao', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error) setManutencoes((data as Manutencao[]) || [])
    setACarregarManut(false)
  }

  function abrirModalManut() {
    if (!veiculo) return
    setFormManutData(obterDataHoje())
    setFormManutCategoria(manutPreSetCategoria || 'revisao')
    setManutPreSetCategoria(null)
    setFormManutDescricao('')
    setFormManutKm(String(veiculo.km_atuais))
    setFormManutCusto(''); setFormManutOficina(''); setFormManutCondutor('')
    setModalManutAberto(true)
  }

  async function guardarManutencao() {
    if (!veiculo) return
    if (!formManutData) { alert('Indica a data.'); return }
    if (!formManutDescricao.trim()) { alert('Indica a descrição.'); return }
    setAGuardarManut(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('veiculos_manutencoes').insert([{
      veiculo_id: veiculo.id,
      data_manutencao: formManutData,
      categoria: formManutCategoria,
      descricao: formManutDescricao.trim(),
      km: formManutKm ? Number(formManutKm) : null,
      custo: formManutCusto ? Number(formManutCusto) : null,
      oficina: formManutOficina.trim() || null,
      nome_condutor: formManutCondutor || null,
      user_id: user?.id || null,
    }])
    if (error) { alert('Erro ao guardar a manutenção.'); setAGuardarManut(false); return }
    await carregarVeiculo()
    await carregarManutencoes()
    setModalManutAberto(false)
    setAGuardarManut(false)
  }

  async function apagarManutencao(m: Manutencao) {
    if (!ehGestor) return
    if (!window.confirm(`Apagar esta manutenção de ${m.data_manutencao}?`)) return
    const { error } = await supabase.from('veiculos_manutencoes').delete().eq('id', m.id)
    if (error) { alert('Erro ao apagar manutenção.'); return }
    await carregarManutencoes()
  }

  // ===== IPO FEITA =====
  function abrirModalIpoFeita() {
    if (!veiculo) return
    setFormIpoData(obterDataHoje())
    setFormIpoKm(String(veiculo.km_atuais))
    setFormIpoCusto(''); setFormIpoOficina('')
    setFormIpoProxima(obterDataDaqui1Ano())
    setModalIpoFeitaAberto(true)
  }

  async function guardarIpoFeita() {
    if (!veiculo) return
    if (!formIpoData) { alert('Indica a data da IPO.'); return }
    if (!formIpoProxima) { alert('Indica a data da próxima IPO.'); return }
    setAGuardarIpo(true)
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Criar registo de manutenção
    const { error: errManut } = await supabase.from('veiculos_manutencoes').insert([{
      veiculo_id: veiculo.id,
      data_manutencao: formIpoData,
      categoria: 'ipo',
      descricao: 'Inspeção periódica realizada',
      km: formIpoKm ? Number(formIpoKm) : null,
      custo: formIpoCusto ? Number(formIpoCusto) : null,
      oficina: formIpoOficina.trim() || null,
      user_id: user?.id || null,
    }])
    if (errManut) { alert('Erro ao registar a IPO.'); setAGuardarIpo(false); return }

    // 2. Atualizar próxima IPO no veículo
    const { error: errVeic } = await supabase.from('veiculos')
      .update({ data_proxima_ipo: formIpoProxima }).eq('id', veiculo.id)
    if (errVeic) { alert('IPO registada mas erro ao atualizar próxima data.'); }

    await carregarVeiculo()
    await carregarManutencoes()
    setModalIpoFeitaAberto(false)
    setAGuardarIpo(false)
  }

  // ===== HELPERS =====
  function obterAlertaIpo() {
    if (!veiculo?.data_proxima_ipo) return null
    const dias = diasEntre(obterDataHoje(), veiculo.data_proxima_ipo)
    if (dias < 0) return { tipo: 'expirada', dias: Math.abs(dias) }
    if (dias <= 30) return { tipo: 'proxima', dias }
    return null
  }

  // ===== RENDER =====
  if (aVerificar || !veiculo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>A carregar...</p>
      </div>
    )
  }

  const alertaIpo = obterAlertaIpo()

  const barraTopo = (
    <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', padding: '6px 32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {nomeUtilizador && <span style={{ color: '#6b7280', fontSize: '13px' }}>Olá, {nomeUtilizador}</span>}
        <button onClick={() => router.push('/veiculos')} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>← Veículos</button>
        <button onClick={() => router.push('/')} style={{ background: '#fff', border: '1px solid #d1d5db', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>Início</button>
        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>Sair da sessão</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {barraTopo}

      <div style={{ padding: '32px' }}>
        {/* Cabeçalho do veículo */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: 0, letterSpacing: '0.5px' }}>
                🚗 <span style={{ color: '#80c944' }}>{veiculo.matricula}</span>
              </p>
              <p style={{ fontSize: '15px', color: '#374151', margin: '4px 0 0' }}>
                {veiculo.marca} {veiculo.modelo}
                {veiculo.ano && ` · ${veiculo.ano}`}
                {veiculo.combustivel && ` · ${COMBUSTIVEIS_LABEL[veiculo.combustivel] || veiculo.combustivel}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Km atuais</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#111', margin: '2px 0 0' }}>{veiculo.km_atuais.toLocaleString('pt-PT')}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próxima IPO</p>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#111', margin: '2px 0 0' }}>{veiculo.data_proxima_ipo || '—'}</p>
              </div>
            </div>
          </div>

          {/* Alerta de IPO + botão "marcar como feita" */}
          {alertaIpo && (
            <div style={{
              marginTop: '16px',
              background: alertaIpo.tipo === 'expirada' ? '#fef2f2' : '#fff7ed',
              border: `1px solid ${alertaIpo.tipo === 'expirada' ? '#fca5a5' : '#fdba74'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: alertaIpo.tipo === 'expirada' ? '#991b1b' : '#9a3412', margin: 0 }}>
                  {alertaIpo.tipo === 'expirada'
                    ? `🛑 IPO expirou há ${alertaIpo.dias} ${alertaIpo.dias === 1 ? 'dia' : 'dias'}`
                    : `⚠️ IPO em ${alertaIpo.dias} ${alertaIpo.dias === 1 ? 'dia' : 'dias'}`}
                </p>
                <p style={{ fontSize: '12px', color: alertaIpo.tipo === 'expirada' ? '#991b1b' : '#9a3412', margin: '2px 0 0' }}>
                  Quando a inspeção for realizada, marca como feita para registar a manutenção e atualizar a próxima data.
                </p>
              </div>
              <button onClick={abrirModalIpoFeita}
                style={{ background: alertaIpo.tipo === 'expirada' ? '#dc2626' : '#ea580c', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ✓ Marcar IPO como feita
              </button>
            </div>
          )}
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
          {([
            { id: 'semanal', label: '🛠️ Registo semanal' },
            { id: 'manutencoes', label: '🔧 Manutenções' },
          ] as { id: AbaVeiculo; label: string }[]).map((aba) => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
              style={{ backgroundColor: abaAtiva === aba.id ? '#80c944' : '#e5e7eb', color: abaAtiva === aba.id ? '#fff' : '#111', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              {aba.label}
            </button>
          ))}
        </div>

        {abaAtiva === 'semanal' && renderAbaSemanal()}
        {abaAtiva === 'manutencoes' && renderAbaManutencoes()}
      </div>

      {renderModalRegistoSemanal()}
      {renderModalManutencao()}
      {renderModalIpoFeita()}
    </div>
  )

  // ===== RENDERS DAS ABAS =====

  function renderAbaSemanal() {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>🛠️ Registos semanais</p>
          <button onClick={abrirModalRegisto}
            style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            + Novo registo
          </button>
        </div>

        {aCarregarRegistos ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
        ) : registos.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há registos semanais para este veículo.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Data</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Km</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Óleo</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Água</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Pneus</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Condutor</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Obs.</th>
                  {ehGestor && <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}></th>}
                </tr>
              </thead>
              <tbody>
                {registos.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px' }}>{r.data_registo}</td>
                    <td style={{ padding: '8px 10px' }}>{r.km.toLocaleString('pt-PT')}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {r.oleo_estado === 'bom' ? (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Bom</span>
                      ) : r.oleo_corrigido ? (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Baixo (corrigido)</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>⚠ Baixo</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {r.agua_estado === 'bom' ? (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Bom</span>
                      ) : r.agua_corrigido ? (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ Baixo (corrigido)</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>⚠ Baixo</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {r.pneus_estado === 'ok' ? (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>✓ OK</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>⚠ Não OK</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{r.nome_condutor}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280' }}>{r.observacoes || '—'}</td>
                    {ehGestor && (
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => apagarRegisto(r)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>×</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function renderAbaManutencoes() {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>🔧 Histórico de manutenções</p>
          <button onClick={abrirModalManut}
            style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            + Nova manutenção
          </button>
        </div>

        {aCarregarManut ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
        ) : manutencoes.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há manutenções registadas para este veículo.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {manutencoes.map((m) => {
              const cat = CATEGORIAS_MANUT.find(c => c.valor === m.categoria)
              return (
                <div key={m.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ background: '#f3f4f6', padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                          {cat?.emoji} {cat?.label || m.categoria}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{m.data_manutencao}</span>
                        {m.km && <span style={{ fontSize: '12px', color: '#6b7280' }}>· {m.km.toLocaleString('pt-PT')} km</span>}
                      </div>
                      <p style={{ fontSize: '14px', color: '#111', margin: '4px 0 0', fontWeight: '500' }}>{m.descricao}</p>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {m.oficina && <span style={{ fontSize: '12px', color: '#6b7280' }}>🏭 {m.oficina}</span>}
                        {m.custo !== null && <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>💰 {Number(m.custo).toFixed(2)} €</span>}
                        {m.nome_condutor && <span style={{ fontSize: '12px', color: '#6b7280' }}>👤 {m.nome_condutor}</span>}
                      </div>
                    </div>
                    {ehGestor && (
                      <button onClick={() => apagarManutencao(m)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', height: 'fit-content' }}>×</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ===== MODAIS =====

  function renderModalRegistoSemanal() {
    if (!modalRegistoAberto || !veiculo) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setModalRegistoAberto(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>Registo semanal</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{veiculo.matricula} · {obterDataHoje()}</p>
            </div>
            <button onClick={() => setModalRegistoAberto(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Km atuais * (mínimo: {veiculo.km_atuais.toLocaleString('pt-PT')})</label>
              <input type="number" value={formRegKm} onChange={(e) => setFormRegKm(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Óleo</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setFormRegOleo('bom'); setFormRegOleoCorrigido(false) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: formRegOleo === 'bom' ? '2px solid #16a34a' : '1px solid #d1d5db', background: formRegOleo === 'bom' ? '#dcfce7' : '#fff', color: formRegOleo === 'bom' ? '#166534' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  ✓ Bom
                </button>
                <button onClick={() => setFormRegOleo('baixo')}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: formRegOleo === 'baixo' ? '2px solid #dc2626' : '1px solid #d1d5db', background: formRegOleo === 'baixo' ? '#fee2e2' : '#fff', color: formRegOleo === 'baixo' ? '#991b1b' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  ⚠ Baixo
                </button>
              </div>
              {formRegOleo === 'baixo' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 10px', background: '#f9fafb', borderRadius: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formRegOleoCorrigido} onChange={(e) => setFormRegOleoCorrigido(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#80c944', cursor: 'pointer' }} />
                  <span style={{ fontSize: '12px', color: '#374151' }}>Atestei o óleo no momento</span>
                </label>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Água</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setFormRegAgua('bom'); setFormRegAguaCorrigido(false) }}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: formRegAgua === 'bom' ? '2px solid #16a34a' : '1px solid #d1d5db', background: formRegAgua === 'bom' ? '#dcfce7' : '#fff', color: formRegAgua === 'bom' ? '#166534' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  ✓ Bom
                </button>
                <button onClick={() => setFormRegAgua('baixo')}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: formRegAgua === 'baixo' ? '2px solid #dc2626' : '1px solid #d1d5db', background: formRegAgua === 'baixo' ? '#fee2e2' : '#fff', color: formRegAgua === 'baixo' ? '#991b1b' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  ⚠ Baixo
                </button>
              </div>
              {formRegAgua === 'baixo' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 10px', background: '#f9fafb', borderRadius: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formRegAguaCorrigido} onChange={(e) => setFormRegAguaCorrigido(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#80c944', cursor: 'pointer' }} />
                  <span style={{ fontSize: '12px', color: '#374151' }}>Atestei a água no momento</span>
                </label>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Pneus</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setFormRegPneus('ok')}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: formRegPneus === 'ok' ? '2px solid #16a34a' : '1px solid #d1d5db', background: formRegPneus === 'ok' ? '#dcfce7' : '#fff', color: formRegPneus === 'ok' ? '#166534' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  ✓ OK
                </button>
                <button onClick={() => setFormRegPneus('nao_ok')}
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: formRegPneus === 'nao_ok' ? '2px solid #dc2626' : '1px solid #d1d5db', background: formRegPneus === 'nao_ok' ? '#fee2e2' : '#fff', color: formRegPneus === 'nao_ok' ? '#991b1b' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  ⚠ Não OK
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', border: formRegInteriorLimpo ? '2px solid #16a34a' : '2px solid #fcd34d', borderRadius: '8px', cursor: 'pointer', background: formRegInteriorLimpo ? '#f0fdf4' : '#fffbeb' }}>
                <input type="checkbox" checked={formRegInteriorLimpo} onChange={(e) => setFormRegInteriorLimpo(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#16a34a', cursor: 'pointer', marginTop: '1px' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111', margin: 0 }}>🧹 Confirmo que o interior está limpo e sem lixo *</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>Obrigatório para poder guardar o registo.</p>
                </div>
              </label>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Condutor *</label>
              {condutores.length === 0 ? (
                <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                  Ainda não há condutores. {ehGestor ? 'Volta atrás e adiciona-os em "Condutores".' : 'Pede a um gestor para os adicionar.'}
                </div>
              ) : (
                <select value={formRegCondutor} onChange={(e) => setFormRegCondutor(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                  <option value="">— Seleciona quem fez o registo —</option>
                  {condutores.map((c) => (<option key={c.id} value={c.nome}>{c.nome}</option>))}
                </select>
              )}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
              <textarea value={formRegObs} onChange={(e) => setFormRegObs(e.target.value)} rows={2}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={guardarRegisto} disabled={aGuardarRegisto || condutores.length === 0}
                style={{ background: condutores.length === 0 ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: condutores.length === 0 ? 'not-allowed' : 'pointer' }}>
                {aGuardarRegisto ? 'A guardar...' : 'Guardar registo'}
              </button>
              <button onClick={() => setModalRegistoAberto(false)} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderModalManutencao() {
    if (!modalManutAberto || !veiculo) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setModalManutAberto(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>Nova manutenção</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{veiculo.matricula}</p>
            </div>
            <button onClick={() => setModalManutAberto(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Data *</label>
                <input type="date" value={formManutData} onChange={(e) => setFormManutData(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Categoria *</label>
                <select value={formManutCategoria} onChange={(e) => setFormManutCategoria(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                  {CATEGORIAS_MANUT.map(c => <option key={c.valor} value={c.valor}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Descrição *</label>
              <textarea value={formManutDescricao} onChange={(e) => setFormManutDescricao(e.target.value)} rows={2}
                placeholder="ex: Mudança de óleo e filtros, revisão dos 60.000 km"
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Km na altura</label>
                <input type="number" value={formManutKm} onChange={(e) => setFormManutKm(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Custo (€)</label>
                <input type="number" step="0.01" value={formManutCusto} onChange={(e) => setFormManutCusto(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Oficina</label>
              <input type="text" value={formManutOficina} onChange={(e) => setFormManutOficina(e.target.value)}
                placeholder="ex: Oficina Central, Cascais"
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Quem registou (opcional)</label>
              {condutores.length === 0 ? (
                <div style={{ border: '1px solid #e5e7eb', background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#6b7280' }}>
                  Sem condutores definidos.
                </div>
              ) : (
                <select value={formManutCondutor} onChange={(e) => setFormManutCondutor(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                  <option value="">—</option>
                  {condutores.map((c) => (<option key={c.id} value={c.nome}>{c.nome}</option>))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={guardarManutencao} disabled={aGuardarManut}
                style={{ background: '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                {aGuardarManut ? 'A guardar...' : 'Guardar manutenção'}
              </button>
              <button onClick={() => setModalManutAberto(false)} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderModalIpoFeita() {
    if (!modalIpoFeitaAberto || !veiculo) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setModalIpoFeitaAberto(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>📋 Marcar IPO como feita</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{veiculo.matricula} · Cria entrada de manutenção e atualiza próxima data</p>
            </div>
            <button onClick={() => setModalIpoFeitaAberto(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Data da inspeção *</label>
                <input type="date" value={formIpoData} onChange={(e) => setFormIpoData(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Km na altura</label>
                <input type="number" value={formIpoKm} onChange={(e) => setFormIpoKm(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Custo (€)</label>
                <input type="number" step="0.01" value={formIpoCusto} onChange={(e) => setFormIpoCusto(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Centro de inspeção</label>
                <input type="text" value={formIpoOficina} onChange={(e) => setFormIpoOficina(e.target.value)}
                  placeholder="ex: Controlauto"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Próxima IPO * (sugestão: daqui a 1 ano)</label>
              <input type="date" value={formIpoProxima} onChange={(e) => setFormIpoProxima(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={guardarIpoFeita} disabled={aGuardarIpo}
                style={{ background: '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                {aGuardarIpo ? 'A guardar...' : '✓ Confirmar IPO feita'}
              </button>
              <button onClick={() => setModalIpoFeitaAberto(false)} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
