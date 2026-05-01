// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type AbaHaccp = 'temperaturas' | 'limpeza'

type Instalacao = {
  id: number
  nome: string
  morada: string | null
  ativo: boolean
  ordem: number
}

type Equipamento = {
  id: number
  instalacao_id: number
  nome: string
  descricao: string | null
  temp_min_aceitavel: number
  temp_max_aceitavel: number
  ativo: boolean
  ordem: number
}

type RegistoTemp = {
  id: number
  equipamento_id: number
  data_registo: string
  periodo: 'manha' | 'tarde'
  temperatura: number
  conforme: boolean
  observacoes: string | null
  nome_staff: string
}

type Espaco = {
  id: number
  instalacao_id: number
  nome: string
  descricao: string | null
  ativo: boolean
  ordem: number
}

type TarefaLimpeza = {
  id: number
  espaco_id: number
  tarefa: string
  frequencia: string | null
  notas: string | null
  ordem: number
  ativo: boolean
}

type RegistoLimpeza = {
  id: number
  espaco_id: number
  data_registo: string
  hora_registo: string
  observacoes: string | null
  nome_staff: string
}

type RegistoLimpezaTarefa = {
  id: number
  registo_limpeza_id: number
  tarefa_id: number
  concluida: boolean
}

type Staff = {
  id: number
  instalacao_id: number
  nome: string
  ativo: boolean
  ordem: number
}

const CHAVE_INSTALACAO = 'haccp_instalacao_id'

export default function HaccpHome() {
  const router = useRouter()
  const [aVerificar, setAVerificar] = useState(true)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [roleUtilizador, setRoleUtilizador] = useState<string>('')
  const ehGestor = roleUtilizador === 'gestor'

  // Instalações
  const [instalacoes, setInstalacoes] = useState<Instalacao[]>([])
  const [instalacaoSel, setInstalacaoSel] = useState<Instalacao | null>(null)
  const [aCarregarInstalacoes, setACarregarInstalacoes] = useState(false)
  const [gestaoInstalacoesAberta, setGestaoInstalacoesAberta] = useState(false)
  const [formInstalacaoAberto, setFormInstalacaoAberto] = useState(false)
  const [instalacaoEmEdicao, setInstalacaoEmEdicao] = useState<Instalacao | null>(null)
  const [formInstNome, setFormInstNome] = useState('')
  const [formInstMorada, setFormInstMorada] = useState('')
  const [aGuardarInst, setAGuardarInst] = useState(false)

  // Staff
  const [staff, setStaff] = useState<Staff[]>([])
  const [aCarregarStaff, setACarregarStaff] = useState(false)
  const [novoStaffAberto, setNovoStaffAberto] = useState(false)
  const [staffEmEdicao, setStaffEmEdicao] = useState<Staff | null>(null)
  const [formStaffNome, setFormStaffNome] = useState('')
  const [aGuardarStaff, setAGuardarStaff] = useState(false)

  // Abas
  const [abaAtiva, setAbaAtiva] = useState<AbaHaccp>('temperaturas')

  // --- TEMPERATURAS ---
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [aCarregarEquipamentos, setACarregarEquipamentos] = useState(false)
  const [novoEquipamentoAberto, setNovoEquipamentoAberto] = useState(false)
  const [equipamentoEmEdicao, setEquipamentoEmEdicao] = useState<Equipamento | null>(null)
  const [formEquipNome, setFormEquipNome] = useState('')
  const [formEquipDescricao, setFormEquipDescricao] = useState('')
  const [formEquipMin, setFormEquipMin] = useState(0)
  const [formEquipMax, setFormEquipMax] = useState(5)
  const [aGuardarEquip, setAGuardarEquip] = useState(false)

  const [registosHoje, setRegistosHoje] = useState<RegistoTemp[]>([])
  const [aCarregarRegistos, setACarregarRegistos] = useState(false)
  const [modalRegistoAberto, setModalRegistoAberto] = useState(false)
  const [equipamentoRegistoSel, setEquipamentoRegistoSel] = useState<Equipamento | null>(null)
  const [periodoRegistoSel, setPeriodoRegistoSel] = useState<'manha' | 'tarde'>('manha')
  const [formRegistoTemp, setFormRegistoTemp] = useState(4)
  const [formRegistoStaff, setFormRegistoStaff] = useState('')
  const [formRegistoObs, setFormRegistoObs] = useState('')
  const [aGuardarRegisto, setAGuardarRegisto] = useState(false)

  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false)
  const [historicoRegistos, setHistoricoRegistos] = useState<RegistoTemp[]>([])
  const [aCarregarHistorico, setACarregarHistorico] = useState(false)
  const [filtroHistDataInicio, setFiltroHistDataInicio] = useState('')
  const [filtroHistDataFim, setFiltroHistDataFim] = useState('')

  // --- LIMPEZA ---
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [aCarregarEspacos, setACarregarEspacos] = useState(false)
  const [tarefasPorEspaco, setTarefasPorEspaco] = useState<Record<number, TarefaLimpeza[]>>({})
  const [espacosExpandidos, setEspacosExpandidos] = useState<Record<number, boolean>>({})
  const [novoEspacoAberto, setNovoEspacoAberto] = useState(false)
  const [espacoEmEdicao, setEspacoEmEdicao] = useState<Espaco | null>(null)
  const [formEspNome, setFormEspNome] = useState('')
  const [formEspDescricao, setFormEspDescricao] = useState('')
  const [aGuardarEspaco, setAGuardarEspaco] = useState(false)

  // Nova tarefa: texto + notas
  const [novaTarefaPorEspaco, setNovaTarefaPorEspaco] = useState<Record<number, string>>({})
  const [novaTarefaNotasPorEspaco, setNovaTarefaNotasPorEspaco] = useState<Record<number, string>>({})
  const [aGuardarTarefa, setAGuardarTarefa] = useState(false)
  const [tarefaEmEdicaoId, setTarefaEmEdicaoId] = useState<number | null>(null)
  const [formTarefaTexto, setFormTarefaTexto] = useState('')
  const [formTarefaNotas, setFormTarefaNotas] = useState('')

  const [registosLimpezaHoje, setRegistosLimpezaHoje] = useState<RegistoLimpeza[]>([])
  const [registosLimpezaTarefas, setRegistosLimpezaTarefas] = useState<RegistoLimpezaTarefa[]>([])
  const [aCarregarRegistosLimpeza, setACarregarRegistosLimpeza] = useState(false)

  const [modalLimpezaAberto, setModalLimpezaAberto] = useState(false)
  const [espacoLimpezaSel, setEspacoLimpezaSel] = useState<Espaco | null>(null)
  const [formLimpezaStaff, setFormLimpezaStaff] = useState('')
  const [formLimpezaObs, setFormLimpezaObs] = useState('')
  const [formLimpezaTarefasConcluidas, setFormLimpezaTarefasConcluidas] = useState<Record<number, boolean>>({})
  const [aGuardarLimpeza, setAGuardarLimpeza] = useState(false)

  const [modalHistoricoLimpezaAberto, setModalHistoricoLimpezaAberto] = useState(false)
  const [historicoLimpezaRegistos, setHistoricoLimpezaRegistos] = useState<RegistoLimpeza[]>([])
  const [historicoLimpezaTarefas, setHistoricoLimpezaTarefas] = useState<RegistoLimpezaTarefa[]>([])
  const [aCarregarHistoricoLimpeza, setACarregarHistoricoLimpeza] = useState(false)
  const [filtroLimpezaDataInicio, setFiltroLimpezaDataInicio] = useState('')
  const [filtroLimpezaDataFim, setFiltroLimpezaDataFim] = useState('')

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
      carregarEquipamentos(instalacaoSel.id)
      carregarRegistosHoje(instalacaoSel.id)
      carregarEspacos(instalacaoSel.id)
      carregarRegistosLimpezaHoje(instalacaoSel.id)
      carregarStaff(instalacaoSel.id)
    } else {
      setEquipamentos([]); setRegistosHoje([])
      setEspacos([]); setTarefasPorEspaco({})
      setRegistosLimpezaHoje([]); setRegistosLimpezaTarefas([])
      setStaff([])
    }
  }, [instalacaoSel])

  useEffect(() => {
    const bloquear = modalRegistoAberto || modalHistoricoAberto || gestaoInstalacoesAberta || modalLimpezaAberto || modalHistoricoLimpezaAberto
    document.body.style.overflow = bloquear ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalRegistoAberto, modalHistoricoAberto, gestaoInstalacoesAberta, modalLimpezaAberto, modalHistoricoLimpezaAberto])

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

  function formatarHora(hora: string) {
    if (!hora) return '—'
    return hora.substring(0, 5)
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

  function abrirFormNovaInstalacao() {
    if (!ehGestor) return
    setInstalacaoEmEdicao(null); setFormInstNome(''); setFormInstMorada(''); setFormInstalacaoAberto(true)
  }

  function abrirFormEditarInstalacao(inst: Instalacao) {
    if (!ehGestor) return
    setInstalacaoEmEdicao(inst); setFormInstNome(inst.nome); setFormInstMorada(inst.morada || ''); setFormInstalacaoAberto(true)
  }

  function fecharFormInstalacao() { setFormInstalacaoAberto(false); setInstalacaoEmEdicao(null) }

  async function guardarInstalacao() {
    if (!ehGestor) return
    const nome = formInstNome.trim()
    if (!nome) { alert('Introduz o nome da loja.'); return }
    setAGuardarInst(true)
    const payload = { nome, morada: formInstMorada.trim() || null }
    if (instalacaoEmEdicao) {
      const { error } = await supabase.from('instalacoes').update(payload).eq('id', instalacaoEmEdicao.id)
      if (error) { alert('Erro ao atualizar loja.'); setAGuardarInst(false); return }
      if (instalacaoSel?.id === instalacaoEmEdicao.id) setInstalacaoSel({ ...instalacaoSel, ...payload })
    } else {
      const { error } = await supabase.from('instalacoes').insert([payload])
      if (error) { alert('Erro ao criar loja.'); setAGuardarInst(false); return }
    }
    fecharFormInstalacao()
    await carregarInstalacoes()
    setAGuardarInst(false)
  }

  async function apagarInstalacao(inst: Instalacao) {
    if (!ehGestor) return
    if (!window.confirm(`Apagar a loja "${inst.nome}"? Todos os equipamentos, espaços e registos associados serão também apagados.`)) return
    const { error } = await supabase.from('instalacoes').delete().eq('id', inst.id)
    if (error) { alert('Erro ao apagar a loja.'); return }
    if (instalacaoSel?.id === inst.id) trocarInstalacao()
    await carregarInstalacoes()
  }

  // ===== STAFF =====
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

  function abrirFormNovoStaff() {
    if (!ehGestor) return
    setStaffEmEdicao(null); setFormStaffNome(''); setNovoStaffAberto(true)
  }

  function abrirFormEditarStaff(s: Staff) {
    if (!ehGestor) return
    setStaffEmEdicao(s); setFormStaffNome(s.nome); setNovoStaffAberto(false)
  }

  function fecharFormStaff() { setNovoStaffAberto(false); setStaffEmEdicao(null) }

  async function guardarStaff() {
    if (!ehGestor) return
    if (!instalacaoSel) return
    const nome = formStaffNome.trim()
    if (!nome) { alert('Introduz o nome do funcionário.'); return }
    setAGuardarStaff(true)
    const payload = { instalacao_id: instalacaoSel.id, nome }
    if (staffEmEdicao) {
      const { error } = await supabase.from('haccp_staff').update({ nome }).eq('id', staffEmEdicao.id)
      if (error) {
        if (error.code === '23505') alert('Já existe um funcionário com este nome nesta loja.')
        else alert('Erro ao atualizar funcionário.')
        setAGuardarStaff(false); return
      }
    } else {
      const { error } = await supabase.from('haccp_staff').insert([payload])
      if (error) {
        if (error.code === '23505') alert('Já existe um funcionário com este nome nesta loja.')
        else alert('Erro ao criar funcionário.')
        setAGuardarStaff(false); return
      }
    }
    fecharFormStaff()
    await carregarStaff(instalacaoSel.id)
    setAGuardarStaff(false)
  }

  async function apagarStaff(s: Staff) {
    if (!ehGestor) return
    if (!instalacaoSel) return
    if (!window.confirm(`Remover "${s.nome}" da lista de funcionários? O histórico de registos com este nome é mantido.`)) return
    // Soft-delete: marcar como inativo para preservar histórico
    const { error } = await supabase.from('haccp_staff').update({ ativo: false }).eq('id', s.id)
    if (error) { alert('Erro ao remover funcionário.'); return }
    await carregarStaff(instalacaoSel.id)
  }

  // ===== EQUIPAMENTOS (TEMPERATURAS) =====
  async function carregarEquipamentos(instalacaoId: number) {
    setACarregarEquipamentos(true)
    const { data, error } = await supabase
      .from('haccp_equipamentos')
      .select('*')
      .eq('instalacao_id', instalacaoId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('id', { ascending: true })
    if (!error) setEquipamentos((data as Equipamento[]) || [])
    setACarregarEquipamentos(false)
  }

  function abrirFormNovoEquipamento() {
    if (!ehGestor) return
    setFormEquipNome(''); setFormEquipDescricao(''); setFormEquipMin(0); setFormEquipMax(5)
    setEquipamentoEmEdicao(null); setNovoEquipamentoAberto(true)
  }

  function abrirFormEditarEquipamento(equip: Equipamento) {
    if (!ehGestor) return
    setFormEquipNome(equip.nome); setFormEquipDescricao(equip.descricao || '')
    setFormEquipMin(Number(equip.temp_min_aceitavel)); setFormEquipMax(Number(equip.temp_max_aceitavel))
    setEquipamentoEmEdicao(equip); setNovoEquipamentoAberto(false)
  }

  function fecharFormEquipamento() { setNovoEquipamentoAberto(false); setEquipamentoEmEdicao(null) }

  async function guardarEquipamento() {
    if (!ehGestor) return
    if (!instalacaoSel) return
    const nome = formEquipNome.trim()
    if (!nome) { alert('Introduz o nome do equipamento.'); return }
    if (formEquipMin >= formEquipMax) { alert('A temperatura mínima tem de ser menor que a máxima.'); return }
    setAGuardarEquip(true)
    const payload = {
      instalacao_id: instalacaoSel.id, nome,
      descricao: formEquipDescricao.trim() || null,
      temp_min_aceitavel: formEquipMin, temp_max_aceitavel: formEquipMax,
    }
    if (equipamentoEmEdicao) {
      const { error } = await supabase.from('haccp_equipamentos').update(payload).eq('id', equipamentoEmEdicao.id)
      if (error) { alert('Erro ao atualizar equipamento.'); setAGuardarEquip(false); return }
    } else {
      const { error } = await supabase.from('haccp_equipamentos').insert([payload])
      if (error) { alert('Erro ao criar equipamento.'); setAGuardarEquip(false); return }
    }
    fecharFormEquipamento()
    await carregarEquipamentos(instalacaoSel.id)
    setAGuardarEquip(false)
  }

  async function apagarEquipamento(equip: Equipamento) {
    if (!ehGestor) return
    if (!instalacaoSel) return
    if (!window.confirm(`Apagar o equipamento "${equip.nome}"? Os registos anteriores também serão removidos.`)) return
    const { error } = await supabase.from('haccp_equipamentos').delete().eq('id', equip.id)
    if (error) { alert('Erro ao apagar equipamento.'); return }
    await carregarEquipamentos(instalacaoSel.id)
    await carregarRegistosHoje(instalacaoSel.id)
  }

  async function carregarRegistosHoje(instalacaoId: number) {
    setACarregarRegistos(true)
    const { data: equipsData } = await supabase.from('haccp_equipamentos').select('id').eq('instalacao_id', instalacaoId)
    const equipIds = ((equipsData as any[]) || []).map((e) => e.id)
    if (equipIds.length === 0) { setRegistosHoje([]); setACarregarRegistos(false); return }
    const { data, error } = await supabase
      .from('haccp_registos_temperatura').select('*')
      .eq('data_registo', obterDataHoje()).in('equipamento_id', equipIds)
    if (!error) setRegistosHoje((data as RegistoTemp[]) || [])
    setACarregarRegistos(false)
  }

  function obterRegistoDoDia(equipId: number, periodo: 'manha' | 'tarde') {
    return registosHoje.find((r) => r.equipamento_id === equipId && r.periodo === periodo)
  }

  function abrirModalRegisto(equip: Equipamento, periodo: 'manha' | 'tarde') {
    setEquipamentoRegistoSel(equip); setPeriodoRegistoSel(periodo)
    const valorInicial = Math.round(((Number(equip.temp_min_aceitavel) + Number(equip.temp_max_aceitavel)) / 2))
    setFormRegistoTemp(valorInicial); setFormRegistoStaff(''); setFormRegistoObs('')
    setModalRegistoAberto(true)
  }

  function fecharModalRegisto() { setModalRegistoAberto(false); setEquipamentoRegistoSel(null) }

  async function guardarRegistoTemperatura() {
    if (!equipamentoRegistoSel || !instalacaoSel) return
    const staffNome = formRegistoStaff.trim()
    if (!staffNome) { alert('Seleciona o funcionário.'); return }
    setAGuardarRegisto(true)
    const conforme = formRegistoTemp >= Number(equipamentoRegistoSel.temp_min_aceitavel) && formRegistoTemp <= Number(equipamentoRegistoSel.temp_max_aceitavel)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('haccp_registos_temperatura').insert([{
      equipamento_id: equipamentoRegistoSel.id,
      data_registo: obterDataHoje(), periodo: periodoRegistoSel,
      temperatura: formRegistoTemp, conforme,
      observacoes: formRegistoObs.trim() || null,
      nome_staff: staffNome, user_id: user?.id || null,
    }])
    if (error) {
      if (error.code === '23505') alert('Já existe um registo para este equipamento neste período.')
      else alert('Erro ao guardar o registo.')
      setAGuardarRegisto(false); return
    }
    await carregarRegistosHoje(instalacaoSel.id)
    fecharModalRegisto()
    setAGuardarRegisto(false)
  }

  async function abrirModalHistorico() {
    if (!instalacaoSel) return
    const hoje = obterDataHoje()
    const ha7 = new Date(); ha7.setDate(ha7.getDate() - 7)
    const data7 = `${ha7.getFullYear()}-${String(ha7.getMonth() + 1).padStart(2, '0')}-${String(ha7.getDate()).padStart(2, '0')}`
    setFiltroHistDataInicio(data7); setFiltroHistDataFim(hoje)
    setModalHistoricoAberto(true)
    await carregarHistorico(data7, hoje)
  }

  async function carregarHistorico(dataInicio: string, dataFim: string) {
    if (!instalacaoSel) return
    setACarregarHistorico(true)
    const equipIds = equipamentos.map((e) => e.id)
    if (equipIds.length === 0) { setHistoricoRegistos([]); setACarregarHistorico(false); return }
    const { data, error } = await supabase
      .from('haccp_registos_temperatura').select('*')
      .gte('data_registo', dataInicio).lte('data_registo', dataFim)
      .in('equipamento_id', equipIds)
      .order('data_registo', { ascending: false }).order('periodo', { ascending: true })
    if (!error) setHistoricoRegistos((data as RegistoTemp[]) || [])
    setACarregarHistorico(false)
  }

  // ===== ESPAÇOS (LIMPEZA) =====
  async function carregarEspacos(instalacaoId: number) {
    setACarregarEspacos(true)
    const { data: espData, error: espError } = await supabase
      .from('haccp_espacos').select('*')
      .eq('instalacao_id', instalacaoId).eq('ativo', true)
      .order('ordem', { ascending: true }).order('id', { ascending: true })
    if (espError) { setEspacos([]); setTarefasPorEspaco({}); setACarregarEspacos(false); return }
    const lista = (espData as Espaco[]) || []
    setEspacos(lista)
    const ids = lista.map((e) => e.id)
    if (ids.length > 0) {
      const { data: tarefasData } = await supabase
        .from('haccp_tarefas_limpeza').select('*')
        .in('espaco_id', ids).eq('ativo', true)
        .order('ordem', { ascending: true }).order('id', { ascending: true })
      const mapa: Record<number, TarefaLimpeza[]> = {}
      ids.forEach((id) => { mapa[id] = [] })
      ;((tarefasData as TarefaLimpeza[]) || []).forEach((t) => {
        if (!mapa[t.espaco_id]) mapa[t.espaco_id] = []
        mapa[t.espaco_id].push(t)
      })
      setTarefasPorEspaco(mapa)
    } else {
      setTarefasPorEspaco({})
    }
    setACarregarEspacos(false)
  }

  function toggleExpandirEspaco(id: number) {
    setEspacosExpandidos((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function abrirFormNovoEspaco() {
    if (!ehGestor) return
    setEspacoEmEdicao(null); setFormEspNome(''); setFormEspDescricao(''); setNovoEspacoAberto(true)
  }

  function abrirFormEditarEspaco(esp: Espaco) {
    if (!ehGestor) return
    setEspacoEmEdicao(esp); setFormEspNome(esp.nome); setFormEspDescricao(esp.descricao || ''); setNovoEspacoAberto(false)
  }

  function fecharFormEspaco() { setNovoEspacoAberto(false); setEspacoEmEdicao(null) }

  async function guardarEspaco() {
    if (!ehGestor) return
    if (!instalacaoSel) return
    const nome = formEspNome.trim()
    if (!nome) { alert('Introduz o nome do espaço.'); return }
    setAGuardarEspaco(true)
    const payload = {
      instalacao_id: instalacaoSel.id, nome,
      descricao: formEspDescricao.trim() || null,
    }
    if (espacoEmEdicao) {
      const { error } = await supabase.from('haccp_espacos').update(payload).eq('id', espacoEmEdicao.id)
      if (error) { alert('Erro ao atualizar espaço.'); setAGuardarEspaco(false); return }
    } else {
      const { error } = await supabase.from('haccp_espacos').insert([payload])
      if (error) { alert('Erro ao criar espaço.'); setAGuardarEspaco(false); return }
    }
    fecharFormEspaco()
    await carregarEspacos(instalacaoSel.id)
    setAGuardarEspaco(false)
  }

  async function apagarEspaco(esp: Espaco) {
    if (!ehGestor) return
    if (!instalacaoSel) return
    if (!window.confirm(`Apagar o espaço "${esp.nome}"? As tarefas e registos associados também serão apagados.`)) return
    const { error } = await supabase.from('haccp_espacos').delete().eq('id', esp.id)
    if (error) { alert('Erro ao apagar espaço.'); return }
    await carregarEspacos(instalacaoSel.id)
    await carregarRegistosLimpezaHoje(instalacaoSel.id)
  }

  async function adicionarTarefa(espacoId: number) {
    if (!ehGestor) return
    const texto = (novaTarefaPorEspaco[espacoId] || '').trim()
    if (!texto) return
    const notas = (novaTarefaNotasPorEspaco[espacoId] || '').trim()
    setAGuardarTarefa(true)
    const { error } = await supabase.from('haccp_tarefas_limpeza').insert([{
      espaco_id: espacoId, tarefa: texto,
      notas: notas || null,
    }])
    if (error) { alert('Erro ao adicionar tarefa.'); setAGuardarTarefa(false); return }
    setNovaTarefaPorEspaco((prev) => ({ ...prev, [espacoId]: '' }))
    setNovaTarefaNotasPorEspaco((prev) => ({ ...prev, [espacoId]: '' }))
    if (instalacaoSel) await carregarEspacos(instalacaoSel.id)
    setAGuardarTarefa(false)
  }

  function iniciarEdicaoTarefa(t: TarefaLimpeza) {
    if (!ehGestor) return
    setTarefaEmEdicaoId(t.id); setFormTarefaTexto(t.tarefa); setFormTarefaNotas(t.notas || '')
  }
  function cancelarEdicaoTarefa() { setTarefaEmEdicaoId(null); setFormTarefaTexto(''); setFormTarefaNotas('') }

  async function guardarEdicaoTarefa(tarefaId: number) {
    if (!ehGestor) return
    const texto = formTarefaTexto.trim()
    if (!texto) { alert('Introduz o texto da tarefa.'); return }
    const { error } = await supabase.from('haccp_tarefas_limpeza').update({
      tarefa: texto,
      notas: formTarefaNotas.trim() || null,
    }).eq('id', tarefaId)
    if (error) { alert('Erro ao atualizar tarefa.'); return }
    cancelarEdicaoTarefa()
    if (instalacaoSel) await carregarEspacos(instalacaoSel.id)
  }

  async function apagarTarefa(tarefa: TarefaLimpeza) {
    if (!ehGestor) return
    if (!window.confirm(`Apagar a tarefa "${tarefa.tarefa}"?`)) return
    const { error } = await supabase.from('haccp_tarefas_limpeza').delete().eq('id', tarefa.id)
    if (error) { alert('Erro ao apagar tarefa.'); return }
    if (instalacaoSel) await carregarEspacos(instalacaoSel.id)
  }

  // ===== REGISTOS DE LIMPEZA =====
  async function carregarRegistosLimpezaHoje(instalacaoId: number) {
    setACarregarRegistosLimpeza(true)
    const { data: espData } = await supabase.from('haccp_espacos').select('id').eq('instalacao_id', instalacaoId)
    const espIds = ((espData as any[]) || []).map((e) => e.id)
    if (espIds.length === 0) {
      setRegistosLimpezaHoje([]); setRegistosLimpezaTarefas([]); setACarregarRegistosLimpeza(false); return
    }
    const { data: regData } = await supabase
      .from('haccp_registos_limpeza').select('*')
      .eq('data_registo', obterDataHoje()).in('espaco_id', espIds)
    const registos = (regData as RegistoLimpeza[]) || []
    setRegistosLimpezaHoje(registos)
    if (registos.length > 0) {
      const regIds = registos.map((r) => r.id)
      const { data: tarData } = await supabase
        .from('haccp_registos_limpeza_tarefas').select('*')
        .in('registo_limpeza_id', regIds)
      setRegistosLimpezaTarefas((tarData as RegistoLimpezaTarefa[]) || [])
    } else {
      setRegistosLimpezaTarefas([])
    }
    setACarregarRegistosLimpeza(false)
  }

  function obterRegistoLimpezaHoje(espacoId: number) {
    return registosLimpezaHoje.find((r) => r.espaco_id === espacoId)
  }

  function contarTarefasConcluidas(registoId: number) {
    const tarefas = registosLimpezaTarefas.filter((t) => t.registo_limpeza_id === registoId)
    const concluidas = tarefas.filter((t) => t.concluida).length
    return { concluidas, total: tarefas.length }
  }

  function abrirModalLimpeza(esp: Espaco) {
    setEspacoLimpezaSel(esp)
    setFormLimpezaStaff('')
    setFormLimpezaObs('')
    // Começa todas as checkboxes desligadas
    const tarefas = tarefasPorEspaco[esp.id] || []
    const init: Record<number, boolean> = {}
    tarefas.forEach((t) => { init[t.id] = false })
    setFormLimpezaTarefasConcluidas(init)
    setModalLimpezaAberto(true)
  }

  function fecharModalLimpeza() { setModalLimpezaAberto(false); setEspacoLimpezaSel(null) }

  function toggleTarefaConcluida(tarefaId: number) {
    setFormLimpezaTarefasConcluidas((prev) => ({ ...prev, [tarefaId]: !prev[tarefaId] }))
  }

  async function guardarRegistoLimpeza() {
    if (!espacoLimpezaSel || !instalacaoSel) return
    const staffNome = formLimpezaStaff.trim()
    if (!staffNome) { alert('Seleciona o funcionário.'); return }
    setAGuardarLimpeza(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: regData, error: regError } = await supabase
      .from('haccp_registos_limpeza').insert([{
        espaco_id: espacoLimpezaSel.id,
        data_registo: obterDataHoje(),
        hora_registo: obterHoraAgora(),
        observacoes: formLimpezaObs.trim() || null,
        nome_staff: staffNome,
        user_id: user?.id || null,
      }]).select().single()
    if (regError) {
      if (regError.code === '23505') alert('Já existe um registo de limpeza hoje para este espaço.')
      else alert('Erro ao guardar o registo.')
      setAGuardarLimpeza(false); return
    }
    const tarefas = tarefasPorEspaco[espacoLimpezaSel.id] || []
    if (tarefas.length > 0) {
      const linhasTarefas = tarefas.map((t) => ({
        registo_limpeza_id: regData.id,
        tarefa_id: t.id,
        concluida: !!formLimpezaTarefasConcluidas[t.id],
      }))
      const { error: tarError } = await supabase.from('haccp_registos_limpeza_tarefas').insert(linhasTarefas)
      if (tarError) {
        alert('Registo criado mas houve erro a guardar o estado das tarefas.')
      }
    }
    await carregarRegistosLimpezaHoje(instalacaoSel.id)
    fecharModalLimpeza()
    setAGuardarLimpeza(false)
  }

  async function abrirModalHistoricoLimpeza() {
    if (!instalacaoSel) return
    const hoje = obterDataHoje()
    const ha7 = new Date(); ha7.setDate(ha7.getDate() - 7)
    const data7 = `${ha7.getFullYear()}-${String(ha7.getMonth() + 1).padStart(2, '0')}-${String(ha7.getDate()).padStart(2, '0')}`
    setFiltroLimpezaDataInicio(data7); setFiltroLimpezaDataFim(hoje)
    setModalHistoricoLimpezaAberto(true)
    await carregarHistoricoLimpeza(data7, hoje)
  }

  async function carregarHistoricoLimpeza(dataInicio: string, dataFim: string) {
    if (!instalacaoSel) return
    setACarregarHistoricoLimpeza(true)
    const espIds = espacos.map((e) => e.id)
    if (espIds.length === 0) {
      setHistoricoLimpezaRegistos([]); setHistoricoLimpezaTarefas([]); setACarregarHistoricoLimpeza(false); return
    }
    const { data: regData } = await supabase
      .from('haccp_registos_limpeza').select('*')
      .gte('data_registo', dataInicio).lte('data_registo', dataFim)
      .in('espaco_id', espIds)
      .order('data_registo', { ascending: false }).order('hora_registo', { ascending: false })
    const registos = (regData as RegistoLimpeza[]) || []
    setHistoricoLimpezaRegistos(registos)
    if (registos.length > 0) {
      const regIds = registos.map((r) => r.id)
      const { data: tarData } = await supabase
        .from('haccp_registos_limpeza_tarefas').select('*').in('registo_limpeza_id', regIds)
      setHistoricoLimpezaTarefas((tarData as RegistoLimpezaTarefa[]) || [])
    } else {
      setHistoricoLimpezaTarefas([])
    }
    setACarregarHistoricoLimpeza(false)
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111', margin: '0 0 6px' }}>HACCP</h1>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Escolhe a loja com a qual queres trabalhar</p>
            </div>
            {ehGestor && (
              <button onClick={() => setGestaoInstalacoesAberta(true)}
                style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
                ⚙️ Gerir lojas
              </button>
            )}
          </div>

          {aCarregarInstalacoes ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>A carregar...</p>
          ) : instalacoes.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', margin: '0 0 12px' }}>🏪</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: '0 0 4px' }}>Ainda não há lojas criadas</p>
              {ehGestor ? (
                <>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>Clica em "Gerir lojas" no canto superior direito para criar a primeira.</p>
                  <button onClick={() => setGestaoInstalacoesAberta(true)}
                    style={{ background: '#80c944', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                    ⚙️ Gerir lojas
                  </button>
                </>
              ) : (
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Pede a um gestor para criar uma loja.</p>
              )}
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

        {ehGestor && renderModalGestaoInstalacoes()}
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
              HACCP · <span style={{ color: '#80c944' }}>{instalacaoSel.nome}</span>
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {instalacaoSel.morada || 'Controlo de segurança alimentar'}
            </p>
          </div>
          <button onClick={trocarInstalacao}
            style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
            🔄 Trocar loja
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
          {([
            { id: 'temperaturas', label: '🌡️ Temperaturas de frigoríficos' },
            { id: 'limpeza', label: '🧽 Registos de limpeza' },
          ] as { id: AbaHaccp; label: string }[]).map((aba) => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
              style={{ backgroundColor: abaAtiva === aba.id ? '#80c944' : '#e5e7eb', color: abaAtiva === aba.id ? '#fff' : '#111', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              {aba.label}
            </button>
          ))}
        </div>

        {abaAtiva === 'temperaturas' && renderAbaTemperaturas()}
        {abaAtiva === 'limpeza' && renderAbaLimpeza()}

        {ehGestor && renderSecaoStaff()}
      </div>

      {renderModalRegistoTemperatura()}
      {renderModalHistoricoTemperatura()}
      {ehGestor && renderModalGestaoInstalacoes()}
      {renderModalLimpeza()}
      {renderModalHistoricoLimpeza()}
    </div>
  )

  // ===== RENDERS =====

  function renderAbaTemperaturas() {
    return (
      <>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>🌡️ Registos de hoje <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '13px' }}>({obterDataHoje()})</span></p>
            <button onClick={abrirModalHistorico} style={{ background: '#374151', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>📊 Ver histórico</button>
          </div>
          {aCarregarRegistos || aCarregarEquipamentos ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : equipamentos.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              {ehGestor ? 'Ainda não há equipamentos nesta loja. Cria um em baixo.' : 'Ainda não há equipamentos nesta loja. Pede a um gestor para os criar.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {equipamentos.map((equip) => {
                const regManha = obterRegistoDoDia(equip.id, 'manha')
                const regTarde = obterRegistoDoDia(equip.id, 'tarde')
                return (
                  <div key={equip.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>{equip.nome}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>Aceitável: {equip.temp_min_aceitavel}°C a {equip.temp_max_aceitavel}°C</p>
                    {(['manha', 'tarde'] as const).map((periodo) => {
                      const reg = periodo === 'manha' ? regManha : regTarde
                      const label = periodo === 'manha' ? 'Manhã' : 'Tarde'
                      return (
                        <div key={periodo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px dashed #f3f4f6' }}>
                          <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{label}</span>
                          {reg ? (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: reg.conforme ? '#16a34a' : '#dc2626' }}>
                              {reg.temperatura}°C {reg.conforme ? '✓' : '⚠'}
                            </span>
                          ) : (
                            <button onClick={() => abrirModalRegisto(equip, periodo)} style={{ background: '#80c944', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '11px', cursor: 'pointer', fontWeight: '500' }}>Registar</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {ehGestor && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>⚙️ Equipamentos</p>
              {!novoEquipamentoAberto && !equipamentoEmEdicao && (
                <button onClick={abrirFormNovoEquipamento} style={{ background: '#80c944', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>+ Novo equipamento</button>
              )}
            </div>

            {(novoEquipamentoAberto || equipamentoEmEdicao) && (
              <div style={{ border: '2px solid #80c944', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 12px' }}>{equipamentoEmEdicao ? 'Editar equipamento' : 'Novo equipamento'}</p>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome *</label>
                    <input type="text" value={formEquipNome} onChange={(e) => setFormEquipNome(e.target.value)}
                      placeholder="ex: Frigorífico positivo cozinha"
                      style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Descrição (opcional)</label>
                    <input type="text" value={formEquipDescricao} onChange={(e) => setFormEquipDescricao(e.target.value)}
                      placeholder="ex: Carnes e peixes"
                      style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Temp. mínima aceitável (°C)</label>
                      <input type="number" value={formEquipMin} onChange={(e) => setFormEquipMin(Number(e.target.value))}
                        style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Temp. máxima aceitável (°C)</label>
                      <input type="number" value={formEquipMax} onChange={(e) => setFormEquipMax(Number(e.target.value))}
                        style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={guardarEquipamento} disabled={aGuardarEquip}
                      style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                      {aGuardarEquip ? 'A guardar...' : 'Guardar'}
                    </button>
                    <button onClick={fecharFormEquipamento} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            {equipamentos.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há equipamentos nesta loja.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {equipamentos.map((equip) => (
                  <div key={equip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0 }}>{equip.nome}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                        {equip.temp_min_aceitavel}°C a {equip.temp_max_aceitavel}°C
                        {equip.descricao && ` · ${equip.descricao}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => abrirFormEditarEquipamento(equip)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => apagarEquipamento(equip)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Apagar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  function renderAbaLimpeza() {
    return (
      <>
        {/* Registos de hoje */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>🧽 Registos de hoje <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '13px' }}>({obterDataHoje()})</span></p>
            <button onClick={abrirModalHistoricoLimpeza} style={{ background: '#374151', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>📊 Ver histórico</button>
          </div>
          {aCarregarRegistosLimpeza || aCarregarEspacos ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : espacos.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              {ehGestor ? 'Ainda não há espaços nesta loja. Cria um em baixo.' : 'Ainda não há espaços nesta loja. Pede a um gestor para os criar.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {espacos.map((esp) => {
                const reg = obterRegistoLimpezaHoje(esp.id)
                const tarefas = tarefasPorEspaco[esp.id] || []
                return (
                  <div key={esp.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>{esp.nome}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>
                      {tarefas.length} {tarefas.length === 1 ? 'tarefa' : 'tarefas'}
                      {esp.descricao && ` · ${esp.descricao}`}
                    </p>
                    {reg ? (() => {
                      const { concluidas, total } = contarTarefasConcluidas(reg.id)
                      const tudoFeito = total > 0 && concluidas === total
                      return (
                        <div style={{ background: tudoFeito ? '#dcfce7' : '#fef3c7', borderRadius: '6px', padding: '8px 10px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: tudoFeito ? '#166534' : '#92400e', margin: '0 0 2px' }}>
                            {tudoFeito ? '✓ Registado' : '⚠ Parcial'} · {formatarHora(reg.hora_registo)}
                          </p>
                          <p style={{ fontSize: '11px', color: tudoFeito ? '#166534' : '#92400e', margin: '0 0 2px' }}>{concluidas}/{total} tarefas feitas</p>
                          <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{reg.nome_staff}</p>
                        </div>
                      )
                    })() : (
                      tarefas.length === 0 ? (
                        <p style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                          {ehGestor ? 'Adiciona tarefas em baixo antes de registar' : 'Sem tarefas definidas. Pede a um gestor.'}
                        </p>
                      ) : (
                        <button onClick={() => abrirModalLimpeza(esp)}
                          style={{ background: '#80c944', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', width: '100%' }}>
                          Registar limpeza
                        </button>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Espaços e tarefas - apenas visível a gestores */}
        {ehGestor && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>🏠 Espaços e tarefas</p>
              {!novoEspacoAberto && !espacoEmEdicao && (
                <button onClick={abrirFormNovoEspaco} style={{ background: '#80c944', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>+ Novo espaço</button>
              )}
            </div>

            {(novoEspacoAberto || espacoEmEdicao) && (
              <div style={{ border: '2px solid #80c944', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 12px' }}>{espacoEmEdicao ? 'Editar espaço' : 'Novo espaço'}</p>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome *</label>
                    <input type="text" value={formEspNome} onChange={(e) => setFormEspNome(e.target.value)}
                      placeholder="ex: Cozinha principal"
                      style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Descrição (opcional)</label>
                    <input type="text" value={formEspDescricao} onChange={(e) => setFormEspDescricao(e.target.value)}
                      placeholder="ex: Zona quente e fria"
                      style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={guardarEspaco} disabled={aGuardarEspaco}
                      style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                      {aGuardarEspaco ? 'A guardar...' : 'Guardar'}
                    </button>
                    <button onClick={fecharFormEspaco} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            {espacos.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há espaços nesta loja.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {espacos.map((esp) => {
                  const expandido = !!espacosExpandidos[esp.id]
                  const tarefas = tarefasPorEspaco[esp.id] || []
                  return (
                    <div key={esp.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb', cursor: 'pointer' }} onClick={() => toggleExpandirEspaco(esp.id)}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0 }}>
                            {expandido ? '▼' : '▶'} {esp.nome}
                            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400', marginLeft: '8px' }}>({tarefas.length})</span>
                          </p>
                          {esp.descricao && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 18px' }}>{esp.descricao}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => abrirFormEditarEspaco(esp)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                          <button onClick={() => apagarEspaco(esp)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Apagar</button>
                        </div>
                      </div>
                      {expandido && (
                        <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb' }}>
                          {tarefas.length === 0 ? (
                            <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', margin: '0 0 10px' }}>Sem tarefas. Adiciona a primeira em baixo.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                              {tarefas.map((t) => (
                                <div key={t.id} style={{ padding: '8px 10px', background: '#fff', border: '1px solid #f3f4f6', borderRadius: '6px' }}>
                                  {tarefaEmEdicaoId === t.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div>
                                        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Tarefa</label>
                                        <input type="text" value={formTarefaTexto} onChange={(e) => setFormTarefaTexto(e.target.value)}
                                          placeholder="ex: Limpar bancadas"
                                          style={{ width: '100%', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '5px', fontSize: '13px', color: '#111', background: '#fff', boxSizing: 'border-box' }} />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Notas (periodicidade, detalhes)</label>
                                        <textarea value={formTarefaNotas} onChange={(e) => setFormTarefaNotas(e.target.value)} rows={2}
                                          placeholder="ex: Diário, antes do serviço. Usar desengordurante."
                                          style={{ width: '100%', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '5px', fontSize: '13px', color: '#111', background: '#fff', boxSizing: 'border-box', resize: 'vertical' }} />
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => guardarEdicaoTarefa(t.id)} style={{ background: '#80c944', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Guardar</button>
                                        <button onClick={cancelarEdicaoTarefa} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                      <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '13px', color: '#111', margin: 0 }}>• {t.tarefa}</p>
                                        {t.notas && <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0 10px', fontStyle: 'italic' }}>📝 {t.notas}</p>}
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => iniciarEdicaoTarefa(t)} style={{ background: 'transparent', border: 'none', color: '#1e40af', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                                        <button onClick={() => apagarTarefa(t)} style={{ background: 'transparent', border: 'none', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}>×</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: '#f9fafb', borderRadius: '6px' }}>
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, fontWeight: '500' }}>Adicionar nova tarefa</p>
                            <input type="text" value={novaTarefaPorEspaco[esp.id] || ''}
                              onChange={(e) => setNovaTarefaPorEspaco((prev) => ({ ...prev, [esp.id]: e.target.value }))}
                              placeholder="Nome da tarefa..."
                              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '5px', fontSize: '13px', color: '#111', background: '#fff', boxSizing: 'border-box' }} />
                            <textarea value={novaTarefaNotasPorEspaco[esp.id] || ''}
                              onChange={(e) => setNovaTarefaNotasPorEspaco((prev) => ({ ...prev, [esp.id]: e.target.value }))}
                              placeholder="Notas (periodicidade, produtos a usar, detalhes...)"
                              rows={2}
                              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '5px', fontSize: '13px', color: '#111', background: '#fff', boxSizing: 'border-box', resize: 'vertical' }} />
                            <button onClick={() => adicionarTarefa(esp.id)} disabled={aGuardarTarefa}
                              style={{ background: '#80c944', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', fontWeight: '500', alignSelf: 'flex-start' }}>
                              {aGuardarTarefa ? 'A guardar...' : '+ Adicionar tarefa'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  function renderSecaoStaff() {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>👥 Funcionários</p>
          {!novoStaffAberto && !staffEmEdicao && (
            <button onClick={abrirFormNovoStaff} style={{ background: '#80c944', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>+ Novo funcionário</button>
          )}
        </div>

        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 14px' }}>
          Estes nomes aparecem no menu ao registar temperaturas e limpezas.
        </p>

        {(novoStaffAberto || staffEmEdicao) && (
          <div style={{ border: '2px solid #80c944', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 12px' }}>{staffEmEdicao ? 'Editar funcionário' : 'Novo funcionário'}</p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome *</label>
                <input type="text" value={formStaffNome} onChange={(e) => setFormStaffNome(e.target.value)}
                  placeholder="ex: Maria Silva"
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button onClick={guardarStaff} disabled={aGuardarStaff}
                  style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  {aGuardarStaff ? 'A guardar...' : 'Guardar'}
                </button>
                <button onClick={fecharFormStaff} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {aCarregarStaff ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
        ) : staff.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há funcionários nesta loja.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {staff.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0 }}>{s.nome}</p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => abrirFormEditarStaff(s)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => apagarStaff(s)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderModalRegistoTemperatura() {
    if (!modalRegistoAberto || !equipamentoRegistoSel) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) fecharModalRegisto() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>Registo de temperatura</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{equipamentoRegistoSel.nome} · {periodoRegistoSel === 'manha' ? 'Manhã' : 'Tarde'}</p>
            </div>
            <button onClick={fecharModalRegisto} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              Temperatura (aceitável: {equipamentoRegistoSel.temp_min_aceitavel}°C a {equipamentoRegistoSel.temp_max_aceitavel}°C)
            </label>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <span style={{
                fontSize: '36px', fontWeight: '700',
                color: formRegistoTemp >= Number(equipamentoRegistoSel.temp_min_aceitavel) && formRegistoTemp <= Number(equipamentoRegistoSel.temp_max_aceitavel) ? '#16a34a' : '#dc2626'
              }}>{formRegistoTemp}°C</span>
            </div>
            <input type="range" min={-20} max={20} step={0.5} value={formRegistoTemp}
              onChange={(e) => setFormRegistoTemp(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#80c944' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              <span>-20°C</span><span>0°C</span><span>+20°C</span>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Funcionário *</label>
            {staff.length === 0 ? (
              <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                Ainda não há funcionários nesta loja. {ehGestor ? 'Adiciona-os na secção "Funcionários" abaixo.' : 'Pede a um gestor para os adicionar.'}
              </div>
            ) : (
              <select value={formRegistoStaff} onChange={(e) => setFormRegistoStaff(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                <option value="">— Seleciona quem fez o registo —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.nome}>{s.nome}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
            <textarea value={formRegistoObs} onChange={(e) => setFormRegistoObs(e.target.value)} rows={2}
              style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={guardarRegistoTemperatura} disabled={aGuardarRegisto || staff.length === 0}
              style={{ background: staff.length === 0 ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: staff.length === 0 ? 'not-allowed' : 'pointer' }}>
              {aGuardarRegisto ? 'A guardar...' : 'Guardar registo'}
            </button>
            <button onClick={fecharModalRegisto} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

  function renderModalHistoricoTemperatura() {
    if (!modalHistoricoAberto) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setModalHistoricoAberto(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '900px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>Histórico de temperaturas — {instalacaoSel?.nome}</p>
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
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Data</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Período</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Equipamento</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Temp.</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Staff</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoRegistos.map((r) => {
                    const equip = equipamentos.find((e) => e.id === r.equipamento_id)
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px' }}>{r.data_registo}</td>
                        <td style={{ padding: '8px 10px' }}>{r.periodo === 'manha' ? 'Manhã' : 'Tarde'}</td>
                        <td style={{ padding: '8px 10px' }}>{equip?.nome || '—'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '600', color: r.conforme ? '#16a34a' : '#dc2626' }}>
                          {r.temperatura}°C {r.conforme ? '✓' : '⚠'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>{r.nome_staff}</td>
                        <td style={{ padding: '8px 10px', color: '#6b7280' }}>{r.observacoes || '—'}</td>
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

  function renderModalLimpeza() {
    if (!modalLimpezaAberto || !espacoLimpezaSel) return null
    const tarefas = tarefasPorEspaco[espacoLimpezaSel.id] || []
    const totalMarcadas = Object.values(formLimpezaTarefasConcluidas).filter(Boolean).length
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) fecharModalLimpeza() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>Registo de limpeza</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{espacoLimpezaSel.nome}</p>
            </div>
            <button onClick={fecharModalLimpeza} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
              Tarefas realizadas ({totalMarcadas}/{tarefas.length})
            </label>
            {tarefas.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Este espaço não tem tarefas definidas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tarefas.map((t) => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', background: formLimpezaTarefasConcluidas[t.id] ? '#f0fdf4' : '#fff' }}>
                    <input type="checkbox" checked={!!formLimpezaTarefasConcluidas[t.id]}
                      onChange={() => toggleTarefaConcluida(t.id)}
                      style={{ width: '18px', height: '18px', accentColor: '#80c944', cursor: 'pointer', marginTop: '1px' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', color: '#111' }}>{t.tarefa}</span>
                      {t.notas && <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0', fontStyle: 'italic' }}>📝 {t.notas}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Funcionário *</label>
            {staff.length === 0 ? (
              <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                Ainda não há funcionários nesta loja. {ehGestor ? 'Adiciona-os na secção "Funcionários" abaixo.' : 'Pede a um gestor para os adicionar.'}
              </div>
            ) : (
              <select value={formLimpezaStaff} onChange={(e) => setFormLimpezaStaff(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                <option value="">— Seleciona quem fez a limpeza —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.nome}>{s.nome}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
            <textarea value={formLimpezaObs} onChange={(e) => setFormLimpezaObs(e.target.value)} rows={2}
              style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={guardarRegistoLimpeza} disabled={aGuardarLimpeza || staff.length === 0}
              style={{ background: staff.length === 0 ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: staff.length === 0 ? 'not-allowed' : 'pointer' }}>
              {aGuardarLimpeza ? 'A guardar...' : 'Guardar registo'}
            </button>
            <button onClick={fecharModalLimpeza} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

  function renderModalHistoricoLimpeza() {
    if (!modalHistoricoLimpezaAberto) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setModalHistoricoLimpezaAberto(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '900px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>Histórico de limpeza — {instalacaoSel?.nome}</p>
            <button onClick={() => setModalHistoricoLimpezaAberto(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕ Fechar</button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>De</label>
              <input type="date" value={filtroLimpezaDataInicio} onChange={(e) => setFiltroLimpezaDataInicio(e.target.value)}
                style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Até</label>
              <input type="date" value={filtroLimpezaDataFim} onChange={(e) => setFiltroLimpezaDataFim(e.target.value)}
                style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
            </div>
            <button onClick={() => carregarHistoricoLimpeza(filtroLimpezaDataInicio, filtroLimpezaDataFim)}
              style={{ background: '#374151', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Aplicar</button>
          </div>

          {aCarregarHistoricoLimpeza ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
          ) : historicoLimpezaRegistos.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Sem registos no período selecionado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {historicoLimpezaRegistos.map((r) => {
                const esp = espacos.find((e) => e.id === r.espaco_id)
                const tarefasDoRegisto = historicoLimpezaTarefas.filter((t) => t.registo_limpeza_id === r.id)
                const concluidas = tarefasDoRegisto.filter((t) => t.concluida).length
                const total = tarefasDoRegisto.length
                const tudoFeito = total > 0 && concluidas === total
                return (
                  <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>{esp?.nome || '—'}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{r.data_registo} · {formatarHora(r.hora_registo)} · {r.nome_staff}</p>
                      </div>
                      <span style={{
                        fontSize: '12px', fontWeight: '600',
                        color: tudoFeito ? '#166534' : '#92400e',
                        background: tudoFeito ? '#dcfce7' : '#fef3c7',
                        padding: '4px 10px', borderRadius: '99px',
                      }}>
                        {concluidas}/{total} tarefas {tudoFeito ? '✓' : '⚠'}
                      </span>
                    </div>
                    {tarefasDoRegisto.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {tarefasDoRegisto.map((t) => {
                          // tentar encontrar o texto da tarefa — pode não estar em tarefasPorEspaco se a tarefa foi apagada
                          const textoTarefa = (() => {
                            for (const lista of Object.values(tarefasPorEspaco)) {
                              const encontrada = lista.find((tt) => tt.id === t.tarefa_id)
                              if (encontrada) return encontrada.tarefa
                            }
                            return `Tarefa #${t.tarefa_id}`
                          })()
                          return (
                            <p key={t.id} style={{ fontSize: '12px', margin: 0, color: t.concluida ? '#166534' : '#9ca3af', textDecoration: t.concluida ? 'none' : 'line-through' }}>
                              {t.concluida ? '✓' : '○'} {textoTarefa}
                            </p>
                          )
                        })}
                      </div>
                    )}
                    {r.observacoes && <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>Obs: {r.observacoes}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderModalGestaoInstalacoes() {
    if (!gestaoInstalacoesAberta) return null
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) setGestaoInstalacoesAberta(false) }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '640px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>Gerir lojas</p>
            <button onClick={() => setGestaoInstalacoesAberta(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕ Fechar</button>
          </div>

          {!formInstalacaoAberto && (
            <button onClick={abrirFormNovaInstalacao}
              style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '16px' }}>+ Nova loja</button>
          )}

          {formInstalacaoAberto && (
            <div style={{ border: '2px solid #80c944', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 12px' }}>{instalacaoEmEdicao ? 'Editar loja' : 'Nova loja'}</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome *</label>
                  <input type="text" value={formInstNome} onChange={(e) => setFormInstNome(e.target.value)}
                    placeholder="ex: Loja do Porto"
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Morada</label>
                  <input type="text" value={formInstMorada} onChange={(e) => setFormInstMorada(e.target.value)}
                    placeholder="ex: Rua da Cozinha, 123, 4000-000 Porto"
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={guardarInstalacao} disabled={aGuardarInst}
                    style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                    {aGuardarInst ? 'A guardar...' : 'Guardar'}
                  </button>
                  <button onClick={fecharFormInstalacao} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {instalacoes.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Ainda não há lojas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {instalacoes.map((inst) => (
                <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0 }}>{inst.nome}</p>
                    {inst.morada && <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>{inst.morada}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => abrirFormEditarInstalacao(inst)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => apagarInstalacao(inst)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Apagar</button>
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
