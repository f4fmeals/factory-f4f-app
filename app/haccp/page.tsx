// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type AbaHaccp = 'temperaturas' | 'limpeza' | 'lavagem_horto' | 'confeccao_arref' | 'rececao'

type Instalacao = {
  id: number
  nome: string
  morada: string | null
  ativo: boolean
  ordem: number
  tem_fabrico: boolean
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

type RegistoLavagem = {
  id: string
  atualizado_em: string
  ingrediente_nome: string
  componente_nome: string
  prato_nome: string
  quantidade_desinfectante_ml: number
  litros_agua: number
  tempo_minutos: number
  nome_staff: string | null
}

type RegistoConfeccao = {
  id: string
  atualizado_em: string
  componente_nome: string
  pratos_destino: string
  quantidade_final: number | null
  unidade_rendimento: string | null
  temperatura_confeccao: number | null
  temperatura_abatimento: number | null
  tempo_arrefecimento: number | null
  nome_staff: string | null
}

type IngredienteSugestao = {
  id: number
  nome: string
  categoria: string | null
  nome_fornecedor: string | null
}

type RegistoRececao = {
  id: number
  instalacao_id: number
  ingrediente_id: number
  produto_nome: string
  categoria: string | null
  fornecedor_nome: string
  data_registo: string
  hora_registo: string
  lote: string | null
  temperatura_chegada: number
  nome_staff: string
  observacoes: string | null
  user_id: string | null
  criado_em: string
}

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
  const [formInstTemFabrico, setFormInstTemFabrico] = useState(false)
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

  // --- LAVAGEM HORTOFRUTÍCOLAS ---
  const [registosLavagem, setRegistosLavagem] = useState<RegistoLavagem[]>([])
  const [aCarregarLavagem, setACarregarLavagem] = useState(false)
  const [filtroLavagemDataInicio, setFiltroLavagemDataInicio] = useState('')
  const [filtroLavagemDataFim, setFiltroLavagemDataFim] = useState('')

  // --- CONFEÇÃO E ARREFECIMENTO ---
  const [registosConfeccao, setRegistosConfeccao] = useState<RegistoConfeccao[]>([])
  const [aCarregarConfeccao, setACarregarConfeccao] = useState(false)
  const [filtroConfeccaoDataInicio, setFiltroConfeccaoDataInicio] = useState('')
  const [filtroConfeccaoDataFim, setFiltroConfeccaoDataFim] = useState('')

  // --- RECEÇÃO DE MERCADORIAS ---
  const [registosRececao, setRegistosRececao] = useState<RegistoRececao[]>([])
  const [aCarregarRececao, setACarregarRececao] = useState(false)
  const [filtroRececaoDataInicio, setFiltroRececaoDataInicio] = useState('')
  const [filtroRececaoDataFim, setFiltroRececaoDataFim] = useState('')
  const [filtroRececaoFornecedor, setFiltroRececaoFornecedor] = useState('')

  const [modalRececaoAberto, setModalRececaoAberto] = useState(false)
  const [registoRececaoEmEdicao, setRegistoRececaoEmEdicao] = useState<RegistoRececao | null>(null)
  const [pesquisaIngrediente, setPesquisaIngrediente] = useState('')
  const [sugestoesIngredientes, setSugestoesIngredientes] = useState<IngredienteSugestao[]>([])
  const [aCarregarSugestoes, setACarregarSugestoes] = useState(false)
  const [ingredienteSelecionado, setIngredienteSelecionado] = useState<IngredienteSugestao | null>(null)
  const [formRececaoLote, setFormRececaoLote] = useState('')
  const [formRececaoTemp, setFormRececaoTemp] = useState(4)
  const [formRececaoStaff, setFormRececaoStaff] = useState('')
  const [formRececaoObs, setFormRececaoObs] = useState('')
  const [aGuardarRececao, setAGuardarRececao] = useState(false)

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
      setRegistosLavagem([]); setRegistosConfeccao([])
      setRegistosRececao([])
    }
  }, [instalacaoSel])

  useEffect(() => {
    if (!instalacaoSel || !instalacaoSel.tem_fabrico) return
    if (abaAtiva === 'lavagem_horto' && registosLavagem.length === 0 && !aCarregarLavagem) {
      const hoje = obterDataHoje()
      const ha7 = new Date(); ha7.setDate(ha7.getDate() - 7)
      const data7 = `${ha7.getFullYear()}-${String(ha7.getMonth() + 1).padStart(2, '0')}-${String(ha7.getDate()).padStart(2, '0')}`
      setFiltroLavagemDataInicio(data7); setFiltroLavagemDataFim(hoje)
      carregarRegistosLavagem(data7, hoje)
    }
    if (abaAtiva === 'confeccao_arref' && registosConfeccao.length === 0 && !aCarregarConfeccao) {
      const hoje = obterDataHoje()
      const ha7 = new Date(); ha7.setDate(ha7.getDate() - 7)
      const data7 = `${ha7.getFullYear()}-${String(ha7.getMonth() + 1).padStart(2, '0')}-${String(ha7.getDate()).padStart(2, '0')}`
      setFiltroConfeccaoDataInicio(data7); setFiltroConfeccaoDataFim(hoje)
      carregarRegistosConfeccao(data7, hoje)
    }
    if (abaAtiva === 'rececao' && registosRececao.length === 0 && !aCarregarRececao) {
      const hoje = obterDataHoje()
      const ha7 = new Date(); ha7.setDate(ha7.getDate() - 7)
      const data7 = `${ha7.getFullYear()}-${String(ha7.getMonth() + 1).padStart(2, '0')}-${String(ha7.getDate()).padStart(2, '0')}`
      setFiltroRececaoDataInicio(data7); setFiltroRececaoDataFim(hoje)
      carregarRegistosRececao(data7, hoje)
    }
  }, [abaAtiva, instalacaoSel])

  useEffect(() => {
    const bloquear = modalRegistoAberto || modalHistoricoAberto || gestaoInstalacoesAberta || modalLimpezaAberto || modalHistoricoLimpezaAberto || modalRececaoAberto
    document.body.style.overflow = bloquear ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalRegistoAberto, modalHistoricoAberto, gestaoInstalacoesAberta, modalLimpezaAberto, modalHistoricoLimpezaAberto, modalRececaoAberto])

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
    setInstalacaoEmEdicao(null); setFormInstNome(''); setFormInstMorada(''); setFormInstTemFabrico(false); setFormInstalacaoAberto(true)
  }

  function abrirFormEditarInstalacao(inst: Instalacao) {
    if (!ehGestor) return
    setInstalacaoEmEdicao(inst); setFormInstNome(inst.nome); setFormInstMorada(inst.morada || ''); setFormInstTemFabrico(!!inst.tem_fabrico); setFormInstalacaoAberto(true)
  }

  function fecharFormInstalacao() { setFormInstalacaoAberto(false); setInstalacaoEmEdicao(null) }

  async function guardarInstalacao() {
    if (!ehGestor) return
    const nome = formInstNome.trim()
    if (!nome) { alert('Introduz o nome da loja.'); return }
    setAGuardarInst(true)
    const payload = { nome, morada: formInstMorada.trim() || null, tem_fabrico: formInstTemFabrico }
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

  // ===== LAVAGEM HORTOFRUTÍCOLAS =====
  async function carregarRegistosLavagem(dataInicio: string, dataFim: string) {
    if (!instalacaoSel) return
    setACarregarLavagem(true)

    // 1. Buscar produções da loja
    const { data: producoes } = await supabase
      .from('producoes_semanais')
      .select('id')
      .eq('instalacao_id', instalacaoSel.id)
    const producaoIds = ((producoes as any[]) || []).map((p) => p.id)
    if (producaoIds.length === 0) { setRegistosLavagem([]); setACarregarLavagem(false); return }

    // 2. Buscar registos de desinfeção concluídos no intervalo
    const dataInicioISO = `${dataInicio}T00:00:00`
    const dataFimISO = `${dataFim}T23:59:59`
    const { data: regDes } = await supabase
      .from('registos_desinfeccao')
      .select('id, atualizado_em, tarefa_preparacao_id, quantidade_desinfectante_ml, litros_agua, tempo_minutos, nome_staff, concluido')
      .in('producao_semanal_id', producaoIds)
      .eq('concluido', true)
      .gte('atualizado_em', dataInicioISO)
      .lte('atualizado_em', dataFimISO)
      .order('atualizado_em', { ascending: false })
    const desinfeccoes = (regDes as any[]) || []
    if (desinfeccoes.length === 0) { setRegistosLavagem([]); setACarregarLavagem(false); return }

    // 3. Buscar as tarefas de preparação para descobrir o componente_ingrediente
    const tarefaIds = desinfeccoes.map((d) => d.tarefa_preparacao_id)
    const { data: tarefas } = await supabase
      .from('tarefas_preparacao_novo')
      .select('id, componente_ingrediente_id')
      .in('id', tarefaIds)
    const tarefasMap = new Map<number, number>()
    ;((tarefas as any[]) || []).forEach((t) => tarefasMap.set(t.id, t.componente_ingrediente_id))

    // 4. Buscar componente_ingredientes para descobrir ingrediente e componente
    const ciIds = Array.from(new Set(Array.from(tarefasMap.values())))
    const { data: cis } = await supabase
      .from('componente_ingredientes')
      .select('id, componente_id, ingredientes (nome), componentes (nome)')
      .in('id', ciIds)
    const ciMap = new Map<number, { ingredienteNome: string; componenteNome: string; componenteId: number }>()
    ;((cis as any[]) || []).forEach((ci) => {
      ciMap.set(ci.id, {
        ingredienteNome: ci.ingredientes?.nome || '—',
        componenteNome: ci.componentes?.nome || '—',
        componenteId: ci.componente_id,
      })
    })

    // 5. Buscar pratos que usam esses componentes
    const componenteIds = Array.from(new Set(Array.from(ciMap.values()).map((v) => v.componenteId)))
    const { data: pcs } = await supabase
      .from('pratos_componentes')
      .select('componente_id, pratos (nome)')
      .in('componente_id', componenteIds)
    const pratosPorComponente = new Map<number, string[]>()
    ;((pcs as any[]) || []).forEach((pc) => {
      const arr = pratosPorComponente.get(pc.componente_id) || []
      const nome = pc.pratos?.nome
      if (nome && !arr.includes(nome)) arr.push(nome)
      pratosPorComponente.set(pc.componente_id, arr)
    })

    // 6. Montar resultado
    const resultado: RegistoLavagem[] = desinfeccoes.map((d) => {
      const ciId = tarefasMap.get(d.tarefa_preparacao_id)
      const ciInfo = ciId ? ciMap.get(ciId) : null
      const pratosArr = ciInfo ? (pratosPorComponente.get(ciInfo.componenteId) || []) : []
      return {
        id: d.id,
        atualizado_em: d.atualizado_em,
        ingrediente_nome: ciInfo?.ingredienteNome || '—',
        componente_nome: ciInfo?.componenteNome || '—',
        prato_nome: pratosArr.join(', ') || '—',
        quantidade_desinfectante_ml: Number(d.quantidade_desinfectante_ml),
        litros_agua: Number(d.litros_agua),
        tempo_minutos: Number(d.tempo_minutos),
        nome_staff: d.nome_staff || null,
      }
    })
    setRegistosLavagem(resultado)
    setACarregarLavagem(false)
  }

  // ===== CONFEÇÃO E ARREFECIMENTO =====
  async function carregarRegistosConfeccao(dataInicio: string, dataFim: string) {
    if (!instalacaoSel) return
    setACarregarConfeccao(true)

    // 1. Buscar produções da loja
    const { data: producoes } = await supabase
      .from('producoes_semanais')
      .select('id')
      .eq('instalacao_id', instalacaoSel.id)
    const producaoIds = ((producoes as any[]) || []).map((p) => p.id)
    if (producaoIds.length === 0) { setRegistosConfeccao([]); setACarregarConfeccao(false); return }

    // 2. Buscar registos de confeção (setor='confeccao') no intervalo
    const dataInicioISO = `${dataInicio}T00:00:00`
    const dataFimISO = `${dataFim}T23:59:59`
    const { data: regs } = await supabase
      .from('registos_producao')
      .select('id, atualizado_em, referencia_id, quantidade_final, temperatura_confeccao, temperatura_abatimento, tempo_arrefecimento, nome_staff, impressao_etiqueta')
      .in('producao_semanal_id', producaoIds)
      .eq('setor', 'confeccao')
      .gte('atualizado_em', dataInicioISO)
      .lte('atualizado_em', dataFimISO)
      .order('atualizado_em', { ascending: false })
    const confs = (regs as any[]) || []
    if (confs.length === 0) { setRegistosConfeccao([]); setACarregarConfeccao(false); return }

    // 3. Buscar componentes (referencia_id é o componente_id na confeção)
    const componenteIds = Array.from(new Set(confs.map((c) => c.referencia_id)))
    const { data: comps } = await supabase
      .from('componentes')
      .select('id, nome, unidade_rendimento')
      .in('id', componenteIds)
    const compMap = new Map<number, { nome: string; unidade_rendimento: string | null }>()
    ;((comps as any[]) || []).forEach((c) => compMap.set(c.id, { nome: c.nome, unidade_rendimento: c.unidade_rendimento }))

    // 4. Buscar pratos destino de cada componente
    const { data: pcs } = await supabase
      .from('pratos_componentes')
      .select('componente_id, pratos (nome)')
      .in('componente_id', componenteIds)
    const pratosPorComponente = new Map<number, string[]>()
    ;((pcs as any[]) || []).forEach((pc) => {
      const arr = pratosPorComponente.get(pc.componente_id) || []
      const nome = pc.pratos?.nome
      if (nome && !arr.includes(nome)) arr.push(nome)
      pratosPorComponente.set(pc.componente_id, arr)
    })

    // 5. Montar resultado
    const resultado: RegistoConfeccao[] = confs.map((c) => {
      const compInfo = compMap.get(c.referencia_id)
      const pratosArr = pratosPorComponente.get(c.referencia_id) || []
      return {
        id: c.id,
        atualizado_em: c.atualizado_em,
        componente_nome: compInfo?.nome || '—',
        pratos_destino: pratosArr.join(', ') || '—',
        quantidade_final: c.quantidade_final !== null ? Number(c.quantidade_final) : null,
        unidade_rendimento: compInfo?.unidade_rendimento || null,
        temperatura_confeccao: c.temperatura_confeccao !== null ? Number(c.temperatura_confeccao) : null,
        temperatura_abatimento: c.temperatura_abatimento !== null ? Number(c.temperatura_abatimento) : null,
        tempo_arrefecimento: c.tempo_arrefecimento !== null ? Number(c.tempo_arrefecimento) : null,
        nome_staff: c.nome_staff || null,
      }
    })
    setRegistosConfeccao(resultado)
    setACarregarConfeccao(false)
  }

  // ===== RECEÇÃO DE MERCADORIAS =====
  async function carregarRegistosRececao(dataInicio: string, dataFim: string) {
    if (!instalacaoSel) return
    setACarregarRececao(true)
    const { data, error } = await supabase
      .from('haccp_rececoes_mercadoria')
      .select('*')
      .eq('instalacao_id', instalacaoSel.id)
      .gte('data_registo', dataInicio)
      .lte('data_registo', dataFim)
      .order('data_registo', { ascending: false })
      .order('hora_registo', { ascending: false })
    if (!error) setRegistosRececao((data as RegistoRececao[]) || [])
    setACarregarRececao(false)
  }

  async function pesquisarIngredientes(texto: string) {
    if (texto.trim().length < 2) {
      setSugestoesIngredientes([])
      return
    }
    setACarregarSugestoes(true)
    const { data, error } = await supabase
      .from('ingredientes')
      .select('id, nome, categoria, nome_fornecedor')
      .ilike('nome', `%${texto.trim()}%`)
      .order('nome', { ascending: true })
      .limit(10)
    if (!error) setSugestoesIngredientes((data as IngredienteSugestao[]) || [])
    setACarregarSugestoes(false)
  }

  function abrirModalNovaRececao() {
    setRegistoRececaoEmEdicao(null)
    setIngredienteSelecionado(null)
    setPesquisaIngrediente('')
    setSugestoesIngredientes([])
    setFormRececaoLote('')
    setFormRececaoTemp(4)
    setFormRececaoStaff('')
    setFormRececaoObs('')
    setModalRececaoAberto(true)
  }

  function abrirModalEditarRececao(reg: RegistoRececao) {
    setRegistoRececaoEmEdicao(reg)
    setIngredienteSelecionado({
      id: reg.ingrediente_id,
      nome: reg.produto_nome,
      categoria: reg.categoria,
      nome_fornecedor: reg.fornecedor_nome,
    })
    setPesquisaIngrediente('')
    setSugestoesIngredientes([])
    setFormRececaoLote(reg.lote || '')
    setFormRececaoTemp(Number(reg.temperatura_chegada))
    setFormRececaoStaff(reg.nome_staff)
    setFormRececaoObs(reg.observacoes || '')
    setModalRececaoAberto(true)
  }

  function fecharModalRececao() {
    setModalRececaoAberto(false)
    setRegistoRececaoEmEdicao(null)
    setIngredienteSelecionado(null)
  }

  function selecionarIngrediente(ing: IngredienteSugestao) {
    setIngredienteSelecionado(ing)
    setPesquisaIngrediente('')
    setSugestoesIngredientes([])
  }

  async function guardarRegistoRececao() {
    if (!instalacaoSel) return
    if (!ingredienteSelecionado) { alert('Seleciona um produto.'); return }
    if (!ingredienteSelecionado.nome_fornecedor) {
      alert('Este produto não tem fornecedor cadastrado. Atualiza o ingrediente antes de registar a receção.')
      return
    }
    const staffNome = formRececaoStaff.trim()
    if (!staffNome) { alert('Seleciona o funcionário.'); return }

    setAGuardarRececao(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (registoRececaoEmEdicao) {
      const podeEditar = ehGestor || registoRececaoEmEdicao.user_id === user?.id
      if (!podeEditar) {
        alert('Não tens permissão para editar este registo.')
        setAGuardarRececao(false); return
      }
      const { error } = await supabase
        .from('haccp_rececoes_mercadoria')
        .update({
          ingrediente_id: ingredienteSelecionado.id,
          produto_nome: ingredienteSelecionado.nome,
          categoria: ingredienteSelecionado.categoria,
          fornecedor_nome: ingredienteSelecionado.nome_fornecedor,
          lote: formRececaoLote.trim() || null,
          temperatura_chegada: formRececaoTemp,
          nome_staff: staffNome,
          observacoes: formRececaoObs.trim() || null,
        })
        .eq('id', registoRececaoEmEdicao.id)
      if (error) { alert('Erro ao atualizar o registo.'); setAGuardarRececao(false); return }
    } else {
      const { error } = await supabase.from('haccp_rececoes_mercadoria').insert([{
        instalacao_id: instalacaoSel.id,
        ingrediente_id: ingredienteSelecionado.id,
        produto_nome: ingredienteSelecionado.nome,
        categoria: ingredienteSelecionado.categoria,
        fornecedor_nome: ingredienteSelecionado.nome_fornecedor,
        data_registo: obterDataHoje(),
        hora_registo: obterHoraAgora(),
        lote: formRececaoLote.trim() || null,
        temperatura_chegada: formRececaoTemp,
        nome_staff: staffNome,
        observacoes: formRececaoObs.trim() || null,
        user_id: user?.id || null,
      }])
      if (error) { alert('Erro ao guardar o registo.'); setAGuardarRececao(false); return }
    }
    await carregarRegistosRececao(filtroRececaoDataInicio, filtroRececaoDataFim)
    fecharModalRececao()
    setAGuardarRececao(false)
  }

  async function apagarRegistoRececao(reg: RegistoRececao) {
    if (!ehGestor) return
    if (!window.confirm(`Apagar o registo de receção de "${reg.produto_nome}" (${reg.data_registo})?`)) return
    const { error } = await supabase.from('haccp_rececoes_mercadoria').delete().eq('id', reg.id)
    if (error) { alert('Erro ao apagar o registo.'); return }
    await carregarRegistosRececao(filtroRececaoDataInicio, filtroRececaoDataFim)
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
            { id: 'temperaturas', label: '🌡️ Temperaturas de frigoríficos', soFabrico: false },
            { id: 'limpeza', label: '🧽 Registos de limpeza', soFabrico: false },
            { id: 'rececao', label: '📦 Receção de mercadorias', soFabrico: false },
            { id: 'lavagem_horto', label: '🥬 Lavagem de hortofrutícolas', soFabrico: true },
            { id: 'confeccao_arref', label: '🔥 Confeção e arrefecimento', soFabrico: true },
          ] as { id: AbaHaccp; label: string; soFabrico: boolean }[])
            .filter((aba) => !aba.soFabrico || (instalacaoSel?.tem_fabrico && ehGestor))
            .map((aba) => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                style={{ backgroundColor: abaAtiva === aba.id ? '#80c944' : '#e5e7eb', color: abaAtiva === aba.id ? '#fff' : '#111', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                {aba.label}
              </button>
            ))}
        </div>

        {abaAtiva === 'temperaturas' && renderAbaTemperaturas()}
        {abaAtiva === 'limpeza' && renderAbaLimpeza()}
        {abaAtiva === 'rececao' && renderAbaRececao()}
        {abaAtiva === 'lavagem_horto' && renderAbaLavagemHorto()}
        {abaAtiva === 'confeccao_arref' && renderAbaConfeccaoArref()}

        {ehGestor && renderSecaoStaff()}
      </div>

      {renderModalRegistoTemperatura()}
      {renderModalHistoricoTemperatura()}
      {ehGestor && renderModalGestaoInstalacoes()}
      {renderModalLimpeza()}
      {renderModalHistoricoLimpeza()}
      {renderModalRececao()}
    </div>
  )

  function renderAbaRececao() {
    const fornecedoresUnicos = Array.from(new Set(registosRececao.map((r) => r.fornecedor_nome))).sort()
    const registosFiltrados = filtroRececaoFornecedor
      ? registosRececao.filter((r) => r.fornecedor_nome === filtroRececaoFornecedor)
      : registosRececao

    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>📦 Receção de mercadorias</p>
          <button onClick={abrirModalNovaRececao}
            style={{ background: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
            + Nova receção
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>De</label>
            <input type="date" value={filtroRececaoDataInicio} onChange={(e) => setFiltroRececaoDataInicio(e.target.value)}
              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Até</label>
            <input type="date" value={filtroRececaoDataFim} onChange={(e) => setFiltroRececaoDataFim(e.target.value)}
              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Fornecedor</label>
            <select value={filtroRececaoFornecedor} onChange={(e) => setFiltroRececaoFornecedor(e.target.value)}
              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff', minWidth: '180px' }}>
              <option value="">— Todos —</option>
              {fornecedoresUnicos.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <button onClick={() => carregarRegistosRececao(filtroRececaoDataInicio, filtroRececaoDataFim)}
            style={{ background: '#374151', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Aplicar</button>
        </div>

        {aCarregarRececao ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
        ) : registosFiltrados.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Sem registos de receção no período selecionado.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Data/Hora</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Produto</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Categoria</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Fornecedor</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Lote</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Temp.</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Receptor</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Obs.</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {registosFiltrados.map((r) => {
                  const dataHora = `${r.data_registo} ${formatarHora(r.hora_registo)}`
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{dataHora}</td>
                      <td style={{ padding: '8px 10px', color: '#111', fontWeight: '500' }}>{r.produto_nome}</td>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{r.categoria || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{r.fornecedor_nome}</td>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{r.lote || '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: '#111' }}>{Number(r.temperatura_chegada).toFixed(1)}°C</td>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{r.nome_staff}</td>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{r.observacoes || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => abrirModalEditarRececao(r)}
                            style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar</button>
                          {ehGestor && (
                            <button onClick={() => apagarRegistoRececao(r)}
                              style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Apagar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function renderModalRececao() {
    if (!modalRececaoAberto) return null
    const semFornecedor = !!ingredienteSelecionado && !ingredienteSelecionado.nome_fornecedor
    return (
      <div onClick={(e) => { if (e.target === e.currentTarget) fecharModalRececao() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 8px 48px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: '0 0 2px' }}>
                {registoRececaoEmEdicao ? 'Editar receção' : 'Nova receção de mercadoria'}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{instalacaoSel?.nome} · {obterDataHoje()}</p>
            </div>
            <button onClick={fecharModalRececao} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Pesquisa de produto */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Produto *</label>
            {ingredienteSelecionado ? (
              <div style={{ border: semFornecedor ? '1px solid #fcd34d' : '1px solid #80c944', borderRadius: '8px', padding: '12px', background: semFornecedor ? '#fffbeb' : '#f0fdf4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: '0 0 4px' }}>{ingredienteSelecionado.nome}</p>
                    <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
                      Categoria: <strong>{ingredienteSelecionado.categoria || '—'}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: semFornecedor ? '#92400e' : '#374151', margin: '2px 0 0' }}>
                      Fornecedor: <strong>{ingredienteSelecionado.nome_fornecedor || 'Sem fornecedor cadastrado'}</strong>
                    </p>
                  </div>
                  <button onClick={() => { setIngredienteSelecionado(null); setPesquisaIngrediente(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>Trocar</button>
                </div>
                {semFornecedor && (
                  <p style={{ fontSize: '11px', color: '#92400e', margin: '8px 0 0', fontWeight: '500' }}>
                    ⚠ Este produto não tem fornecedor cadastrado. Atualiza o ingrediente antes de registar a receção.
                  </p>
                )}
              </div>
            ) : (
              <>
                <input type="text" value={pesquisaIngrediente}
                  onChange={(e) => { setPesquisaIngrediente(e.target.value); pesquisarIngredientes(e.target.value) }}
                  placeholder="Pesquisa por nome (mín. 2 caracteres)..."
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
                {aCarregarSugestoes && <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>A pesquisar...</p>}
                {sugestoesIngredientes.length > 0 && (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', marginTop: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                    {sugestoesIngredientes.map((ing) => (
                      <button key={ing.id} onClick={() => selecionarIngrediente(ing)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: 'none', borderBottom: '1px solid #f3f4f6', padding: '8px 12px', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: '#111', margin: 0 }}>{ing.nome}</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>
                          {ing.categoria || 'sem categoria'} · {ing.nome_fornecedor || 'sem fornecedor'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {pesquisaIngrediente.trim().length >= 2 && !aCarregarSugestoes && sugestoesIngredientes.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: '6px 0 0' }}>Nenhum produto encontrado.</p>
                )}
              </>
            )}
          </div>

          {/* Lote */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Lote (opcional)</label>
            <input type="text" value={formRececaoLote} onChange={(e) => setFormRececaoLote(e.target.value)}
              placeholder="ex: L20260505-A"
              style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
          </div>

          {/* Temperatura */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>Temperatura de chegada</label>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '36px', fontWeight: '700', color: '#111' }}>{formRececaoTemp}°C</span>
            </div>
            <input type="range" min={-25} max={25} step={0.5} value={formRececaoTemp}
              onChange={(e) => setFormRececaoTemp(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#80c944' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              <span>-25°C</span><span>0°C</span><span>+25°C</span>
            </div>
          </div>

          {/* Funcionário */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Receptor *</label>
            {staff.length === 0 ? (
              <div style={{ border: '1px solid #fcd34d', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                Ainda não há funcionários nesta loja. {ehGestor ? 'Adiciona-os na secção "Funcionários" abaixo.' : 'Pede a um gestor para os adicionar.'}
              </div>
            ) : (
              <select value={formRececaoStaff} onChange={(e) => setFormRececaoStaff(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }}>
                <option value="">— Seleciona quem recebeu —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.nome}>{s.nome}</option>
                ))}
              </select>
            )}
          </div>

          {/* Observações */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
            <textarea value={formRececaoObs} onChange={(e) => setFormRececaoObs(e.target.value)} rows={2}
              style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={guardarRegistoRececao}
              disabled={aGuardarRececao || !ingredienteSelecionado || semFornecedor || staff.length === 0}
              style={{
                background: (!ingredienteSelecionado || semFornecedor || staff.length === 0) ? '#d1d5db' : '#80c944',
                color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
                cursor: (!ingredienteSelecionado || semFornecedor || staff.length === 0) ? 'not-allowed' : 'pointer'
              }}>
              {aGuardarRececao ? 'A guardar...' : (registoRececaoEmEdicao ? 'Atualizar' : 'Guardar registo')}
            </button>
            <button onClick={fecharModalRececao} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

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

  function formatarDataHora(iso: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return `${data} ${hora}`
  }

  function formatarQtdConfeccao(valor: number | null, unidade: string | null) {
    if (valor === null || valor === undefined) return '—'
    const u = (unidade || 'kg').toLowerCase()
    if (u === 'g') return `${Math.round(valor)} g`
    if (u === 'ml') return `${Math.round(valor)} ml`
    if (u === 'l') return `${valor.toFixed(1)} l`
    if (u === 'un') return `${Math.round(valor)} un`
    return `${valor.toFixed(1)} kg`
  }

  function renderAbaLavagemHorto() {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>🥬 Lavagem de hortofrutícolas</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>De</label>
            <input type="date" value={filtroLavagemDataInicio} onChange={(e) => setFiltroLavagemDataInicio(e.target.value)}
              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Até</label>
            <input type="date" value={filtroLavagemDataFim} onChange={(e) => setFiltroLavagemDataFim(e.target.value)}
              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
          </div>
          <button onClick={() => carregarRegistosLavagem(filtroLavagemDataInicio, filtroLavagemDataFim)}
            style={{ background: '#374151', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Aplicar</button>
        </div>

        {aCarregarLavagem ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
        ) : registosLavagem.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Sem registos de lavagem no período selecionado.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Data/Hora</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Ingrediente</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Componente</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Prato destino</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Desinfectante</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Água</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Tempo</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Funcionário</th>
                </tr>
              </thead>
              <tbody>
                {registosLavagem.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px', color: '#111' }}>{formatarDataHora(r.atualizado_em)}</td>
                    <td style={{ padding: '8px 10px', color: '#111', fontWeight: '500' }}>{r.ingrediente_nome}</td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>{r.componente_nome}</td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>{r.prato_nome}</td>
                    <td style={{ padding: '8px 10px', color: '#111' }}>{r.quantidade_desinfectante_ml} ml</td>
                    <td style={{ padding: '8px 10px', color: '#111' }}>{r.litros_agua} l</td>
                    <td style={{ padding: '8px 10px', color: '#111' }}>{r.tempo_minutos} min</td>
                    <td style={{ padding: '8px 10px', color: '#111' }}>{r.nome_staff || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  function renderAbaConfeccaoArref() {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>🔥 Confeção e arrefecimento</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>De</label>
            <input type="date" value={filtroConfeccaoDataInicio} onChange={(e) => setFiltroConfeccaoDataInicio(e.target.value)}
              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Até</label>
            <input type="date" value={filtroConfeccaoDataFim} onChange={(e) => setFiltroConfeccaoDataFim(e.target.value)}
              style={{ border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#111', background: '#fff' }} />
          </div>
          <button onClick={() => carregarRegistosConfeccao(filtroConfeccaoDataInicio, filtroConfeccaoDataFim)}
            style={{ background: '#374151', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Aplicar</button>
        </div>

        {aCarregarConfeccao ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
        ) : registosConfeccao.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Sem registos de confeção no período selecionado.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Data/Hora</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Componente</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Prato destino</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Qtd. final</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Confeção</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Abatimento</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Arrefecimento</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Funcionário</th>
                </tr>
              </thead>
              <tbody>
                {registosConfeccao.map((r) => {
                  const confOk = r.temperatura_confeccao !== null && r.temperatura_confeccao >= 75
                  const abatOk = r.temperatura_abatimento !== null && r.temperatura_abatimento >= 2 && r.temperatura_abatimento <= 6
                  const arrefOk = r.tempo_arrefecimento !== null && r.tempo_arrefecimento >= 20 && r.tempo_arrefecimento <= 120
                  const todosPreenchidos = r.temperatura_confeccao !== null && r.temperatura_abatimento !== null && r.tempo_arrefecimento !== null
                  const conforme = todosPreenchidos && confOk && abatOk && arrefOk
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{formatarDataHora(r.atualizado_em)}</td>
                      <td style={{ padding: '8px 10px', color: '#111', fontWeight: '500' }}>{r.componente_nome}</td>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{r.pratos_destino}</td>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{formatarQtdConfeccao(r.quantidade_final, r.unidade_rendimento)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: r.temperatura_confeccao === null ? '#9ca3af' : confOk ? '#16a34a' : '#dc2626' }}>
                        {r.temperatura_confeccao !== null ? `${r.temperatura_confeccao.toFixed(1)}°C ${confOk ? '✓' : '⚠'}` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: r.temperatura_abatimento === null ? '#9ca3af' : abatOk ? '#16a34a' : '#dc2626' }}>
                        {r.temperatura_abatimento !== null ? `${r.temperatura_abatimento.toFixed(1)}°C ${abatOk ? '✓' : '⚠'}` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '600', color: r.tempo_arrefecimento === null ? '#9ca3af' : arrefOk ? '#16a34a' : '#dc2626' }}>
                        {r.tempo_arrefecimento !== null ? `${r.tempo_arrefecimento} min ${arrefOk ? '✓' : '⚠'}` : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {todosPreenchidos ? (
                          <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '99px', background: conforme ? '#dcfce7' : '#fee2e2', color: conforme ? '#166534' : '#991b1b' }}>
                            {conforme ? '✓ Conforme' : '⚠ Não conforme'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Incompleto</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#111' }}>{r.nome_staff || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Data</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Período</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Equipamento</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Temp.</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Staff</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: '#111' }}>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoRegistos.map((r) => {
                    const equip = equipamentos.find((e) => e.id === r.equipamento_id)
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px', color: '#111' }}>{r.data_registo}</td>
                        <td style={{ padding: '8px 10px', color: '#111' }}>{r.periodo === 'manha' ? 'Manhã' : 'Tarde'}</td>
                        <td style={{ padding: '8px 10px', color: '#111' }}>{equip?.nome || '—'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '600', color: r.conforme ? '#16a34a' : '#dc2626' }}>
                          {r.temperatura}°C {r.conforme ? '✓' : '⚠'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#111' }}>{r.nome_staff}</td>
                        <td style={{ padding: '8px 10px', color: '#374151' }}>{r.observacoes || '—'}</td>
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
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#111' }}>
                    <input type="checkbox" checked={formInstTemFabrico} onChange={(e) => setFormInstTemFabrico(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#80c944', cursor: 'pointer' }} />
                    Tem fabrico de produtos
                  </label>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0 24px' }}>
                    Lojas com fabrico mostram registos de Lavagem de hortofrutícolas e Confeção/Arrefecimento.
                  </p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111', margin: 0 }}>{inst.nome}</p>
                      {inst.tem_fabrico && (
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px' }}>🏭 Fabrico</span>
                      )}
                    </div>
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
