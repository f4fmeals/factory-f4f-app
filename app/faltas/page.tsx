// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type AbaFaltas = 'pendentes' | 'catalogo'

type Instalacao = {
  id: number
  nome: string
  morada: string | null
  ativo: boolean
  ordem: number
}

type Produto = {
  id: number
  instalacao_id: number
  nome: string
  unidade: string | null
  descricao: string | null
  ativo: boolean
  ordem: number
}

type Registo = {
  id: number
  produto_id: number
  instalacao_id: number
  quantidade: number
  observacoes: string | null
  estado: 'pendente' | 'feito'
  nome_staff_pedido: string
  data_pedido: string
  hora_pedido: string
  nome_staff_feito: string | null
  data_feito: string | null
  hora_feito: string | null
}

type Staff = {
  id: number
  instalacao_id: number
  nome: string
  ativo: boolean
  ordem: number
}

const CHAVE_INSTALACAO = 'faltas_instalacao_id'

export default function FaltasHome() {
  const router = useRouter()
  const [aVerificar, setAVerificar] = useState(true)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [roleUtilizador, setRoleUtilizador] = useState<string>('')
  const ehGestor = roleUtilizador === 'gestor'

  // Instalações
  const [instalacoes, setInstalacoes] = useState<Instalacao[]>([])
  const [instalacaoSel, setInstalacaoSel] = useState<Instalacao | null>(null)
  const [aCarregarInstalacoes, setACarregarInstalacoes] = useState(false)

  // Staff (apenas leitura - gestão fica no HACCP)
  const [staff, setStaff] = useState<Staff[]>([])
  const [aCarregarStaff, setACarregarStaff] = useState(false)

  // Abas
  const [abaAtiva, setAbaAtiva] = useState<AbaFaltas>('pendentes')

  // Produtos (catálogo)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [aCarregarProdutos, setACarregarProdutos] = useState(false)
  const [novoProdutoAberto, setNovoProdutoAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  const [formProdNome, setFormProdNome] = useState('')
  const [formProdUnidade, setFormProdUnidade] = useState('')
  const [formProdDescricao, setFormProdDescricao] = useState('')
  const [aGuardarProduto, setAGuardarProduto] = useState(false)

  // Registos pendentes
  const [pendentes, setPendentes] = useState<Registo[]>([])
  const [aCarregarPendentes, setACarregarPendentes] = useState(false)

  // Modal: marcar falta
  const [modalFaltaAberto, setModalFaltaAberto] = useState(false)
  const [produtoFaltaSel, setProdutoFaltaSel] = useState<Produto | null>(null)
  const [formFaltaQtd, setFormFaltaQtd] = useState<number>(1)
  const [formFaltaStaff, setFormFaltaStaff] = useState('')
  const [formFaltaObs, setFormFaltaObs] = useState('')
  const [aGuardarFalta, setAGuardarFalta] = useState(false)

  // Modal: marcar feito
  const [modalFeitoAberto, setModalFeitoAberto] = useState(false)
  const [registoFeitoSel, setRegistoFeitoSel] = useState<Registo | null>(null)
  const [formFeitoStaff, setFormFeitoStaff] = useState('')
  const [aGuardarFeito, setAGuardarFeito] = useState(false)

  // Histórico
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false)
  const [historicoRegistos, setHistoricoRegistos] = useState<Registo[]>([])
  const [aCarregarHistorico, setACarregarHistorico] = useState(false)
  const [filtroHistDataInicio, setFiltroHistDataInicio] = useState('')
  const [filtroHistDataFim, setFiltroHistDataFim] = useState('')

  // ===== Inicialização =====
  useEffect(() => {
    async function verificarAcesso() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase.from('perfis').select('nome, role').eq('id', user.id).single()
      if (!perfil || !['gestor', 'cozinha', 'lojista'].includes(perfil.role)) {
        router.push('/')
        return
      }
      setNomeUtilizador(perfil.nome)
      setRoleUtilizador(perfil.role)
      setAVerificar(false)
      await carregarInstalacoes()
    }
    verificarAcesso()
  }, [])

  useEffect(() => {
    if (instalacaoSel) {
      carregarProdutos(instalacaoSel.id)
      carregarPendentes(instalacaoSel.id)
      carregarStaff(instalacaoSel.id)
    } else {
      setProdutos([]); setPendentes([]); setStaff([])
    }
  }, [instalacaoSel])

  useEffect(() => {
    const bloquear = modalFaltaAberto || modalFeitoAberto || modalHistoricoAberto
    document.body.style.overflow = bloquear ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalFaltaAberto, modalFeitoAberto, modalHistoricoAberto])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function obterDataHoje() {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  }

  function obterHoraAgora() {
    const agora = new Date()
    return `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`
  }

  function formatarHora(hora: string | null) {
    if (!hora) return '—'
    return hora.substring(0, 5)
  }

  function imprimirLista() {
    if (typeof window !== 'undefined') window.print()
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

  // ===== STAFF (apenas leitura) =====
  async function carregarStaff(instalacaoId: number) {
    setACarregarStaff(true)
    const { data, error } = await supabase
      .from('haccp_staff')
      .select('*')
      .eq('instalacao_id', instalacaoId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })
    if (!error) setStaff((data as Staff[]) || [])
    setACarregarStaff(false)
  }

  // ===== PRODUTOS (CATÁLOGO) =====
  async function carregarProdutos(instalacaoId: number) {
    setACarregarProdutos(true)
    const { data, error } = await supabase
      .from('faltas_produtos')
      .select('*')
      .eq('instalacao_id', instalacaoId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })
    if (!error) setProdutos((data as Produto[]) || [])
    setACarregarProdutos(false)
  }

  function abrirFormNovoProduto() {
    if (!ehGestor) return
    setFormProdNome(''); setFormProdUnidade(''); setFormProdDescricao('')
    setProdutoEmEdicao(null); setNovoProdutoAberto(true)
  }

  function abrirFormEditarProduto(prod: Produto) {
    if (!ehGestor) return
    setFormProdNome(prod.nome)
    setFormProdUnidade(prod.unidade || '')
    setFormProdDescricao(prod.descricao || '')
    setProdutoEmEdicao(prod); setNovoProdutoAberto(false)
  }

  function fecharFormProduto() { setNovoProdutoAberto(false); setProdutoEmEdicao(null) }

  async function guardarProduto() {
    if (!ehGestor) return
    if (!instalacaoSel) return
    const nome = formProdNome.trim()
    if (!nome) { alert('Introduz o nome do produto.'); return }
    setAGuardarProduto(true)
    const payload = {
      instalacao_id: instalacaoSel.id,
      nome,
      unidade: formProdUnidade.trim() || null,
      descricao: formProdDescricao.trim() || null,
    }
    if (produtoEmEdicao) {
      const { error } = await supabase.from('faltas_produtos').update(payload).eq('id', produtoEmEdicao.id)
      if (error) { alert('Erro ao atualizar produto.'); setAGuardarProduto(false); return }
    } else {
      const { error } = await supabase.from('faltas_produtos').insert([payload])
      if (error) { alert('Erro ao criar produto.'); setAGuardarProduto(false); return }
    }
    fecharFormProduto()
    await carregarProdutos(instalacaoSel.id)
    setAGuardarProduto(false)
  }

  async function apagarProduto(prod: Produto) {
    if (!ehGestor) return
    if (!instalacaoSel) return
    if (!window.confirm(`Apagar o produto "${prod.nome}"? Os registos de faltas associados também serão removidos.`)) return
    const { error } = await supabase.from('faltas_produtos').delete().eq('id', prod.id)
    if (error) { alert('Erro ao apagar produto.'); return }
    await carregarProdutos(instalacaoSel.id)
    await carregarPendentes(instalacaoSel.id)
  }

  // ===== REGISTOS PENDENTES =====
  async function carregarPendentes(instalacaoId: number) {
    setACarregarPendentes(true)
    const { data, error } = await supabase
      .from('faltas_registos')
      .select('*')
      .eq('instalacao_id', instalacaoId)
      .eq('estado', 'pendente')
      .order('data_pedido', { ascending: true })
      .order('hora_pedido', { ascending: true })
    if (!error) setPendentes((data as Registo[]) || [])
    setACarregarPendentes(false)
  }

  // ===== MARCAR FALTA =====
  function abrirModalFalta(prod: Produto) {
    setProdutoFaltaSel(prod)
    setFormFaltaQtd(1)
    setFormFaltaStaff('')
    setFormFaltaObs('')
    setModalFaltaAberto(true)
  }

  function fecharModalFalta() { setModalFaltaAberto(false); setProdutoFaltaSel(null) }

  async function guardarFalta() {
    if (!produtoFaltaSel || !instalacaoSel) return
    const staffNome = formFaltaStaff.trim()
    if (!staffNome) { alert('Seleciona o funcionário.'); return }
    if (!formFaltaQtd || formFaltaQtd <= 0) { alert('Introduz uma quantidade válida.'); return }
    setAGuardarFalta(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('faltas_registos').insert([{
      produto_id: produtoFaltaSel.id,
      instalacao_id: instalacaoSel.id,
      quantidade: formFaltaQtd,
      observacoes: formFaltaObs.trim() || null,
      estado: 'pendente',
      nome_staff_pedido: staffNome,
      user_id_pedido: user?.id || null,
      data_pedido: obterDataHoje(),
      hora_pedido: obterHoraAgora(),
    }])
    if (error) { alert('Erro ao guardar a falta.'); setAGuardarFalta(false); return }
    await carregarPendentes(instalacaoSel.id)
    fecharModalFalta()
    setAGuardarFalta(false)
  }

  // ===== MARCAR FEITO =====
  function abrirModalFeito(reg: Registo) {
    setRegistoFeitoSel(reg)
    setFormFeitoStaff('')
    setModalFeitoAberto(true)
  }

  function fecharModalFeito() { setModalFeitoAberto(false); setRegistoFeitoSel(null) }

  async function guardarFeito() {
    if (!registoFeitoSel || !instalacaoSel) return
    const staffNome = formFeitoStaff.trim()
    if (!staffNome) { alert('Seleciona o funcionário.'); return }
    setAGuardarFeito(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('faltas_registos').update({
      estado: 'feito',
      nome_staff_feito: staffNome,
      user_id_feito: user?.id || null,
      data_feito: obterDataHoje(),
      hora_feito: obterHoraAgora(),
    }).eq('id', registoFeitoSel.id)
    if (error) { alert('Erro ao marcar como feito.'); setAGuardarFeito(false); return }
    await carregarPendentes(instalacaoSel.id)
    fecharModalFeito()
    setAGuardarFeito(false)
  }

  async function reabrirRegisto(reg: Registo) {
    if (!instalacaoSel) return
    if (!window.confirm('Reabrir esta falta (voltar a pendente)?')) return
    const { error } = await supabase.from('faltas_registos').update({
      estado: 'pendente',
      nome_staff_feito: null,
      user_id_feito: null,
      data_feito: null,
      hora_feito: null,
    }).eq('id', reg.id)
    if (error) { alert('Erro ao reabrir.'); return }
    await carregarPendentes(instalacaoSel.id)
    if (modalHistoricoAberto) await carregarHistorico(filtroHistDataInicio, filtroHistDataFim)
  }

  async function apagarRegisto(reg: Registo) {
    if (!instalacaoSel) return
    if (!window.confirm('Apagar este registo de falta?')) return
    const { error } = await supabase.from('faltas_registos').delete().eq('id', reg.id)
    if (error) { alert('Erro ao apagar.'); return }
    await carregarPendentes(instalacaoSel.id)
    if (modalHistoricoAberto) await carregarHistorico(filtroHistDataInicio, filtroHistDataFim)
  }

  // ===== HISTÓRICO =====
  async function abrirModalHistorico() {
    if (!instalacaoSel) return
    const hoje = obterDataHoje()
    const ha30 = new Date(); ha30.setDate(ha30.getDate() - 30)
    const data30 = `${ha30.getFullYear()}-${String(ha30.getMonth() + 1).padStart(2, '0')}-${String(ha30.getDate()).padStart(2, '0')}`
    setFiltroHistDataInicio(data30); setFiltroHistDataFim(hoje)
    setModalHistoricoAberto(true)
    await carregarHistorico(data30, hoje)
  }

  async function carregarHistorico(dataInicio: string, dataFim: string) {
    if (!instalacaoSel) return
    setACarregarHistorico(true)
    const { data, error } = await supabase
      .from('faltas_registos').select('*')
      .eq('instalacao_id', instalacaoSel.id)
      .gte('data_pedido', dataInicio).lte('data_pedido', dataFim)
      .order('data_pedido', { ascending: false }).order('hora_pedido', { ascending: false })
    if (!error) setHistoricoRegistos((data as Registo[]) || [])
    setACarregarHistorico(false)
  }

  // ===== RENDER =====
  if (aVerificar) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>A carregar...</p>
      </div>
    )
  }

  // Estilos de impressão — inseridos como elemento <style> normal
  const estilosImpressao = (
    <style dangerouslySetInnerHTML={{
      __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-only { display: block !important; }
          .print-item { page-break-inside: avoid; }
          @page { margin: 1.5cm; }
        }
        .print-only { display: none; }
      `
    }} />
  )

  const barraTopo = (
    <div className="no-print" style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', padding: '6px 32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
        {estilosImpressao}
        {barraTopo}
        <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>Faltas</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Escolhe a loja com a qual queres trabalhar</p>
          </div>

          {aCarregarInstalacoes ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>A carregar...</p>
          ) : instalacoes.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🏪</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: '0 0 4px' }}>Ainda não há lojas criadas</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Cria as lojas na secção HACCP.</p>
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
      {estilosImpressao}
      {barraTopo}

      <div className="no-print" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>
              Faltas · <span style={{ color: '#80c944' }}>{instalacaoSel.nome}</span>
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Lista de produtos em falta para comprar
            </p>
          </div>
          <button onClick={trocarInstalacao}
            style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
            🔄 Trocar loja
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
          {([
            { id: 'pendentes', label: '🛒 Pendentes' },
            { id: 'catalogo', label: '📦 Catálogo de produtos' },
          ] as { id: AbaFaltas; label: string }[]).map((aba) => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
              style={{ backgroundColor: abaAtiva === aba.id ? '#80c944' : '#e5e7eb', color: abaAtiva === aba.id ? '#fff' : '#111', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              {aba.label}
            </button>
          ))}
        </div>

        {abaAtiva === 'pendentes' && renderAbaPendentes()}
        {abaAtiva === 'catalogo' && renderAbaCatalogo()}
      </div>

      {/* Vista de impressão — só aparece quando se imprime */}
      {renderVistaImpressao()}

      {renderModalFalta()}
      {renderModalFeito()}
      {renderModalHistorico()}
    </div>
  )

  // ===== RENDERS =====

  function renderAvisoSemStaff() {
    return (
      <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
        Ainda não há funcionários nesta loja. {ehGestor ? 'Adiciona-os na secção HACCP → Funcionários.' : 'Pede a um gestor para os adicionar na secção HACCP.'}
      </div>
    )
  }

  function renderVistaImpressao() {
    return (
      <div className="print-only" style={{ padding: '0', color: '#000', background: '#fff' }}>
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px', color: '#000' }}>
            Lista de faltas — {instalacaoSel?.nome}
          </h1>
          <p style={{ fontSize: '12px', margin: 0, color: '#000' }}>
            Impresso em {obterDataHoje()} {formatarHora(obterHoraAgora())} · {pendentes.length} {pendentes.length === 1 ? 'item' : 'itens'}
          </p>
        </div>

        {pendentes.length === 0 ? (
          <p style={{ fontSize: '14px', fontStyle: 'italic' }}>Sem faltas pendentes.</p>
        ) : (
          <div>
            {pendentes.map((reg) => {
              const prod = produtos.find((p) => p.id === reg.produto_id)
              return (
                <div key={reg.id} className="print-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px dashed #999' }}>
                  {/* Checkbox para riscar à mão */}
                  <span style={{
                    display: 'inline-block',
                    width: '20px', height: '20px',
                    border: '2px solid #000',
                    borderRadius: '3px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 2px', color: '#000' }}>
                      {prod?.nome || `Produto #${reg.produto_id}`}
                      <span style={{ fontWeight: '700', marginLeft: '10px' }}>
                        — {reg.quantidade}{prod?.unidade ? ` ${prod.unidade}` : ''}
                      </span>
                    </p>
                    {reg.observacoes && (
                      <p style={{ fontSize: '12px', margin: '2px 0 0', color: '#000', fontStyle: 'italic' }}>
                        {reg.observacoes}
                      </p>
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

  function renderAbaPendentes() {
    return (
      <>
        {/* Lista de pendentes */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>
              🛒 Faltas pendentes
              <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '13px', marginLeft: '8px' }}>
                ({pendentes.length} {pendentes.length === 1 ? 'item' : 'itens'})
              </span>
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={imprimirLista} disabled={pendentes.length === 0}
                style={{
                  background: pendentes.length === 0 ? '#d1d5db' : '#80c944',
                  color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px',
                  fontSize: '13px', cursor: pendentes.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '500'
                }}>
                🖨️ Imprimir lista
              </button>
              <button onClick={abrirModalHistorico} style={{ background: '#374151', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>📊 Ver histórico</button>
            </div>
          </div>

          {aCarregarPendentes ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : pendentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ fontSize: '36px', margin: '0 0 8px' }}>✅</p>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Sem faltas pendentes. Adiciona em baixo se for preciso.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendentes.map((reg) => {
                const prod = produtos.find((p) => p.id === reg.produto_id)
                return (
                  <div key={reg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '8px', padding: '12px 14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>
                        {prod?.nome || `Produto #${reg.produto_id}`}
                        <span style={{ fontWeight: '700', color: '#92400e', marginLeft: '8px' }}>
                          {reg.quantidade}{prod?.unidade ? ` ${prod.unidade}` : ''}
                        </span>
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        Pedido por {reg.nome_staff_pedido} · {reg.data_pedido} {formatarHora(reg.hora_pedido)}
                      </p>
                      {reg.observacoes && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0', fontStyle: 'italic' }}>📝 {reg.observacoes}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => abrirModalFeito(reg)}
                        style={{ background: '#80c944', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                        ✓ Feito
                      </button>
                      <button onClick={() => apagarRegisto(reg)}
                        style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Catálogo para marcar faltas */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 14px' }}>
            📦 Marcar produto em falta
          </p>
          {aCarregarProdutos ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : produtos.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              {ehGestor
                ? 'Ainda não há produtos no catálogo. Cria-os na aba "Catálogo de produtos".'
                : 'Ainda não há produtos no catálogo. Pede a um gestor para os criar.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {produtos.map((prod) => {
                const jaPendente = pendentes.find((p) => p.produto_id === prod.id)
                return (
                  <button key={prod.id} onClick={() => abrirModalFalta(prod)}
                    style={{
                      background: jaPendente ? '#fffbeb' : '#fff',
                      border: jaPendente ? '1px solid #fde68a' : '1px solid #e5e7eb',
                      borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#80c944'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = jaPendente ? '#fde68a' : '#e5e7eb'}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>
                      {prod.nome}
                      {prod.unidade && <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '12px', marginLeft: '6px' }}>({prod.unidade})</span>}
                    </p>
                    {prod.descricao && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 4px' }}>{prod.descricao}</p>}
                    {jaPendente && (
                      <p style={{ fontSize: '11px', color: '#92400e', margin: '4px 0 0', fontWeight: '500' }}>
                        ⚠ Já pendente: {jaPendente.quantidade}{prod.unidade ? ` ${prod.unidade}` : ''}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </>
    )
  }

  function renderAbaCatalogo() {
    if (!ehGestor) {
      return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Apenas gestores podem gerir o catálogo de produtos.</p>
        </div>
      )
    }
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>📦 Catálogo de produtos</p>
          {!novoProdutoAberto && !produtoEmEdicao && (
            <button onClick={abrirFormNovoProduto} style={{ background: '#80c944', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>+ Novo produto</button>
          )}
        </div>

        {(novoProdutoAberto || produtoEmEdicao) && (
          <div style={{ border: '2px solid #80c944', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 12px' }}>{produtoEmEdicao ? 'Editar produto' : 'Novo produto'}</p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome *</label>
                <input type="text" value={formProdNome} onChange={(e) => setFormProdNome(e.target.value)}
                  placeholder="ex: Azeite virgem extra"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Unidade (opcional)</label>
                <input type="text" value={formProdUnidade} onChange={(e) => setFormProdUnidade(e.target.value)}
                  placeholder="ex: kg, un, L, caixa, garrafa"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Descrição (opcional)</label>
                <input type="text" value={formProdDescricao} onChange={(e) => setFormProdDescricao(e.target.value)}
                  placeholder="ex: Marca preferida, especificações"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button onClick={guardarProduto} disabled={aGuardarProduto}
                  style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  {aGuardarProduto ? 'A guardar...' : 'Guardar'}
                </button>
                <button onClick={fecharFormProduto} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {produtos.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há produtos no catálogo desta loja.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {produtos.map((prod) => (
              <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0 }}>
                    {prod.nome}
                    {prod.unidade && <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '12px', marginLeft: '6px' }}>({prod.unidade})</span>}
                  </p>
                  {prod.descricao && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{prod.descricao}</p>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => abrirFormEditarProduto(prod)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => apagarProduto(prod)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Apagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderModalFalta() {
    if (!modalFaltaAberto || !produtoFaltaSel) return null
    const semStaff = staff.length === 0
    return (
      <div className="no-print" onClick={(e) => { if (e.target === e.currentTarget) fecharModalFalta() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>Marcar falta</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{produtoFaltaSel.nome}{produtoFaltaSel.unidade ? ` (${produtoFaltaSel.unidade})` : ''}</p>
            </div>
            <button onClick={fecharModalFalta} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              Quantidade {produtoFaltaSel.unidade ? `(${produtoFaltaSel.unidade})` : ''} *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" onClick={() => setFormFaltaQtd((q) => Math.max(0, q - 1))}
                style={{ background: '#e5e7eb', color: '#111', border: 'none', width: '40px', height: '40px', borderRadius: '8px', fontSize: '20px', fontWeight: '600', cursor: 'pointer' }}>−</button>
              <input type="number" value={formFaltaQtd} onChange={(e) => setFormFaltaQtd(Number(e.target.value))} min={0} step={0.5}
                style={{ flex: 1, border: '1px solid #d1d5db', padding: '10px 12px', borderRadius: '8px', fontSize: '18px', boxSizing: 'border-box', color: '#111', background: '#fff', textAlign: 'center', fontWeight: '600' }} />
              <button type="button" onClick={() => setFormFaltaQtd((q) => q + 1)}
                style={{ background: '#e5e7eb', color: '#111', border: 'none', width: '40px', height: '40px', borderRadius: '8px', fontSize: '20px', fontWeight: '600', cursor: 'pointer' }}>+</button>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Funcionário *</label>
            {semStaff ? renderAvisoSemStaff() : (
              <select value={formFaltaStaff} onChange={(e) => setFormFaltaStaff(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                <option value="">— Seleciona quem está a pedir —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.nome}>{s.nome}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
            <textarea value={formFaltaObs} onChange={(e) => setFormFaltaObs(e.target.value)} rows={2}
              placeholder="ex: marca específica, urgência..."
              style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={guardarFalta} disabled={aGuardarFalta || semStaff}
              style={{ background: semStaff ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: semStaff ? 'not-allowed' : 'pointer' }}>
              {aGuardarFalta ? 'A guardar...' : 'Guardar falta'}
            </button>
            <button onClick={fecharModalFalta} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

  function renderModalFeito() {
    if (!modalFeitoAberto || !registoFeitoSel) return null
    const prod = produtos.find((p) => p.id === registoFeitoSel.produto_id)
    const semStaff = staff.length === 0
    return (
      <div className="no-print" onClick={(e) => { if (e.target === e.currentTarget) fecharModalFeito() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>Marcar como comprado</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {prod?.nome || `Produto #${registoFeitoSel.produto_id}`} · {registoFeitoSel.quantidade}{prod?.unidade ? ` ${prod.unidade}` : ''}
              </p>
            </div>
            <button onClick={fecharModalFeito} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Funcionário *</label>
            {semStaff ? renderAvisoSemStaff() : (
              <select value={formFeitoStaff} onChange={(e) => setFormFeitoStaff(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                <option value="">— Seleciona quem comprou —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.nome}>{s.nome}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={guardarFeito} disabled={aGuardarFeito || semStaff}
              style={{ background: semStaff ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: semStaff ? 'not-allowed' : 'pointer' }}>
              {aGuardarFeito ? 'A guardar...' : '✓ Confirmar'}
            </button>
            <button onClick={fecharModalFeito} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

  function renderModalHistorico() {
    if (!modalHistoricoAberto) return null
    return (
      <div className="no-print" onClick={(e) => { if (e.target === e.currentTarget) setModalHistoricoAberto(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '900px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>Histórico de faltas — {instalacaoSel?.nome}</p>
            <button onClick={() => setModalHistoricoAberto(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕ Fechar</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>De</label>
              <input type="date" value={filtroHistDataInicio} onChange={(e) => setFiltroHistDataInicio(e.target.value)}
                style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Até</label>
              <input type="date" value={filtroHistDataFim} onChange={(e) => setFiltroHistDataFim(e.target.value)}
                style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
            </div>
            <button onClick={() => carregarHistorico(filtroHistDataInicio, filtroHistDataFim)}
              style={{ background: '#374151', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Aplicar</button>
          </div>

          {aCarregarHistorico ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : historicoRegistos.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Sem registos no período selecionado.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Data pedido</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Produto</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Qtd.</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Pedido por</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Estado</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Feito por</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {historicoRegistos.map((r) => {
                    const prod = produtos.find((p) => p.id === r.produto_id)
                    const feito = r.estado === 'feito'
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px' }}>{r.data_pedido} {formatarHora(r.hora_pedido)}</td>
                        <td style={{ padding: '8px 10px' }}>{prod?.nome || '—'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '600' }}>{r.quantidade}{prod?.unidade ? ` ${prod.unidade}` : ''}</td>
                        <td style={{ padding: '8px 10px' }}>{r.nome_staff_pedido}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: '600',
                            color: feito ? '#166534' : '#92400e',
                            background: feito ? '#dcfce7' : '#fef3c7',
                            padding: '3px 8px', borderRadius: '99px',
                          }}>
                            {feito ? '✓ Feito' : '⏳ Pendente'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#6b7280' }}>
                          {feito ? `${r.nome_staff_feito} · ${r.data_feito} ${formatarHora(r.hora_feito)}` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {feito ? (
                            <button onClick={() => reabrirRegisto(r)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '3px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>Reabrir</button>
                          ) : (
                            <button onClick={() => apagarRegisto(r)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '3px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}>Apagar</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }
}
