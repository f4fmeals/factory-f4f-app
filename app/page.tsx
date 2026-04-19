// @ts-nocheck
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type AbaAtiva = 'producao' | 'compras' | 'preparacao' | 'confeccao' | 'finalizacao' | 'embalamento'
type SecaoExportacao = 'compras' | 'preparacao' | 'confeccao' | 'finalizacao' | 'embalamento'

type Prato = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number | null
  categoria_prato: string | null
}

type ItemPlano = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number | null
  quantidade: number
  categoria_prato: string | null
}

type ProducaoSemanal = {
  id: number
  nome_semana: string
  data_inicio: string
}

type DetalheProducao = {
  id: number
  quantidade: number
  pratos: {
    id: number | string
    nome: string
    sku: string
    tamanho: string
    peso_final?: number | string
    prioridade_embalamento?: number | null
    categoria_prato?: string | null
  } | null
}

type IngredienteInfo = {
  id: number
  nome: string
  unidade_base: string | null
  taxa_perda_padrao: number | string | null
  preco: number | string | null
  unidade_preco: string | null
  categoria: string | null
}

type PratoComponente = {
  id: number
  prato_id: number
  componente_id: number
  quantidade_final: number | string
  unidade: string | null
  posicao_embalagem: string | null
  ordem: number | string
  componentes: {
    id: number
    nome: string
    categoria: string | null
    rendimento_final: number | string | null
    unidade_rendimento: string | null
  } | null
}

type ComponenteIngrediente = {
  id: number
  componente_id: number
  ingrediente_id: number
  quantidade: number | string
  unidade: string | null
  ingredientes: {
    id: number
    nome: string
  } | null
}

type TarefaPreparacaoNova = {
  id: number
  componente_ingrediente_id: number
  ordem: number | string
  tarefa: string
  observacoes: string | null
}

type TarefaConfeccaoNova = {
  id: number
  componente_id: number
  ordem: number | string
  tarefa: string
  observacoes: string | null
}

type TarefaFinalizacaoNova = {
  id: number
  componente_id: number
  ordem: number | string
  tarefa: string
  observacoes: string | null
}

type ItemPlanoEdicao = {
  prato_id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number | null
  quantidade: number
  categoria_prato: string | null
}

type CompraAgrupada = {
  ingrediente_id: number | null
  nome: string
  quantidade: number
  unidade: string | null
  preco: number | null
  unidade_preco: string | null
  custo_total: number
}

type ListaPreparacaoTarefa = {
  chave: string
  tarefa: string
  componente: string
  observacoes: string | null
  quantidadeTarefa: number
  unidade: string | null
  ordem: number
}

type ListaPreparacaoPrato = {
  chave: string
  pratoNome: string
  quantidadeTotalPrato: number
  unidade: string | null
  tarefas: ListaPreparacaoTarefa[]
}

type ListaPreparacaoIngrediente = {
  chave: string
  ingredienteNome: string
  quantidadeTotalIngrediente: number
  unidade: string | null
  pratos: ListaPreparacaoPrato[]
}

type ListaConfeccaoPrato = {
  chave: string
  pratoNome: string
  prioridadeEmbalamento: number | null
  quantidadeComponente: number
  unidade: string | null
}

type ListaConfeccaoTarefa = {
  chave: string
  id: number
  ordem: number
  tarefa: string
  observacoes: string | null
}

type ListaConfeccaoGrupo = {
  chave: string
  componenteId: number
  componenteNome: string
  quantidadeTotal: number
  unidade: string | null
  prioridadeMinima: number
  prioridades: number[]
  pratos: ListaConfeccaoPrato[]
  tarefas: ListaConfeccaoTarefa[]
}

type ListaFinalizacaoTarefa = {
  chave: string
  id: number
  ordem: number
  tarefa: string
  observacoes: string | null
  componenteNome: string
  quantidadeFinalComponente: number
  unidade: string | null
}

type ListaFinalizacaoBloco = {
  chave: string
  pratoNome: string
  quantidade: number
  tarefas: ListaFinalizacaoTarefa[]
}

type LinhaEmbalamentoTamanho = {
  chave: string
  tamanho: string
  sku: string
  quantidade: number
  componentes: {
    id: number
    nome: string
    peso: number
    unidade: string | null
    posicao: string
    ordem: number
  }[]
}

type GrupoEmbalamento = {
  chave: string
  prato: string
  prioridade: number | null
  tamanhos: LinhaEmbalamentoTamanho[]
}

const CORES_CATEGORIA: Record<string, { bg: string; textoPrincipal: string; textoSecundario: string }> = {
  'Pratos principais': { bg: '#bbf7d0', textoPrincipal: '#14532d', textoSecundario: '#166534' },
  'Pratos leves':      { bg: '#dcfce7', textoPrincipal: '#14532d', textoSecundario: '#166534' },
  'Pequenos almoços':  { bg: '#fef9c3', textoPrincipal: '#713f12', textoSecundario: '#854d0e' },
  'Doces':             { bg: '#ffedd5', textoPrincipal: '#7c2d12', textoSecundario: '#9a3412' },
  'Sumos':             { bg: '#dbeafe', textoPrincipal: '#1e3a8a', textoSecundario: '#1e40af' },
}

function obterCoresCategoria(categoria: string | null) {
  if (!categoria) return { bg: '#f3f4f6', textoPrincipal: '#111827', textoSecundario: '#6b7280' }
  return CORES_CATEGORIA[categoria] || { bg: '#f3f4f6', textoPrincipal: '#111827', textoSecundario: '#6b7280' }
}

export default function Home() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('producao')
  const [novaProducaoAberta, setNovaProducaoAberta] = useState(false)
  const [nomeNovaProducao, setNomeNovaProducao] = useState('')

  const [pratos, setPratos] = useState<Prato[]>([])
  const [producoes, setProducoes] = useState<ProducaoSemanal[]>([])
  const [pesquisa, setPesquisa] = useState('')
  const [loading, setLoading] = useState(false)
  const [plano, setPlano] = useState<ItemPlano[]>([])
  const [quantidades, setQuantidades] = useState<Record<number, string>>({})
  const [aGuardar, setAGuardar] = useState(false)

  const [producaoSelecionada, setProducaoSelecionada] = useState<ProducaoSemanal | null>(null)
  const [detalhesProducao, setDetalhesProducao] = useState<DetalheProducao[]>([])
  const [ingredientesInfo, setIngredientesInfo] = useState<IngredienteInfo[]>([])
  const [pratosComponentes, setPratosComponentes] = useState<PratoComponente[]>([])
  const [componentesIngredientes, setComponentesIngredientes] = useState<ComponenteIngrediente[]>([])
  const [tarefasPreparacaoNovo, setTarefasPreparacaoNovo] = useState<TarefaPreparacaoNova[]>([])
  const [tarefasConfeccaoNovo, setTarefasConfeccaoNovo] = useState<TarefaConfeccaoNova[]>([])
  const [tarefasFinalizacaoNovo, setTarefasFinalizacaoNovo] = useState<TarefaFinalizacaoNova[]>([])
  const [aCarregarDetalhes, setACarregarDetalhes] = useState(false)

  const [producaoEmEdicaoId, setProducaoEmEdicaoId] = useState<number | null>(null)
  const [nomeEdicao, setNomeEdicao] = useState('')
  const [aAtualizarProducao, setAAtualizarProducao] = useState(false)
  const [aApagarProducaoId, setAApagarProducaoId] = useState<number | null>(null)

  const [planoEditandoId, setPlanoEditandoId] = useState<number | null>(null)
  const [itensPlanoEdicao, setItensPlanoEdicao] = useState<ItemPlanoEdicao[]>([])
  const [aGuardarItensPlano, setAGuardarItensPlano] = useState(false)
  const [pesquisaEdicao, setPesquisaEdicao] = useState('')
  const [loadingPesquisaEdicao, setLoadingPesquisaEdicao] = useState(false)
  const [pratosPesquisaEdicao, setPratosPesquisaEdicao] = useState<Prato[]>([])
  const [quantidadesEdicaoAdicionar, setQuantidadesEdicaoAdicionar] = useState<Record<number, string>>({})

  const [secaoExportar, setSecaoExportar] = useState<SecaoExportacao | null>(null)
  const [nomeUtilizador, setNomeUtilizador] = useState('')

  useEffect(() => {
    async function carregarPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', user.id).single()
      if (perfil) setNomeUtilizador(perfil.nome)
    }
    carregarPerfil()
  }, [])

  useEffect(() => { fetchProducoes() }, [])

  useEffect(() => {
    const texto = pesquisa.trim()
    if (texto.length < 2) { setPratos([]); setLoading(false); return }
    const timer = setTimeout(() => pesquisarPratos(texto), 300)
    return () => clearTimeout(timer)
  }, [pesquisa])

  useEffect(() => {
    const texto = pesquisaEdicao.trim()
    if (texto.length < 2) { setPratosPesquisaEdicao([]); setLoadingPesquisaEdicao(false); return }
    const timer = setTimeout(() => pesquisarPratosEdicao(texto), 300)
    return () => clearTimeout(timer)
  }, [pesquisaEdicao])

  useEffect(() => {
    function limparDepoisImpressao() { setSecaoExportar(null) }
    window.addEventListener('afterprint', limparDepoisImpressao)
    return () => window.removeEventListener('afterprint', limparDepoisImpressao)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function obterDataHoje() {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  }

  async function pesquisarPratos(termo: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('pratos')
      .select('id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato')
      .or(`nome.ilike.%${termo}%,sku.ilike.%${termo}%`)
      .order('nome', { ascending: true })
      .limit(30)
    if (error) { setPratos([]) } else { setPratos((data as Prato[]) || []) }
    setLoading(false)
  }

  async function pesquisarPratosEdicao(termo: string) {
    setLoadingPesquisaEdicao(true)
    const { data, error } = await supabase
      .from('pratos')
      .select('id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato')
      .or(`nome.ilike.%${termo}%,sku.ilike.%${termo}%`)
      .order('nome', { ascending: true })
      .limit(30)
    if (error) { setPratosPesquisaEdicao([]) } else { setPratosPesquisaEdicao((data as Prato[]) || []) }
    setLoadingPesquisaEdicao(false)
  }

  async function fetchProducoes() {
    const { data, error } = await supabase.from('producoes_semanais').select('*').order('id', { ascending: false })
    if (!error) setProducoes((data as ProducaoSemanal[]) || [])
  }

  function iniciarEdicaoProducao(producao: ProducaoSemanal) {
    setProducaoEmEdicaoId(producao.id)
    setNomeEdicao(producao.nome_semana)
  }

  function cancelarEdicaoProducao() {
    setProducaoEmEdicaoId(null)
    setNomeEdicao('')
  }

  async function guardarNovoNomeProducao(id: number) {
    const nomeLimpo = nomeEdicao.trim()
    if (!nomeLimpo) { alert('Introduz um nome válido.'); return }
    setAAtualizarProducao(true)
    const { error } = await supabase.from('producoes_semanais').update({ nome_semana: nomeLimpo }).eq('id', id)
    if (error) { alert('Erro ao atualizar o nome do plano.'); setAAtualizarProducao(false); return }
    if (producaoSelecionada?.id === id) setProducaoSelecionada({ ...producaoSelecionada, nome_semana: nomeLimpo })
    setProducoes((prev) => prev.map((prod) => prod.id === id ? { ...prod, nome_semana: nomeLimpo } : prod))
    setProducaoEmEdicaoId(null)
    setNomeEdicao('')
    setAAtualizarProducao(false)
  }

  async function apagarProducao(producao: ProducaoSemanal) {
    if (!window.confirm(`Tens a certeza que queres apagar o plano "${producao.nome_semana}"?`)) return
    setAApagarProducaoId(producao.id)
    const { error: itensError } = await supabase.from('producoes_semanais_itens').delete().eq('producao_semanal_id', producao.id)
    if (itensError) { alert('Erro ao apagar os itens do plano.'); setAApagarProducaoId(null); return }
    const { error: producaoError } = await supabase.from('producoes_semanais').delete().eq('id', producao.id)
    if (producaoError) { alert('Erro ao apagar o plano.'); setAApagarProducaoId(null); return }
    if (producaoSelecionada?.id === producao.id) {
      setProducaoSelecionada(null)
      setDetalhesProducao([])
      setIngredientesInfo([])
      setPratosComponentes([])
      setComponentesIngredientes([])
      setTarefasPreparacaoNovo([])
      setTarefasConfeccaoNovo([])
      setTarefasFinalizacaoNovo([])
    }
    if (planoEditandoId === producao.id) cancelarEdicaoItensPlano()
    setProducoes((prev) => prev.filter((p) => p.id !== producao.id))
    setAApagarProducaoId(null)
  }

  async function verDetalhesProducao(producao: ProducaoSemanal) {
    setProducaoSelecionada(producao)
    setACarregarDetalhes(true)
    const { data: detalhesData, error: detalhesError } = await supabase
      .from('producoes_semanais_itens')
      .select(`id, quantidade, pratos (id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato)`)
      .eq('producao_semanal_id', producao.id)
    if (detalhesError) { setDetalhesProducao([]); setACarregarDetalhes(false); return }
    const detalhes = (detalhesData as DetalheProducao[]) || []
    setDetalhesProducao(detalhes)
    const pratoIds = detalhes.map((item) => Number(item.pratos?.id)).filter((id) => !isNaN(id))
    if (pratoIds.length === 0) {
      setIngredientesInfo([]); setPratosComponentes([]); setComponentesIngredientes([])
      setTarefasPreparacaoNovo([]); setTarefasConfeccaoNovo([]); setTarefasFinalizacaoNovo([])
      setACarregarDetalhes(false); return
    }
    const { data: pratosComponentesData, error: pratosComponentesError } = await supabase
      .from('pratos_componentes')
      .select(`id, prato_id, componente_id, quantidade_final, unidade, posicao_embalagem, ordem, componentes (id, nome, categoria, rendimento_final, unidade_rendimento)`)
      .in('prato_id', pratoIds)
      .order('ordem', { ascending: true })
    if (pratosComponentesError) {
      setPratosComponentes([]); setComponentesIngredientes([])
      setTarefasPreparacaoNovo([]); setTarefasConfeccaoNovo([]); setTarefasFinalizacaoNovo([])
      setIngredientesInfo([]); setACarregarDetalhes(false); return
    }
    const pratosComponentesLista = (pratosComponentesData as PratoComponente[]) || []
    setPratosComponentes(pratosComponentesLista)
    const componenteIds = Array.from(new Set(pratosComponentesLista.map((item) => Number(item.componente_id)).filter((id) => !isNaN(id))))
    const { data: componentesIngredientesData } = await supabase
      .from('componente_ingredientes')
      .select(`id, componente_id, ingrediente_id, quantidade, unidade, ingredientes (id, nome)`)
      .in('componente_id', componenteIds.length > 0 ? componenteIds : [-1])
    setComponentesIngredientes((componentesIngredientesData as ComponenteIngrediente[]) || [])
    const componenteIngredienteIds = Array.from(new Set(((componentesIngredientesData as ComponenteIngrediente[]) || []).map((item) => Number(item.id)).filter((id) => !isNaN(id))))
    const { data: tarefasPreparacaoData } = await supabase
      .from('tarefas_preparacao_novo')
      .select('id, componente_ingrediente_id, ordem, tarefa, observacoes')
      .in('componente_ingrediente_id', componenteIngredienteIds.length > 0 ? componenteIngredienteIds : [-1])
      .order('ordem', { ascending: true })
    setTarefasPreparacaoNovo((tarefasPreparacaoData as TarefaPreparacaoNova[]) || [])
    const { data: tarefasConfeccaoData } = await supabase
      .from('tarefas_confeccao_novo')
      .select('id, componente_id, ordem, tarefa, observacoes')
      .in('componente_id', componenteIds.length > 0 ? componenteIds : [-1])
      .order('ordem', { ascending: true })
    setTarefasConfeccaoNovo((tarefasConfeccaoData as TarefaConfeccaoNova[]) || [])
    const { data: tarefasFinalizacaoData } = await supabase
      .from('tarefas_finalizacao_novo')
      .select('id, componente_id, ordem, tarefa, observacoes')
      .in('componente_id', componenteIds.length > 0 ? componenteIds : [-1])
      .order('ordem', { ascending: true })
    setTarefasFinalizacaoNovo((tarefasFinalizacaoData as TarefaFinalizacaoNova[]) || [])
    const ingredienteIds = Array.from(new Set(((componentesIngredientesData as ComponenteIngrediente[]) || []).map((item) => Number(item.ingrediente_id)).filter((id) => !isNaN(id))))
    const { data: ingredientesInfoData } = await supabase.from('ingredientes').select('*').in('id', ingredienteIds.length > 0 ? ingredienteIds : [-1])
    setIngredientesInfo((ingredientesInfoData as IngredienteInfo[]) || [])
    setACarregarDetalhes(false)
  }

  async function iniciarEdicaoItensPlano(producao: ProducaoSemanal) {
    setPlanoEditandoId(producao.id)
    setItensPlanoEdicao([])
    setPesquisaEdicao('')
    setPratosPesquisaEdicao([])
    setQuantidadesEdicaoAdicionar({})
    const { data, error } = await supabase
      .from('producoes_semanais_itens')
      .select(`quantidade, pratos (id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato)`)
      .eq('producao_semanal_id', producao.id)
    if (error) { alert('Erro ao carregar os itens do plano.'); setPlanoEditandoId(null); return }
    const itensConvertidos: ItemPlanoEdicao[] = ((data as any[]) || [])
      .filter((item) => item.pratos)
      .map((item) => ({
        prato_id: Number(item.pratos.id),
        nome: item.pratos.nome,
        sku: item.pratos.sku,
        tamanho: item.pratos.tamanho,
        peso_final: Number(item.pratos.peso_final || 0),
        prioridade_embalamento: item.pratos.prioridade_embalamento === null ? null : Number(item.pratos.prioridade_embalamento),
        quantidade: Number(item.quantidade || 0),
        categoria_prato: item.pratos.categoria_prato || null,
      }))
    setItensPlanoEdicao(itensConvertidos)
  }

  function cancelarEdicaoItensPlano() {
    setPlanoEditandoId(null)
    setItensPlanoEdicao([])
    setPesquisaEdicao('')
    setPratosPesquisaEdicao([])
    setQuantidadesEdicaoAdicionar({})
  }

  function atualizarQuantidadeItemPlanoEdicao(pratoId: number, valor: string) {
    const quantidade = Number(valor)
    setItensPlanoEdicao((prev) => prev.map((item) => item.prato_id === pratoId ? { ...item, quantidade: isNaN(quantidade) ? 0 : quantidade } : item))
  }

  function removerItemPlanoEdicao(pratoId: number) {
    setItensPlanoEdicao((prev) => prev.filter((item) => item.prato_id !== pratoId))
  }

  function atualizarQuantidadeAdicionarEdicao(pratoId: number, valor: string) {
    setQuantidadesEdicaoAdicionar((prev) => ({ ...prev, [pratoId]: valor }))
  }

  function adicionarPratoAoPlanoEmEdicao(prato: Prato) {
    const quantidadeNumero = Number(quantidadesEdicaoAdicionar[prato.id] || '0')
    if (!quantidadeNumero || quantidadeNumero <= 0) { alert('Introduz uma quantidade válida.'); return }
    const existe = itensPlanoEdicao.find((item) => item.prato_id === prato.id)
    if (existe) {
      setItensPlanoEdicao((prev) => prev.map((item) => item.prato_id === prato.id ? { ...item, quantidade: item.quantidade + quantidadeNumero } : item))
    } else {
      setItensPlanoEdicao((prev) => [...prev, { prato_id: prato.id, nome: prato.nome, sku: prato.sku, tamanho: prato.tamanho, peso_final: prato.peso_final, prioridade_embalamento: prato.prioridade_embalamento, quantidade: quantidadeNumero, categoria_prato: prato.categoria_prato || null }])
    }
    setQuantidadesEdicaoAdicionar((prev) => ({ ...prev, [prato.id]: '' }))
  }

  async function guardarItensPlanoEditado(producaoId: number) {
    if (itensPlanoEdicao.length === 0) { alert('O plano não pode ficar vazio.'); return }
    if (itensPlanoEdicao.some((item) => !item.quantidade || item.quantidade <= 0)) { alert('Todas as quantidades têm de ser maiores que zero.'); return }
    setAGuardarItensPlano(true)
    const { error: apagarError } = await supabase.from('producoes_semanais_itens').delete().eq('producao_semanal_id', producaoId)
    if (apagarError) { alert('Erro ao atualizar os itens do plano.'); setAGuardarItensPlano(false); return }
    const { error: inserirError } = await supabase.from('producoes_semanais_itens').insert(itensPlanoEdicao.map((item) => ({ producao_semanal_id: producaoId, prato_id: item.prato_id, quantidade: item.quantidade })))
    if (inserirError) { alert('Erro ao guardar os novos itens do plano.'); setAGuardarItensPlano(false); return }
    if (producaoSelecionada?.id === producaoId) {
      const producaoAtual = producoes.find((p) => p.id === producaoId)
      if (producaoAtual) await verDetalhesProducao(producaoAtual)
    }
    alert('Itens do plano atualizados com sucesso!')
    setAGuardarItensPlano(false)
    cancelarEdicaoItensPlano()
  }

  function atualizarQuantidade(pratoId: number, valor: string) {
    setQuantidades((prev) => ({ ...prev, [pratoId]: valor }))
  }

  function adicionarAoPlano(prato: Prato) {
    const quantidadeNumero = Number(quantidades[prato.id] || '0')
    if (!quantidadeNumero || quantidadeNumero <= 0) { alert('Introduz uma quantidade válida.'); return }
    const existe = plano.find((item) => item.id === prato.id)
    if (existe) {
      setPlano((prev) => prev.map((item) => item.id === prato.id ? { ...item, quantidade: item.quantidade + quantidadeNumero } : item))
    } else {
      setPlano([...plano, { id: prato.id, nome: prato.nome, sku: prato.sku, tamanho: prato.tamanho, peso_final: prato.peso_final, prioridade_embalamento: prato.prioridade_embalamento, quantidade: quantidadeNumero, categoria_prato: prato.categoria_prato || null }])
    }
    setQuantidades((prev) => ({ ...prev, [prato.id]: '' }))
  }

  function removerDoPlano(id: number) {
    setPlano((prev) => prev.filter((item) => item.id !== id))
  }

  async function guardarProducaoSemanal() {
    if (plano.length === 0) { alert('Plano vazio.'); return }
    const nomePlanoLimpo = nomeNovaProducao.trim()
    if (!nomePlanoLimpo) { alert('Introduz um nome para o plano.'); return }
    setAGuardar(true)
    const { data: prod, error } = await supabase.from('producoes_semanais').insert([{ nome_semana: nomePlanoLimpo, data_inicio: obterDataHoje() }]).select().single()
    if (error) { alert('Erro ao guardar.'); setAGuardar(false); return }
    const { error: itensError } = await supabase.from('producoes_semanais_itens').insert(plano.map((item) => ({ producao_semanal_id: prod.id, prato_id: item.id, quantidade: item.quantidade })))
    if (itensError) { alert('Erro ao guardar itens da produção.'); setAGuardar(false); return }
    setPlano([])
    setQuantidades({})
    setPesquisa('')
    setPratos([])
    setNomeNovaProducao('')
    setNovaProducaoAberta(false)
    fetchProducoes()
    setAGuardar(false)
  }

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || '').trim().toLowerCase()
  }

  function parseNumero(valor: number | string | null | undefined) {
    if (valor === null || valor === undefined || String(valor).trim() === '') return 0
    const numero = parseFloat(String(valor).replace(',', '.'))
    return isNaN(numero) ? 0 : numero
  }

  function formatarNumero(valor: number) { return Number(valor || 0).toFixed(2) }
  function formatarPreco(valor: number) { return `${formatarNumero(valor)} €` }

  function formatarQuantidade(valor: number, unidade: string | null) {
    const u = (unidade || '').toLowerCase()
    if (u === 'g') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} kg` : `${valor.toFixed(0)} g`
    if (u === 'kg') return `${valor.toFixed(2)} kg`
    if (u === 'un') return `${valor.toFixed(2)} un`
    if (u === 'ml') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} l` : `${valor.toFixed(0)} ml`
    if (u === 'l') return `${valor.toFixed(2)} l`
    return `${valor.toFixed(2)}${unidade ? ` ${unidade}` : ''}`
  }

  function formatarPrecoComUnidade(preco: number | null, unidadePreco: string | null) {
    if (preco === null || preco === undefined || !unidadePreco) return '-'
    return `${formatarNumero(preco)} €/${unidadePreco}`
  }

  function obterInfoIngredientePorId(ingredienteId?: number | string | null) {
    if (ingredienteId === undefined || ingredienteId === null) return undefined
    return ingredientesInfo.find((item) => Number(item.id) === Number(ingredienteId))
  }

  function converterQuantidadeParaUnidadePreco(quantidade: number, unidadeQuantidade: string | null, unidadePreco: string | null) {
    const uq = normalizarTexto(unidadeQuantidade)
    const up = normalizarTexto(unidadePreco)
    if (!quantidade || !uq || !up) return 0
    if (uq === up) return quantidade
    if (uq === 'g' && up === 'kg') return quantidade / 1000
    if (uq === 'kg' && up === 'g') return quantidade * 1000
    if (uq === 'ml' && up === 'l') return quantidade / 1000
    if (uq === 'l' && up === 'ml') return quantidade * 1000
    return 0
  }

  function calcularCustoIngrediente(quantidade: number, unidadeQuantidade: string | null, preco: number | null, unidadePreco: string | null) {
    if (preco === null || preco === undefined || !unidadePreco || !unidadeQuantidade) return 0
    const quantidadeConvertida = converterQuantidadeParaUnidadePreco(quantidade, unidadeQuantidade, unidadePreco)
    if (!quantidadeConvertida) return 0
    return quantidadeConvertida * preco
  }

  function obterFatorUsoComponente(pratoComponente: PratoComponente) {
    const quantidadeUsadaNoPrato = parseNumero(pratoComponente.quantidade_final)
    const rendimentoBaseComponente = parseNumero(pratoComponente.componentes?.rendimento_final)
    if (!quantidadeUsadaNoPrato || !rendimentoBaseComponente) return 0
    return quantidadeUsadaNoPrato / rendimentoBaseComponente
  }

  function calcularQuantidadeIngredienteParaProducao(pratoComponente: PratoComponente, compIng: ComponenteIngrediente, doses: number) {
    const quantidadeBaseIngrediente = parseNumero(compIng.quantidade)
    const fatorUso = obterFatorUsoComponente(pratoComponente)
    if (!quantidadeBaseIngrediente || !fatorUso || !doses) return 0
    return quantidadeBaseIngrediente * fatorUso * doses
  }

  function obterOrdemTamanho(tamanho: string | null | undefined) {
    const t = normalizarTexto(tamanho)
    if (t === 'm') return 1
    if (t === 'l') return 2
    if (t === 'xl') return 3
    return 999
  }

  function ordenarTamanhoPadrao(a: { tamanho: string }, b: { tamanho: string }) {
    const ordemA = obterOrdemTamanho(a.tamanho)
    const ordemB = obterOrdemTamanho(b.tamanho)
    if (ordemA !== ordemB) return ordemA - ordemB
    return String(a.tamanho || '').localeCompare(String(b.tamanho || ''))
  }

  function exportarSecaoPDF(secao: SecaoExportacao) {
    if (!producaoSelecionada) { alert('Primeiro seleciona uma produção na aba Produção.'); return }
    setSecaoExportar(secao)
    setTimeout(() => window.print(), 150)
  }

  const comprasPorSetor = useMemo(() => {
    const compras: Record<string, Record<string, CompraAgrupada>> = {}
    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const doses = Number(item.quantidade || 0)
      pratosComponentes.filter((pc) => Number(pc.prato_id) === pratoId).forEach((pratoComponente) => {
        componentesIngredientes.filter((ci) => Number(ci.componente_id) === Number(pratoComponente.componente_id)).forEach((compIng) => {
          const infoIngrediente = obterInfoIngredientePorId(compIng.ingrediente_id)
          const nomeIngrediente = compIng.ingredientes?.nome || infoIngrediente?.nome || 'Ingrediente'
          const quantidadeCompra = calcularQuantidadeIngredienteParaProducao(pratoComponente, compIng, doses)
          const unidade = compIng.unidade || infoIngrediente?.unidade_base || null
          const categoria = infoIngrediente?.categoria || 'Outros'
          const preco = infoIngrediente?.preco === null || infoIngrediente?.preco === undefined ? null : parseNumero(infoIngrediente.preco)
          const unidadePreco = infoIngrediente?.unidade_preco || null
          const custoAtual = calcularCustoIngrediente(quantidadeCompra, unidade, preco, unidadePreco)
          if (!compras[categoria]) compras[categoria] = {}
          const chaveIngrediente = [Number(compIng.ingrediente_id) || 0, normalizarTexto(nomeIngrediente), normalizarTexto(unidade)].join('|')
          if (!compras[categoria][chaveIngrediente]) compras[categoria][chaveIngrediente] = { ingrediente_id: Number(compIng.ingrediente_id) || null, nome: nomeIngrediente, quantidade: 0, unidade, preco, unidade_preco: unidadePreco, custo_total: 0 }
          compras[categoria][chaveIngrediente].quantidade += quantidadeCompra
          compras[categoria][chaveIngrediente].custo_total += custoAtual
        })
      })
    })
    return compras
  }, [detalhesProducao, pratosComponentes, componentesIngredientes, ingredientesInfo])

  const totalCompras = useMemo(() => {
    return Object.values(comprasPorSetor).reduce((totalSetores, setor) => totalSetores + Object.values(setor).reduce((soma, item) => soma + item.custo_total, 0), 0)
  }, [comprasPorSetor])

  const listaPreparacao = useMemo(() => {
    const agrupado: Record<string, { chave: string; ingredienteNome: string; quantidadeTotalIngrediente: number; unidade: string | null; pratosMap: Record<string, { chave: string; pratoNome: string; quantidadeTotalPrato: number; unidade: string | null; tarefasMap: Record<string, ListaPreparacaoTarefa> }> }> = {}
    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato sem nome'
      const doses = Number(item.quantidade || 0)
      pratosComponentes.filter((pc) => Number(pc.prato_id) === pratoId).forEach((pratoComponente) => {
        componentesIngredientes.filter((ci) => Number(ci.componente_id) === Number(pratoComponente.componente_id)).forEach((compIng) => {
          const tarefasDoIngrediente = tarefasPreparacaoNovo.filter((tarefa) => Number(tarefa.componente_ingrediente_id) === Number(compIng.id)).sort((a, b) => Number(a.ordem) - Number(b.ordem))
          if (tarefasDoIngrediente.length === 0) return
          const quantidadeIngredientePrato = calcularQuantidadeIngredienteParaProducao(pratoComponente, compIng, doses)
          if (!quantidadeIngredientePrato) return
          const infoIngrediente = obterInfoIngredientePorId(compIng.ingrediente_id)
          const ingredienteNome = compIng.ingredientes?.nome || infoIngrediente?.nome || 'Ingrediente'
          const unidade = compIng.unidade || infoIngrediente?.unidade_base || null
          const nomeComponente = pratoComponente.componentes?.nome || 'Componente'
          const ingredienteKey = [Number(compIng.ingrediente_id) || 0, normalizarTexto(ingredienteNome), normalizarTexto(unidade)].join('|')
          if (!agrupado[ingredienteKey]) agrupado[ingredienteKey] = { chave: ingredienteKey, ingredienteNome, quantidadeTotalIngrediente: 0, unidade, pratosMap: {} }
          agrupado[ingredienteKey].quantidadeTotalIngrediente += quantidadeIngredientePrato
          const pratoKey = [normalizarTexto(pratoNome), normalizarTexto(unidade)].join('|')
          if (!agrupado[ingredienteKey].pratosMap[pratoKey]) agrupado[ingredienteKey].pratosMap[pratoKey] = { chave: pratoKey, pratoNome, quantidadeTotalPrato: 0, unidade, tarefasMap: {} }
          agrupado[ingredienteKey].pratosMap[pratoKey].quantidadeTotalPrato += quantidadeIngredientePrato
          tarefasDoIngrediente.forEach((tarefa) => {
            const ordemTarefa = Number(tarefa.ordem) || 0
            const chaveTarefa = [ordemTarefa, normalizarTexto(tarefa.tarefa), normalizarTexto(nomeComponente), normalizarTexto(tarefa.observacoes || '')].join('|')
            if (!agrupado[ingredienteKey].pratosMap[pratoKey].tarefasMap[chaveTarefa]) agrupado[ingredienteKey].pratosMap[pratoKey].tarefasMap[chaveTarefa] = { chave: chaveTarefa, tarefa: tarefa.tarefa, componente: nomeComponente, observacoes: tarefa.observacoes, quantidadeTarefa: 0, unidade, ordem: ordemTarefa }
            agrupado[ingredienteKey].pratosMap[pratoKey].tarefasMap[chaveTarefa].quantidadeTarefa += quantidadeIngredientePrato
          })
        })
      })
    })
    return Object.values(agrupado).map((ingredienteGrupo) => ({
      chave: ingredienteGrupo.chave,
      ingredienteNome: ingredienteGrupo.ingredienteNome,
      quantidadeTotalIngrediente: ingredienteGrupo.quantidadeTotalIngrediente,
      unidade: ingredienteGrupo.unidade,
      pratos: Object.values(ingredienteGrupo.pratosMap).map((pratoGrupo) => ({
        chave: pratoGrupo.chave, pratoNome: pratoGrupo.pratoNome, quantidadeTotalPrato: pratoGrupo.quantidadeTotalPrato, unidade: pratoGrupo.unidade,
        tarefas: Object.values(pratoGrupo.tarefasMap).sort((a, b) => a.ordem !== b.ordem ? a.ordem - b.ordem : a.tarefa.localeCompare(b.tarefa)),
      })).sort((a, b) => a.pratoNome.localeCompare(b.pratoNome)),
    })).filter((item) => item.pratos.length > 0).sort((a, b) => a.ingredienteNome.localeCompare(b.ingredienteNome))
  }, [detalhesProducao, pratosComponentes, componentesIngredientes, tarefasPreparacaoNovo, ingredientesInfo])

  const listaConfeccao = useMemo(() => {
    const agrupado: Record<string, { chave: string; componenteId: number; componenteNome: string; quantidadeTotal: number; unidade: string | null; prioridadeMinima: number; prioridadesSet: Set<number>; pratosMap: Record<string, ListaConfeccaoPrato>; tarefasMap: Record<string, ListaConfeccaoTarefa> }> = {}
    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato sem nome'
      const doses = Number(item.quantidade || 0)
      const prioridadeEmbalamento = item.pratos?.prioridade_embalamento === null || item.pratos?.prioridade_embalamento === undefined ? null : Number(item.pratos.prioridade_embalamento)
      pratosComponentes.filter((pc) => Number(pc.prato_id) === pratoId).sort((a, b) => Number(a.ordem) - Number(b.ordem)).forEach((pratoComponente) => {
        const componenteId = Number(pratoComponente.componente_id)
        const componenteNome = pratoComponente.componentes?.nome || 'Componente'
        const unidade = pratoComponente.unidade
        const quantidadeComponente = parseNumero(pratoComponente.quantidade_final) * doses
        if (!quantidadeComponente) return
        const tarefasDoComponente = tarefasConfeccaoNovo.filter((tarefa) => Number(tarefa.componente_id) === Number(componenteId)).sort((a, b) => Number(a.ordem) - Number(b.ordem))
        if (tarefasDoComponente.length === 0) return
        const chaveComponente = [componenteId, normalizarTexto(componenteNome), normalizarTexto(unidade)].join('|')
        if (!agrupado[chaveComponente]) agrupado[chaveComponente] = { chave: chaveComponente, componenteId, componenteNome, quantidadeTotal: 0, unidade, prioridadeMinima: prioridadeEmbalamento === null ? 999 : prioridadeEmbalamento, prioridadesSet: new Set<number>(), pratosMap: {}, tarefasMap: {} }
        agrupado[chaveComponente].quantidadeTotal += quantidadeComponente
        if (prioridadeEmbalamento !== null) agrupado[chaveComponente].prioridadesSet.add(prioridadeEmbalamento)
        const prioridadeAtual = prioridadeEmbalamento === null ? 999 : prioridadeEmbalamento
        if (prioridadeAtual < agrupado[chaveComponente].prioridadeMinima) agrupado[chaveComponente].prioridadeMinima = prioridadeAtual
        const chavePrato = [normalizarTexto(pratoNome), normalizarTexto(unidade)].join('|')
        if (!agrupado[chaveComponente].pratosMap[chavePrato]) agrupado[chaveComponente].pratosMap[chavePrato] = { chave: chavePrato, pratoNome, prioridadeEmbalamento, quantidadeComponente: 0, unidade }
        agrupado[chaveComponente].pratosMap[chavePrato].quantidadeComponente += quantidadeComponente
        const prioridadeExistente = agrupado[chaveComponente].pratosMap[chavePrato].prioridadeEmbalamento
        if (prioridadeEmbalamento !== null && (prioridadeExistente === null || prioridadeExistente === undefined || prioridadeEmbalamento < prioridadeExistente)) agrupado[chaveComponente].pratosMap[chavePrato].prioridadeEmbalamento = prioridadeEmbalamento
        tarefasDoComponente.forEach((tarefa) => {
          const chaveTarefa = [Number(tarefa.id), Number(tarefa.ordem || 0), normalizarTexto(tarefa.tarefa), normalizarTexto(tarefa.observacoes || '')].join('|')
          if (!agrupado[chaveComponente].tarefasMap[chaveTarefa]) agrupado[chaveComponente].tarefasMap[chaveTarefa] = { chave: chaveTarefa, id: tarefa.id, ordem: Number(tarefa.ordem) || 0, tarefa: tarefa.tarefa, observacoes: tarefa.observacoes }
        })
      })
    })
    return Object.values(agrupado).map((grupo) => ({
      chave: grupo.chave, componenteId: grupo.componenteId, componenteNome: grupo.componenteNome, quantidadeTotal: grupo.quantidadeTotal, unidade: grupo.unidade, prioridadeMinima: grupo.prioridadeMinima,
      prioridades: Array.from(grupo.prioridadesSet).sort((a, b) => a - b),
      pratos: Object.values(grupo.pratosMap).sort((a, b) => { const pA = a.prioridadeEmbalamento ?? 999; const pB = b.prioridadeEmbalamento ?? 999; return pA !== pB ? pA - pB : a.pratoNome.localeCompare(b.pratoNome) }),
      tarefas: Object.values(grupo.tarefasMap).sort((a, b) => a.ordem !== b.ordem ? a.ordem - b.ordem : a.tarefa.localeCompare(b.tarefa)),
    })).filter((grupo) => grupo.tarefas.length > 0).sort((a, b) => a.prioridadeMinima !== b.prioridadeMinima ? a.prioridadeMinima - b.prioridadeMinima : a.componenteNome.localeCompare(b.componenteNome))
  }, [detalhesProducao, pratosComponentes, tarefasConfeccaoNovo])

  const listaFinalizacao = useMemo(() => {
    const agrupado: Record<string, { chave: string; pratoNome: string; quantidade: number; tarefasMap: Record<string, ListaFinalizacaoTarefa> }> = {}
    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato sem nome'
      const quantidadeDoses = Number(item.quantidade || 0)
      const chavePrato = normalizarTexto(pratoNome)
      if (!agrupado[chavePrato]) agrupado[chavePrato] = { chave: chavePrato, pratoNome, quantidade: 0, tarefasMap: {} }
      agrupado[chavePrato].quantidade += quantidadeDoses
      pratosComponentes.filter((pc) => Number(pc.prato_id) === pratoId).sort((a, b) => Number(a.ordem) - Number(b.ordem)).forEach((pratoComponente) => {
        tarefasFinalizacaoNovo.filter((tarefa) => Number(tarefa.componente_id) === Number(pratoComponente.componente_id)).sort((a, b) => Number(a.ordem) - Number(b.ordem)).forEach((tarefa) => {
          const componenteNome = pratoComponente.componentes?.nome || 'Componente'
          const unidade = pratoComponente.unidade
          const quantidadeFinalComponente = parseNumero(pratoComponente.quantidade_final) * quantidadeDoses
          const chaveTarefa = [Number(tarefa.componente_id), Number(tarefa.ordem || 0), normalizarTexto(componenteNome), normalizarTexto(tarefa.tarefa), normalizarTexto(tarefa.observacoes || ''), normalizarTexto(unidade)].join('|')
          if (!agrupado[chavePrato].tarefasMap[chaveTarefa]) agrupado[chavePrato].tarefasMap[chaveTarefa] = { chave: chaveTarefa, id: Number(tarefa.id), ordem: Number(tarefa.ordem) || 0, tarefa: tarefa.tarefa, observacoes: tarefa.observacoes, componenteNome, quantidadeFinalComponente: 0, unidade }
          agrupado[chavePrato].tarefasMap[chaveTarefa].quantidadeFinalComponente += quantidadeFinalComponente
        })
      })
    })
    return Object.values(agrupado).map((bloco) => ({
      chave: bloco.chave, pratoNome: bloco.pratoNome, quantidade: bloco.quantidade,
      tarefas: Object.values(bloco.tarefasMap).sort((a, b) => a.ordem !== b.ordem ? a.ordem - b.ordem : a.componenteNome !== b.componenteNome ? a.componenteNome.localeCompare(b.componenteNome) : a.tarefa.localeCompare(b.tarefa)),
    })).sort((a, b) => a.pratoNome.localeCompare(b.pratoNome))
  }, [detalhesProducao, pratosComponentes, tarefasFinalizacaoNovo])

  const listaEmbalamento = useMemo(() => {
    const agrupado: Record<string, GrupoEmbalamento> = {}
    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato'
      const prioridade = item.pratos?.prioridade_embalamento ?? null
      const tamanho = item.pratos?.tamanho || '-'
      const sku = item.pratos?.sku || '-'
      const quantidade = Number(item.quantidade || 0)
      const componentesDoPrato = pratosComponentes.filter((pc) => Number(pc.prato_id) === pratoId).sort((a, b) => Number(a.ordem) - Number(b.ordem)).map((componente) => ({ id: componente.id, nome: componente.componentes?.nome || 'Componente', peso: parseNumero(componente.quantidade_final), unidade: componente.unidade, posicao: componente.posicao_embalagem || '-', ordem: Number(componente.ordem || 0) }))
      const chaveGrupo = normalizarTexto(pratoNome)
      if (!agrupado[chaveGrupo]) agrupado[chaveGrupo] = { chave: chaveGrupo, prato: pratoNome, prioridade, tamanhos: [] }
      agrupado[chaveGrupo].tamanhos.push({ chave: String(item.id), tamanho, sku, quantidade, componentes: componentesDoPrato })
    })
    return Object.values(agrupado).map((grupo) => ({ ...grupo, tamanhos: grupo.tamanhos.sort(ordenarTamanhoPadrao) })).sort((a, b) => { const pA = a.prioridade ?? 999; const pB = b.prioridade ?? 999; return pA !== pB ? pA - pB : a.prato.localeCompare(b.prato) })
  }, [detalhesProducao, pratosComponentes])

  function renderCartaoPrato(item: ItemPlano, onRemover: () => void) {
    const cores = obterCoresCategoria(item.categoria_prato)
    return (
      <div key={item.id} style={{ background: cores.bg, borderRadius: '8px', padding: '10px 12px', position: 'relative' }}>
        <p style={{ fontSize: '9px', color: cores.textoSecundario, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.categoria_prato || 'Sem categoria'}</p>
        <p style={{ fontSize: '13px', color: cores.textoPrincipal, fontWeight: '500', margin: '0 0 4px' }}>{item.nome}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: cores.textoSecundario }}>{item.tamanho} · {item.sku}</span>
          <span style={{ fontSize: '13px', color: cores.textoPrincipal, fontWeight: '500' }}>{item.quantidade} doses</span>
        </div>
        <button onClick={onRemover} style={{ position: 'absolute', top: '6px', right: '8px', background: 'transparent', border: 'none', fontSize: '14px', color: cores.textoSecundario, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
    )
  }

  function renderNovaProducao() {
    const textoPesquisa = pesquisa.trim()
    const mostrarResultados = textoPesquisa.length >= 2
    return (
      <div style={{ border: '2px solid #80c944', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', background: '#fff' }}>
        <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 16px', color: '#111' }}>Nova produção</p>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome do plano</label>
          <input type="text" placeholder="ex: Menu Semana 19" value={nomeNovaProducao} onChange={(e) => setNomeNovaProducao(e.target.value)}
            style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Pesquisar pratos</label>
          <input type="text" placeholder="Pesquisar por nome ou SKU..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)}
            style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
        </div>
        {mostrarResultados && (
          <div style={{ marginBottom: '12px' }}>
            {loading ? (
              <p style={{ fontSize: '13px', color: '#6b7280' }}>A procurar...</p>
            ) : pratos.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7280' }}>Nenhum prato encontrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {pratos.map((p) => {
                  const cores = obterCoresCategoria(p.categoria_prato)
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: cores.bg, borderRadius: '6px', padding: '8px 10px', gap: '8px' }}>
                      <div>
                        <p style={{ fontSize: '9px', color: cores.textoSecundario, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{p.categoria_prato || 'Sem categoria'}</p>
                        <p style={{ fontSize: '13px', color: cores.textoPrincipal, fontWeight: '500', margin: '0' }}>{p.nome}</p>
                        <p style={{ fontSize: '11px', color: cores.textoSecundario, margin: '0' }}>{p.tamanho} · {p.sku}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="number" min="1" value={quantidades[p.id] || ''} onChange={(e) => atualizarQuantidade(p.id, e.target.value)}
                          style={{ width: '60px', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '5px', fontSize: '13px', color: '#111', background: '#fff' }} />
                        <button onClick={() => adicionarAoPlano(p)} style={{ backgroundColor: '#80c944', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Add</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {plano.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Pratos adicionados</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {plano.map((item) => renderCartaoPrato(item, () => removerDoPlano(item.id)))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={guardarProducaoSemanal} disabled={aGuardar} style={{ backgroundColor: '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
            {aGuardar ? 'A guardar...' : 'Guardar produção'}
          </button>
          <button onClick={() => { setNovaProducaoAberta(false); setPlano([]); setPesquisa(''); setPratos([]); setNomeNovaProducao('') }}
            style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  function renderEditorItensPlano(producaoId: number) {
    const textoPesquisa = pesquisaEdicao.trim()
    const mostrarResultados = textoPesquisa.length >= 2
    return (
      <div style={{ marginTop: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', background: '#f9fafb' }}>
        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 12px', color: '#111' }}>Editar pratos do plano</p>
        {itensPlanoEdicao.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {itensPlanoEdicao.map((item) => {
              const cores = obterCoresCategoria(item.categoria_prato)
              return (
                <div key={item.prato_id} style={{ background: cores.bg, borderRadius: '8px', padding: '10px 12px', position: 'relative' }}>
                  <p style={{ fontSize: '9px', color: cores.textoSecundario, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.categoria_prato || 'Sem categoria'}</p>
                  <p style={{ fontSize: '13px', color: cores.textoPrincipal, fontWeight: '500', margin: '0 0 4px' }}>{item.nome}</p>
                  <p style={{ fontSize: '11px', color: cores.textoSecundario, margin: '0 0 6px' }}>{item.tamanho} · {item.sku}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" min="1" value={item.quantidade} onChange={(e) => atualizarQuantidadeItemPlanoEdicao(item.prato_id, e.target.value)}
                      style={{ width: '60px', border: '1px solid #d1d5db', padding: '3px 6px', borderRadius: '4px', fontSize: '12px', color: '#111', background: '#fff' }} />
                    <button onClick={() => removerItemPlanoEdicao(item.prato_id)} style={{ background: 'transparent', border: 'none', fontSize: '14px', color: cores.textoSecundario, cursor: 'pointer' }}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ marginBottom: '12px' }}>
          <input type="text" placeholder="Pesquisar prato por nome ou SKU..." value={pesquisaEdicao} onChange={(e) => setPesquisaEdicao(e.target.value)}
            style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', color: '#111', background: '#fff' }} />
        </div>
        {mostrarResultados && (
          <div style={{ marginBottom: '12px' }}>
            {loadingPesquisaEdicao ? (
              <p style={{ fontSize: '13px', color: '#6b7280' }}>A procurar...</p>
            ) : pratosPesquisaEdicao.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7280' }}>Nenhum prato encontrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {pratosPesquisaEdicao.map((p) => {
                  const cores = obterCoresCategoria(p.categoria_prato)
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: cores.bg, borderRadius: '6px', padding: '8px 10px', gap: '8px' }}>
                      <div>
                        <p style={{ fontSize: '9px', color: cores.textoSecundario, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{p.categoria_prato || 'Sem categoria'}</p>
                        <p style={{ fontSize: '13px', color: cores.textoPrincipal, fontWeight: '500', margin: '0' }}>{p.nome}</p>
                        <p style={{ fontSize: '11px', color: cores.textoSecundario, margin: '0' }}>{p.tamanho} · {p.sku}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="number" min="1" value={quantidadesEdicaoAdicionar[p.id] || ''} onChange={(e) => atualizarQuantidadeAdicionarEdicao(p.id, e.target.value)}
                          style={{ width: '60px', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '5px', fontSize: '13px', color: '#111', background: '#fff' }} />
                        <button onClick={() => adicionarPratoAoPlanoEmEdicao(p)} style={{ backgroundColor: '#80c944', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Add</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => guardarItensPlanoEditado(producaoId)} disabled={aGuardarItensPlano} style={{ backgroundColor: '#80c944', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            {aGuardarItensPlano ? 'A guardar...' : 'Guardar itens'}
          </button>
          <button onClick={cancelarEdicaoItensPlano} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    )
  }

  function renderProducao() {
    return (
      <>
        {novaProducaoAberta ? renderNovaProducao() : (
          <button onClick={() => setNovaProducaoAberta(true)}
            style={{ width: '100%', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '1rem', background: '#f9fafb', color: '#6b7280', fontSize: '14px', cursor: 'pointer', marginBottom: '1rem' }}>
            + Nova produção
          </button>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
          {producoes.map((p) => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  {producaoEmEdicaoId === p.id ? (
                    <input type="text" value={nomeEdicao} onChange={(e) => setNomeEdicao(e.target.value)}
                      style={{ width: '100%', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '6px', fontSize: '14px', color: '#111', background: '#fff', boxSizing: 'border-box' }} />
                  ) : (
                    <p style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 2px', color: '#111' }}>{p.nome_semana}</p>
                  )}
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>{p.data_inicio}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {producaoEmEdicaoId === p.id ? (
                  <>
                    <button onClick={() => guardarNovoNomeProducao(p.id)} disabled={aAtualizarProducao} style={{ backgroundColor: '#80c944', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                      {aAtualizarProducao ? 'A guardar...' : 'Guardar nome'}
                    </button>
                    <button onClick={cancelarEdicaoProducao} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => verDetalhesProducao(p)} style={{ backgroundColor: '#80c944', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Ver detalhes</button>
                    <button onClick={() => iniciarEdicaoProducao(p)} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Renomear</button>
                    <button onClick={() => iniciarEdicaoItensPlano(p)} style={{ background: '#fef9c3', color: '#854d0e', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Editar itens</button>
                    <button onClick={() => apagarProducao(p)} disabled={aApagarProducaoId === p.id} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                      {aApagarProducaoId === p.id ? 'A apagar...' : 'Apagar'}
                    </button>
                  </>
                )}
              </div>
              {planoEditandoId === p.id && renderEditorItensPlano(p.id)}
            </div>
          ))}
        </div>
        {producaoSelecionada && (
          <div style={{ marginTop: '24px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.25rem', background: '#f9fafb' }}>
            <p style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 12px', color: '#111' }}>Detalhes: {producaoSelecionada.nome_semana}</p>
            {aCarregarDetalhes ? (
              <p style={{ color: '#6b7280', fontSize: '13px' }}>A carregar...</p>
            ) : detalhesProducao.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '13px' }}>Sem itens nesta produção.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {detalhesProducao.map((item) => {
                  const categoria = item.pratos?.categoria_prato || null
                  const cores = obterCoresCategoria(categoria)
                  return (
                    <div key={item.id} style={{ background: cores.bg, borderRadius: '8px', padding: '10px 12px' }}>
                      <p style={{ fontSize: '9px', color: cores.textoSecundario, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{categoria || 'Sem categoria'}</p>
                      <p style={{ fontSize: '13px', color: cores.textoPrincipal, fontWeight: '500', margin: '0 0 4px' }}>{item.pratos?.nome || 'Prato sem nome'}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: cores.textoSecundario }}>{item.pratos?.tamanho} · {item.pratos?.sku}</span>
                        <span style={{ fontSize: '13px', color: cores.textoPrincipal, fontWeight: '500' }}>{item.quantidade} doses</span>
                      </div>
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

  function renderCompras() {
    return (
      <div className="border p-6 rounded bg-gray-50">
        <div className="flex justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold">Lista de Compras</h2>
          {producaoSelecionada && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Custo total estimado</p>
              <p className="text-xl font-bold">{formatarPreco(totalCompras)}</p>
            </div>
          )}
        </div>
        {!producaoSelecionada ? (
          <p className="text-gray-600">Primeiro seleciona uma produção na aba Produção.</p>
        ) : Object.keys(comprasPorSetor).length === 0 ? (
          <p className="text-gray-600">Sem dados de compras ainda.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(comprasPorSetor).map(([categoria, itens]) => {
              const totalSetor = Object.values(itens).reduce((soma, item) => soma + item.custo_total, 0)
              return (
                <div key={categoria}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold">{categoria}</h3>
                    <p className="font-semibold">Total setor: {formatarPreco(totalSetor)}</p>
                  </div>
                  <div className="space-y-2">
                    {Object.values(itens).map((info) => (
                      <div key={`${info.ingrediente_id ?? info.nome}-${info.unidade ?? 'sem-unidade'}`} className="border py-3 bg-white px-3 rounded">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold">{info.nome}</p>
                            <p className="text-sm text-gray-600">Quantidade: {formatarQuantidade(info.quantidade, info.unidade)}</p>
                            <p className="text-sm text-gray-600">Preço: {formatarPrecoComUnidade(info.preco, info.unidade_preco)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Custo</p>
                            <p className="font-bold">{formatarPreco(info.custo_total)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderPreparacao() {
    return (
      <div className="border p-6 rounded bg-gray-50">
        <h2 className="text-2xl font-bold mb-6">Lista de Preparação</h2>
        {!producaoSelecionada ? (
          <p className="text-gray-600">Primeiro seleciona uma produção na aba Produção.</p>
        ) : listaPreparacao.length === 0 ? (
          <p className="text-gray-600">Ainda não existem tarefas de preparação para esta produção.</p>
        ) : (
          <div className="space-y-6">
            {listaPreparacao.map((grupo) => (
              <div key={grupo.chave} className="border rounded p-5 bg-white">
                <div className="mb-5 border-b pb-4">
                  <p className="text-xl font-bold">{grupo.ingredienteNome}</p>
                  <p className="text-sm text-gray-700 mt-1"><strong>Quantidade total:</strong> {formatarQuantidade(grupo.quantidadeTotalIngrediente, grupo.unidade)}</p>
                </div>
                <div className="space-y-5">
                  {grupo.pratos.map((prato) => (
                    <div key={prato.chave} className="border rounded p-4 bg-gray-50">
                      <div className="mb-4">
                        <p className="font-semibold text-lg">Para o prato: {prato.pratoNome}</p>
                        <p className="text-sm text-gray-700 mt-1"><strong>Quantidade:</strong> {formatarQuantidade(prato.quantidadeTotalPrato, prato.unidade)}</p>
                      </div>
                      <div className="space-y-3">
                        {prato.tarefas.map((tarefa) => (
                          <div key={tarefa.chave} className="border-b pb-3 last:border-b-0 last:pb-0">
                            <p><strong>Ordem:</strong> {tarefa.ordem || '-'}</p>
                            <p><strong>Tarefa:</strong> {tarefa.tarefa}</p>
                            <p><strong>Componente:</strong> {tarefa.componente}</p>
                            <p><strong>Quantidade:</strong> {formatarQuantidade(tarefa.quantidadeTarefa, tarefa.unidade)}</p>
                            {tarefa.observacoes && <p><strong>Obs:</strong> {tarefa.observacoes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderConfeccao() {
    return (
      <div className="border p-6 rounded bg-gray-50">
        <h2 className="text-2xl font-bold mb-6">Lista de Confeção</h2>
        {!producaoSelecionada ? (
          <p className="text-gray-600">Primeiro seleciona uma produção na aba Produção.</p>
        ) : listaConfeccao.length === 0 ? (
          <p className="text-gray-600">Ainda não existem tarefas de confeção para esta produção.</p>
        ) : (
          <div className="space-y-6">
            {listaConfeccao.map((bloco) => (
              <div key={bloco.chave} className="border rounded p-5 bg-white">
                <div className="mb-5 border-b pb-4">
                  <p className="text-2xl font-bold">{bloco.componenteNome}</p>
                  <p className="text-lg font-bold text-green-700 mt-2">Quantidade total: {formatarQuantidade(bloco.quantidadeTotal, bloco.unidade)}</p>
                  <p className="text-sm text-gray-600 mt-1"><strong>Prioridades:</strong> {bloco.prioridades.length > 0 ? bloco.prioridades.join(', ') : '-'}</p>
                </div>
                <div className="mb-5">
                  <h3 className="text-lg font-semibold mb-3">Pratos que usam este componente</h3>
                  <div className="space-y-2">
                    {bloco.pratos.map((prato) => (
                      <div key={prato.chave} className="border rounded p-3 bg-gray-50">
                        <p className="font-semibold">{prato.pratoNome}</p>
                        <p><strong>Quantidade:</strong> {formatarQuantidade(prato.quantidadeComponente, prato.unidade)}</p>
                        <p><strong>Prioridade:</strong> {prato.prioridadeEmbalamento ?? '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tarefas de confeção</h3>
                  <div className="space-y-2">
                    {bloco.tarefas.map((tarefa) => (
                      <div key={tarefa.chave} className="border-b pb-2">
                        <p><strong>Ordem:</strong> {tarefa.ordem || '-'}</p>
                        <p><strong>Tarefa:</strong> {tarefa.tarefa}</p>
                        {tarefa.observacoes && <p><strong>Obs:</strong> {tarefa.observacoes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderFinalizacao() {
    return (
      <div className="border p-6 rounded bg-gray-50">
        <h2 className="text-2xl font-bold mb-6">Lista de Finalização</h2>
        {!producaoSelecionada ? (
          <p className="text-gray-600">Primeiro seleciona uma produção na aba Produção.</p>
        ) : listaFinalizacao.every((bloco) => bloco.tarefas.length === 0) ? (
          <p className="text-gray-600">Sem tarefas de finalização.</p>
        ) : (
          <div className="space-y-6">
            {listaFinalizacao.map((bloco) => (
              <div key={bloco.chave} className="border rounded p-4 bg-white">
                <p className="font-semibold mb-1">{bloco.pratoNome}</p>
                <p className="text-sm text-gray-600 mb-4">{bloco.quantidade} doses</p>
                <div className="space-y-2">
                  {bloco.tarefas.map((tarefa) => (
                    <div key={tarefa.chave} className="border-b pb-2">
                      <p><strong>Componente:</strong> {tarefa.componenteNome}</p>
                      <p><strong>Tarefa:</strong> {tarefa.tarefa}</p>
                      <p><strong>Quantidade:</strong> {formatarQuantidade(tarefa.quantidadeFinalComponente, tarefa.unidade)}</p>
                      {tarefa.observacoes && <p><strong>Obs:</strong> {tarefa.observacoes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderEmbalamento() {
    return (
      <div className="border p-6 rounded bg-gray-50">
        <h2 className="text-2xl font-bold mb-6">Lista de Embalamento</h2>
        {!producaoSelecionada ? (
          <p className="text-gray-600">Primeiro seleciona uma produção na aba Produção.</p>
        ) : listaEmbalamento.length === 0 ? (
          <p className="text-gray-600">Sem dados de embalamento.</p>
        ) : (
          <div className="space-y-6">
            {listaEmbalamento.map((grupo) => (
              <div key={grupo.chave} className="border rounded p-5 bg-white">
                <div className="mb-4 border-b pb-4">
                  <p className="text-xl font-bold">{grupo.prato}</p>
                  <p><strong>Prioridade:</strong> {grupo.prioridade ?? '-'}</p>
                </div>
                <div className="space-y-5">
                  {grupo.tamanhos.map((linha) => (
                    <div key={linha.chave} className="border rounded p-4 bg-gray-50">
                      <div className="mb-4">
                        <p className="text-2xl font-extrabold text-green-700">Tamanho: {linha.tamanho}</p>
                        <p><strong>SKU:</strong> {linha.sku}</p>
                        <p><strong>Quantidade:</strong> {linha.quantidade}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {linha.componentes.map((componente) => (
                          <div key={componente.id} className="border-2 border-green-200 rounded p-4 bg-green-50">
                            <p className="font-semibold text-lg mb-2">{componente.nome}</p>
                            <p><strong>Peso:</strong> {formatarQuantidade(componente.peso, componente.unidade)}</p>
                            <p><strong>Posição:</strong> {componente.posicao}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function obterTituloExportacao(secao: SecaoExportacao) {
    if (secao === 'compras') return 'Lista de Compras'
    if (secao === 'preparacao') return 'Lista de Preparação'
    if (secao === 'confeccao') return 'Lista de Confeção'
    if (secao === 'finalizacao') return 'Lista de Finalização'
    return 'Lista de Embalamento'
  }

  function renderAreaImpressao() {
    if (!secaoExportar || !producaoSelecionada) return null
    return (
      <div className="print-area">
        <div className="print-page">
          <div className="print-header">
            <h1>{obterTituloExportacao(secaoExportar)}</h1>
            <p><strong>Plano:</strong> {producaoSelecionada.nome_semana}</p>
            <p><strong>Data:</strong> {producaoSelecionada.data_inicio}</p>
          </div>
          {secaoExportar === 'compras' && (
            <div className="print-section">
              {Object.keys(comprasPorSetor).length === 0 ? <p>Sem dados de compras.</p> : Object.entries(comprasPorSetor).map(([categoria, itens]) => (
                <div key={categoria} className="print-block">
                  <h2>{categoria}</h2>
                  <table className="print-table">
                    <thead><tr><th>Ingrediente</th><th>Quantidade</th><th>Preço</th></tr></thead>
                    <tbody>{Object.values(itens).map((info) => (<tr key={`${info.ingrediente_id ?? info.nome}-${info.unidade ?? 'sem-unidade'}`}><td>{info.nome}</td><td>{formatarQuantidade(info.quantidade, info.unidade)}</td><td>{formatarPrecoComUnidade(info.preco, info.unidade_preco)}</td></tr>))}</tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {secaoExportar === 'preparacao' && (
            <div className="print-section">
              {listaPreparacao.length === 0 ? <p>Sem dados de preparação.</p> : listaPreparacao.map((grupo) => (
                <div key={grupo.chave} className="print-block">
                  <h2>{grupo.ingredienteNome}</h2>
                  <p className="print-subtitle">Quantidade total: {formatarQuantidade(grupo.quantidadeTotalIngrediente, grupo.unidade)}</p>
                  {grupo.pratos.map((prato) => (
                    <div key={prato.chave} className="print-subblock">
                      <h3>{prato.pratoNome}</h3>
                      <p>Quantidade: {formatarQuantidade(prato.quantidadeTotalPrato, prato.unidade)}</p>
                      <table className="print-table">
                        <thead><tr><th>Ordem</th><th>Tarefa</th><th>Componente</th></tr></thead>
                        <tbody>{prato.tarefas.map((tarefa) => (<tr key={tarefa.chave}><td>{tarefa.ordem || '-'}</td><td>{tarefa.tarefa}</td><td>{tarefa.componente}</td></tr>))}</tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {secaoExportar === 'confeccao' && (
            <div className="print-section">
              {listaConfeccao.length === 0 ? <p>Sem dados de confeção.</p> : listaConfeccao.map((bloco) => (
                <div key={bloco.chave} className="print-block">
                  <h2>{bloco.componenteNome}</h2>
                  <p className="print-subtitle"><strong>Quantidade total:</strong> {formatarQuantidade(bloco.quantidadeTotal, bloco.unidade)}</p>
                  <p className="print-subtitle"><strong>Prioridade:</strong> {bloco.prioridades.length > 0 ? bloco.prioridades.join(', ') : '-'}</p>
                  <table className="print-table">
                    <thead><tr><th>Ordem</th><th>Tarefa</th></tr></thead>
                    <tbody>{bloco.tarefas.map((tarefa) => (<tr key={tarefa.chave}><td>{tarefa.ordem || '-'}</td><td>{tarefa.tarefa}</td></tr>))}</tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {secaoExportar === 'finalizacao' && (
            <div className="print-section">
              {listaFinalizacao.every((bloco) => bloco.tarefas.length === 0) ? <p>Sem dados de finalização.</p> : listaFinalizacao.map((bloco) => (
                <div key={bloco.chave} className="print-block">
                  <h2>{bloco.pratoNome}</h2>
                  <p className="print-subtitle">{bloco.quantidade} doses</p>
                  <table className="print-table">
                    <thead><tr><th>Componente</th><th>Tarefa</th><th>Quantidade</th></tr></thead>
                    <tbody>{bloco.tarefas.length === 0 ? <tr><td colSpan={3}>Sem tarefas.</td></tr> : bloco.tarefas.map((tarefa) => (<tr key={tarefa.chave}><td>{tarefa.componenteNome}</td><td>{tarefa.tarefa}</td><td>{formatarQuantidade(tarefa.quantidadeFinalComponente, tarefa.unidade)}</td></tr>))}</tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {secaoExportar === 'embalamento' && (
            <div className="print-section">
              {listaEmbalamento.length === 0 ? <p>Sem dados de embalamento.</p> : listaEmbalamento.map((grupo) => (
                <div key={grupo.chave} className="print-block">
                  <h2>{grupo.prato}</h2>
                  <p className="print-subtitle">Prioridade: {grupo.prioridade ?? '-'}</p>
                  {grupo.tamanhos.map((linha) => (
                    <div key={linha.chave} className="print-subblock">
                      <h3>Tamanho: {linha.tamanho}</h3>
                      <p>SKU: {linha.sku}</p>
                      <p>Quantidade: {linha.quantidade}</p>
                      <table className="print-table">
                        <thead><tr><th>Componente</th><th>Peso</th><th>Posição</th></tr></thead>
                        <tbody>{linha.componentes.map((componente) => (<tr key={componente.id}><td>{componente.nome}</td><td>{formatarQuantidade(componente.peso, componente.unidade)}</td><td>{componente.posicao}</td></tr>))}</tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="no-print min-h-screen bg-white text-black">
        <div style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', padding: '6px 32px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {nomeUtilizador && <span style={{ color: '#6b7280', fontSize: '13px' }}>Olá, {nomeUtilizador}</span>}
            <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer' }}>Sair da sessão</button>
          </div>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Gestão Cozinha Industrial</h1>
            <div className="flex gap-3 flex-wrap justify-end">
              <div className="relative group">
                <button className="text-white px-4 py-2 rounded font-medium" style={{ backgroundColor: '#2563eb' }}>Ingredientes ▾</button>
                <div className="absolute right-0 top-full w-52 bg-white border rounded shadow-md hidden group-hover:block z-50">
                  <Link href="/ingredientes/novo" className="block px-4 py-2 hover:bg-gray-100">Novo ingrediente</Link>
                  <Link href="/ingredientes/editar" className="block px-4 py-2 hover:bg-gray-100">Editar ingredientes</Link>
                </div>
              </div>
              <div className="relative group">
                <button className="text-white px-4 py-2 rounded font-medium" style={{ backgroundColor: '#16a34a' }}>Componentes ▾</button>
                <div className="absolute right-0 top-full w-52 bg-white border rounded shadow-md hidden group-hover:block z-50">
                  <Link href="/componentes/novo" className="block px-4 py-2 hover:bg-gray-100">Novo componente</Link>
                  <Link href="/componentes/editar" className="block px-4 py-2 hover:bg-gray-100">Editar componentes</Link>
                </div>
              </div>
              <div className="relative group">
                <button className="text-white px-4 py-2 rounded font-medium" style={{ backgroundColor: '#80c944' }}>Pratos ▾</button>
                <div className="absolute right-0 top-full w-52 bg-white border rounded shadow-md hidden group-hover:block z-50">
                  <Link href="/pratos/novo" className="block px-4 py-2 hover:bg-gray-100">Novo prato</Link>
                  <Link href="/pratos/editar" className="block px-4 py-2 hover:bg-gray-100">Editar pratos</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            {(['producao', 'compras', 'preparacao', 'confeccao', 'finalizacao', 'embalamento'] as AbaAtiva[]).map((aba) => (
              <button key={aba} onClick={() => setAbaAtiva(aba)}
                style={{ backgroundColor: abaAtiva === aba ? '#80c944' : '#e5e7eb', color: abaAtiva === aba ? '#ffffff' : '#000000' }}
                className="px-4 py-2 rounded font-medium">
                {aba === 'producao' ? 'Produção' : aba === 'preparacao' ? 'Preparação' : aba === 'confeccao' ? 'Confeção' : aba === 'finalizacao' ? 'Finalização' : aba === 'embalamento' ? 'Embalamento' : 'Compras'}
              </button>
            ))}
          </div>

          {abaAtiva !== 'producao' && (
            <div className="border rounded p-4 bg-gray-50 mb-8">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-semibold mr-2">Exportar PDF:</span>
                {(['compras', 'preparacao', 'confeccao', 'finalizacao', 'embalamento'] as SecaoExportacao[]).map((s) => (
                  <button key={s} onClick={() => exportarSecaoPDF(s)} className="bg-gray-800 text-white px-4 py-2 rounded">
                    {s === 'preparacao' ? 'Preparação' : s === 'confeccao' ? 'Confeção' : s === 'finalizacao' ? 'Finalização' : s === 'embalamento' ? 'Embalamento' : 'Compras'}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-3">Seleciona primeiro uma produção e depois escolhe a lista que queres exportar.</p>
            </div>
          )}

          {abaAtiva === 'producao' && renderProducao()}
          {abaAtiva === 'compras' && renderCompras()}
          {abaAtiva === 'preparacao' && renderPreparacao()}
          {abaAtiva === 'confeccao' && renderConfeccao()}
          {abaAtiva === 'finalizacao' && renderFinalizacao()}
          {abaAtiva === 'embalamento' && renderEmbalamento()}
        </div>
      </main>

      {renderAreaImpressao()}

      <style jsx global>{`
        .print-area { display: none; }
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { background: #ffffff !important; color: #000000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          .print-page { width: 100%; max-width: 190mm; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.35; color: #000; }
          .print-header { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #000; }
          .print-header h1 { font-size: 20px; font-weight: 700; margin: 0 0 6px 0; }
          .print-header p { margin: 2px 0; }
          .print-section { width: 100%; }
          .print-block { margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; border: 1px solid #999; padding: 8px; }
          .print-subblock { margin-top: 8px; page-break-inside: avoid; break-inside: avoid; }
          .print-block h2 { font-size: 14px; margin: 0 0 4px 0; font-weight: 700; }
          .print-subblock h3 { font-size: 12px; margin: 0 0 4px 0; font-weight: 700; }
          .print-subtitle { margin: 0 0 8px 0; font-size: 11px; }
          .print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .print-table th, .print-table td { border: 1px solid #666; padding: 4px 6px; text-align: left; vertical-align: top; word-wrap: break-word; }
          .print-table th { font-weight: 700; background: #f1f1f1 !important; }
        }
      `}</style>
    </>
  )
}