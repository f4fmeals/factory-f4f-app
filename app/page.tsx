// @ts-nocheck
//
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type AbaAtiva =
  | 'producao'
  | 'compras'
  | 'preparacao'
  | 'confeccao'
  | 'finalizacao'
  | 'embalamento'

type SecaoExportacao =
  | 'compras'
  | 'preparacao'
  | 'confeccao'
  | 'finalizacao'
  | 'embalamento'

type Prato = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number | null
}

type ItemPlano = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number | null
  quantidade: number
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
  pratoId: number
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

export default function Home() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('producao')

  const [pratos, setPratos] = useState<Prato[]>([])
  const [producoes, setProducoes] = useState<ProducaoSemanal[]>([])
  const [pesquisa, setPesquisa] = useState('')
  const [loading, setLoading] = useState(false)
  const [plano, setPlano] = useState<ItemPlano[]>([])
  const [quantidades, setQuantidades] = useState<Record<number, string>>({})
  const [aGuardar, setAGuardar] = useState(false)

  const [producaoSelecionada, setProducaoSelecionada] =
    useState<ProducaoSemanal | null>(null)
  const [detalhesProducao, setDetalhesProducao] = useState<DetalheProducao[]>([])
  const [ingredientesInfo, setIngredientesInfo] = useState<IngredienteInfo[]>([])
  const [pratosComponentes, setPratosComponentes] = useState<PratoComponente[]>([])
  const [componentesIngredientes, setComponentesIngredientes] = useState<
    ComponenteIngrediente[]
  >([])
  const [tarefasPreparacaoNovo, setTarefasPreparacaoNovo] = useState<
    TarefaPreparacaoNova[]
  >([])
  const [tarefasConfeccaoNovo, setTarefasConfeccaoNovo] = useState<
    TarefaConfeccaoNova[]
  >([])
  const [tarefasFinalizacaoNovo, setTarefasFinalizacaoNovo] = useState<
    TarefaFinalizacaoNova[]
  >([])
  const [aCarregarDetalhes, setACarregarDetalhes] = useState(false)

  const [producaoEmEdicaoId, setProducaoEmEdicaoId] = useState<number | null>(
    null
  )
  const [nomeEdicao, setNomeEdicao] = useState('')
  const [aAtualizarProducao, setAAtualizarProducao] = useState(false)
  const [aApagarProducaoId, setAApagarProducaoId] = useState<number | null>(null)

  const [planoEditandoId, setPlanoEditandoId] = useState<number | null>(null)
  const [itensPlanoEdicao, setItensPlanoEdicao] = useState<ItemPlanoEdicao[]>([])
  const [aGuardarItensPlano, setAGuardarItensPlano] = useState(false)
  const [pesquisaEdicao, setPesquisaEdicao] = useState('')
  const [loadingPesquisaEdicao, setLoadingPesquisaEdicao] = useState(false)
  const [pratosPesquisaEdicao, setPratosPesquisaEdicao] = useState<Prato[]>([])
  const [quantidadesEdicaoAdicionar, setQuantidadesEdicaoAdicionar] = useState<
    Record<number, string>
  >({})

  const [secaoExportar, setSecaoExportar] = useState<SecaoExportacao | null>(null)

  useEffect(() => {
    fetchProducoes()
  }, [])

  useEffect(() => {
    const texto = pesquisa.trim()

    if (texto.length < 2) {
      setPratos([])
      setLoading(false)
      return
    }

    const timer = setTimeout(() => {
      pesquisarPratos(texto)
    }, 300)

    return () => clearTimeout(timer)
  }, [pesquisa])

  useEffect(() => {
    const texto = pesquisaEdicao.trim()

    if (texto.length < 2) {
      setPratosPesquisaEdicao([])
      setLoadingPesquisaEdicao(false)
      return
    }

    const timer = setTimeout(() => {
      pesquisarPratosEdicao(texto)
    }, 300)

    return () => clearTimeout(timer)
  }, [pesquisaEdicao])

  useEffect(() => {
    function limparDepoisImpressao() {
      setSecaoExportar(null)
    }

    window.addEventListener('afterprint', limparDepoisImpressao)
    return () => window.removeEventListener('afterprint', limparDepoisImpressao)
  }, [])

  function obterDataHoje() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  async function pesquisarPratos(termo: string) {
    const texto = termo.trim()

    if (texto.length < 2) {
      setPratos([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('pratos')
      .select('id, nome, sku, tamanho, peso_final, prioridade_embalamento')
      .or(`nome.ilike.%${texto}%,sku.ilike.%${texto}%`)
      .order('nome', { ascending: true })
      .limit(30)

    if (error) {
      console.log('Erro a pesquisar pratos:', error)
      setPratos([])
    } else {
      setPratos((data as Prato[]) || [])
    }

    setLoading(false)
  }

  async function pesquisarPratosEdicao(termo: string) {
    const texto = termo.trim()

    if (texto.length < 2) {
      setPratosPesquisaEdicao([])
      setLoadingPesquisaEdicao(false)
      return
    }

    setLoadingPesquisaEdicao(true)

    const { data, error } = await supabase
      .from('pratos')
      .select('id, nome, sku, tamanho, peso_final, prioridade_embalamento')
      .or(`nome.ilike.%${texto}%,sku.ilike.%${texto}%`)
      .order('nome', { ascending: true })
      .limit(30)

    if (error) {
      console.log('Erro a pesquisar pratos para edição:', error)
      setPratosPesquisaEdicao([])
    } else {
      setPratosPesquisaEdicao((data as Prato[]) || [])
    }

    setLoadingPesquisaEdicao(false)
  }

  async function fetchProducoes() {
    const { data, error } = await supabase
      .from('producoes_semanais')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.log('Erro produções:', error)
    } else {
      setProducoes((data as ProducaoSemanal[]) || [])
    }
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

    if (!nomeLimpo) {
      alert('Introduz um nome válido.')
      return
    }

    setAAtualizarProducao(true)

    const { error } = await supabase
      .from('producoes_semanais')
      .update({ nome_semana: nomeLimpo })
      .eq('id', id)

    if (error) {
      console.log('Erro ao atualizar nome da produção:', error)
      alert('Erro ao atualizar o nome do plano.')
      setAAtualizarProducao(false)
      return
    }

    if (producaoSelecionada?.id === id) {
      setProducaoSelecionada({
        ...producaoSelecionada,
        nome_semana: nomeLimpo,
      })
    }

    setProducoes((prev) =>
      prev.map((prod) =>
        prod.id === id ? { ...prod, nome_semana: nomeLimpo } : prod
      )
    )

    setProducaoEmEdicaoId(null)
    setNomeEdicao('')
    setAAtualizarProducao(false)
  }

  async function apagarProducao(producao: ProducaoSemanal) {
    const confirmado = window.confirm(
      `Tens a certeza que queres apagar o plano "${producao.nome_semana}"?`
    )

    if (!confirmado) return

    setAApagarProducaoId(producao.id)

    const { error: itensError } = await supabase
      .from('producoes_semanais_itens')
      .delete()
      .eq('producao_semanal_id', producao.id)

    if (itensError) {
      console.log('Erro ao apagar itens da produção:', itensError)
      alert('Erro ao apagar os itens do plano.')
      setAApagarProducaoId(null)
      return
    }

    const { error: producaoError } = await supabase
      .from('producoes_semanais')
      .delete()
      .eq('id', producao.id)

    if (producaoError) {
      console.log('Erro ao apagar produção:', producaoError)
      alert('Erro ao apagar o plano.')
      setAApagarProducaoId(null)
      return
    }

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

    if (planoEditandoId === producao.id) {
      cancelarEdicaoItensPlano()
    }

    setProducoes((prev) => prev.filter((p) => p.id !== producao.id))
    setAApagarProducaoId(null)
  }

  async function verDetalhesProducao(producao: ProducaoSemanal) {
    setProducaoSelecionada(producao)
    setACarregarDetalhes(true)

    const { data: detalhesData, error: detalhesError } = await supabase
      .from('producoes_semanais_itens')
      .select(`
        id,
        quantidade,
        pratos (
          id,
          nome,
          sku,
          tamanho,
          peso_final,
          prioridade_embalamento
        )
      `)
      .eq('producao_semanal_id', producao.id)

    if (detalhesError) {
      console.log('Erro detalhes produção:', detalhesError)
      setDetalhesProducao([])
      setACarregarDetalhes(false)
      return
    }

    const detalhes = (detalhesData as DetalheProducao[]) || []
    setDetalhesProducao(detalhes)

    const pratoIds = detalhes
      .map((item) => Number(item.pratos?.id))
      .filter((id) => !isNaN(id))

    if (pratoIds.length === 0) {
      setIngredientesInfo([])
      setPratosComponentes([])
      setComponentesIngredientes([])
      setTarefasPreparacaoNovo([])
      setTarefasConfeccaoNovo([])
      setTarefasFinalizacaoNovo([])
      setACarregarDetalhes(false)
      return
    }

    const { data: pratosComponentesData, error: pratosComponentesError } =
      await supabase
        .from('pratos_componentes')
        .select(`
          id,
          prato_id,
          componente_id,
          quantidade_final,
          unidade,
          posicao_embalagem,
          ordem,
          componentes (
            id,
            nome,
            categoria,
            rendimento_final,
            unidade_rendimento
          )
        `)
        .in('prato_id', pratoIds)
        .order('ordem', { ascending: true })

    if (pratosComponentesError) {
      console.log('Erro pratos_componentes:', pratosComponentesError)
      setPratosComponentes([])
      setComponentesIngredientes([])
      setTarefasPreparacaoNovo([])
      setTarefasConfeccaoNovo([])
      setTarefasFinalizacaoNovo([])
      setIngredientesInfo([])
      setACarregarDetalhes(false)
      return
    }

    const pratosComponentesLista = (pratosComponentesData as PratoComponente[]) || []
    setPratosComponentes(pratosComponentesLista)

    const componenteIds = Array.from(
      new Set(
        pratosComponentesLista
          .map((item) => Number(item.componente_id))
          .filter((id) => !isNaN(id))
      )
    )

    const { data: componentesIngredientesData, error: componentesIngredientesError } =
      await supabase
        .from('componente_ingredientes')
        .select(`
          id,
          componente_id,
          ingrediente_id,
          quantidade,
          unidade,
          ingredientes (
            id,
            nome
          )
        `)
        .in('componente_id', componenteIds.length > 0 ? componenteIds : [-1])

    if (componentesIngredientesError) {
      console.log('Erro componente_ingredientes:', componentesIngredientesError)
      setComponentesIngredientes([])
    } else {
      setComponentesIngredientes(
        (componentesIngredientesData as ComponenteIngrediente[]) || []
      )
    }

    const componenteIngredienteIds = Array.from(
      new Set(
        (((componentesIngredientesData as ComponenteIngrediente[]) || [])
          .map((item) => Number(item.id))
          .filter((id) => !isNaN(id)))
      )
    )

    const { data: tarefasPreparacaoData, error: tarefasPreparacaoError } =
      await supabase
        .from('tarefas_preparacao_novo')
        .select('id, componente_ingrediente_id, ordem, tarefa, observacoes')
        .in(
          'componente_ingrediente_id',
          componenteIngredienteIds.length > 0 ? componenteIngredienteIds : [-1]
        )
        .order('ordem', { ascending: true })

    if (tarefasPreparacaoError) {
      console.log('Erro tarefas_preparacao_novo:', tarefasPreparacaoError)
      setTarefasPreparacaoNovo([])
    } else {
      setTarefasPreparacaoNovo(
        (tarefasPreparacaoData as TarefaPreparacaoNova[]) || []
      )
    }

    const { data: tarefasConfeccaoData, error: tarefasConfeccaoError } =
      await supabase
        .from('tarefas_confeccao_novo')
        .select('id, componente_id, ordem, tarefa, observacoes')
        .in('componente_id', componenteIds.length > 0 ? componenteIds : [-1])
        .order('ordem', { ascending: true })

    if (tarefasConfeccaoError) {
      console.log('Erro tarefas_confeccao_novo:', tarefasConfeccaoError)
      setTarefasConfeccaoNovo([])
    } else {
      setTarefasConfeccaoNovo(
        (tarefasConfeccaoData as TarefaConfeccaoNova[]) || []
      )
    }

    const { data: tarefasFinalizacaoData, error: tarefasFinalizacaoError } =
      await supabase
        .from('tarefas_finalizacao_novo')
        .select('id, componente_id, ordem, tarefa, observacoes')
        .in('componente_id', componenteIds.length > 0 ? componenteIds : [-1])
        .order('ordem', { ascending: true })

    if (tarefasFinalizacaoError) {
      console.log('Erro tarefas_finalizacao_novo:', tarefasFinalizacaoError)
      setTarefasFinalizacaoNovo([])
    } else {
      setTarefasFinalizacaoNovo(
        (tarefasFinalizacaoData as TarefaFinalizacaoNova[]) || []
      )
    }

    const ingredienteIds = Array.from(
      new Set(
        (((componentesIngredientesData as ComponenteIngrediente[]) || [])
          .map((item) => Number(item.ingrediente_id))
          .filter((id) => !isNaN(id)))
      )
    )

    const { data: ingredientesInfoData, error: ingredientesInfoError } =
      await supabase
        .from('ingredientes')
        .select('*')
        .in('id', ingredienteIds.length > 0 ? ingredienteIds : [-1])

    if (ingredientesInfoError) {
      console.log('Erro ingredientes:', ingredientesInfoError)
      setIngredientesInfo([])
    } else {
      setIngredientesInfo((ingredientesInfoData as IngredienteInfo[]) || [])
    }

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
      .select(`
        quantidade,
        pratos (
          id,
          nome,
          sku,
          tamanho,
          peso_final,
          prioridade_embalamento
        )
      `)
      .eq('producao_semanal_id', producao.id)

    if (error) {
      console.log('Erro ao carregar itens para edição:', error)
      alert('Erro ao carregar os itens do plano.')
      setPlanoEditandoId(null)
      return
    }

    const itensConvertidos: ItemPlanoEdicao[] = ((data as any[]) || [])
      .filter((item) => item.pratos)
      .map((item) => ({
        prato_id: Number(item.pratos.id),
        nome: item.pratos.nome,
        sku: item.pratos.sku,
        tamanho: item.pratos.tamanho,
        peso_final: Number(item.pratos.peso_final || 0),
        prioridade_embalamento:
          item.pratos.prioridade_embalamento === null ||
          item.pratos.prioridade_embalamento === undefined
            ? null
            : Number(item.pratos.prioridade_embalamento),
        quantidade: Number(item.quantidade || 0),
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

    setItensPlanoEdicao((prev) =>
      prev.map((item) =>
        item.prato_id === pratoId
          ? { ...item, quantidade: isNaN(quantidade) ? 0 : quantidade }
          : item
      )
    )
  }

  function removerItemPlanoEdicao(pratoId: number) {
    setItensPlanoEdicao((prev) =>
      prev.filter((item) => item.prato_id !== pratoId)
    )
  }

  function atualizarQuantidadeAdicionarEdicao(pratoId: number, valor: string) {
    setQuantidadesEdicaoAdicionar((prev) => ({
      ...prev,
      [pratoId]: valor,
    }))
  }

  function adicionarPratoAoPlanoEmEdicao(prato: Prato) {
    const quantidadeNumero = Number(quantidadesEdicaoAdicionar[prato.id] || '0')

    if (!quantidadeNumero || quantidadeNumero <= 0) {
      alert('Introduz uma quantidade válida.')
      return
    }

    const existe = itensPlanoEdicao.find((item) => item.prato_id === prato.id)

    if (existe) {
      setItensPlanoEdicao((prev) =>
        prev.map((item) =>
          item.prato_id === prato.id
            ? { ...item, quantidade: item.quantidade + quantidadeNumero }
            : item
        )
      )
    } else {
      setItensPlanoEdicao((prev) => [
        ...prev,
        {
          prato_id: prato.id,
          nome: prato.nome,
          sku: prato.sku,
          tamanho: prato.tamanho,
          peso_final: prato.peso_final,
          prioridade_embalamento: prato.prioridade_embalamento,
          quantidade: quantidadeNumero,
        },
      ])
    }

    setQuantidadesEdicaoAdicionar((prev) => ({
      ...prev,
      [prato.id]: '',
    }))
  }

  async function guardarItensPlanoEditado(producaoId: number) {
    if (itensPlanoEdicao.length === 0) {
      alert('O plano não pode ficar vazio.')
      return
    }

    const existemInvalidos = itensPlanoEdicao.some(
      (item) => !item.quantidade || item.quantidade <= 0
    )

    if (existemInvalidos) {
      alert('Todas as quantidades têm de ser maiores que zero.')
      return
    }

    setAGuardarItensPlano(true)

    const { error: apagarError } = await supabase
      .from('producoes_semanais_itens')
      .delete()
      .eq('producao_semanal_id', producaoId)

    if (apagarError) {
      console.log('Erro ao limpar itens antigos do plano:', apagarError)
      alert('Erro ao atualizar os itens do plano.')
      setAGuardarItensPlano(false)
      return
    }

    const novosItens = itensPlanoEdicao.map((item) => ({
      producao_semanal_id: producaoId,
      prato_id: item.prato_id,
      quantidade: item.quantidade,
    }))

    const { error: inserirError } = await supabase
      .from('producoes_semanais_itens')
      .insert(novosItens)

    if (inserirError) {
      console.log('Erro ao gravar novos itens do plano:', inserirError)
      alert('Erro ao guardar os novos itens do plano.')
      setAGuardarItensPlano(false)
      return
    }

    if (producaoSelecionada?.id === producaoId) {
      const producaoAtual = producoes.find((p) => p.id === producaoId)
      if (producaoAtual) {
        await verDetalhesProducao(producaoAtual)
      }
    }

    alert('Itens do plano atualizados com sucesso!')
    setAGuardarItensPlano(false)
    cancelarEdicaoItensPlano()
  }

  function atualizarQuantidade(pratoId: number, valor: string) {
    setQuantidades((prev) => ({
      ...prev,
      [pratoId]: valor,
    }))
  }

  function adicionarAoPlano(prato: Prato) {
    const quantidadeNumero = Number(quantidades[prato.id] || '0')

    if (!quantidadeNumero || quantidadeNumero <= 0) {
      alert('Introduz uma quantidade válida.')
      return
    }

    const existe = plano.find((item) => item.id === prato.id)

    if (existe) {
      setPlano((prev) =>
        prev.map((item) =>
          item.id === prato.id
            ? { ...item, quantidade: item.quantidade + quantidadeNumero }
            : item
        )
      )
    } else {
      setPlano([
        ...plano,
        {
          id: prato.id,
          nome: prato.nome,
          sku: prato.sku,
          tamanho: prato.tamanho,
          peso_final: prato.peso_final,
          prioridade_embalamento: prato.prioridade_embalamento,
          quantidade: quantidadeNumero,
        },
      ])
    }

    setQuantidades((prev) => ({ ...prev, [prato.id]: '' }))
  }

  function removerDoPlano(id: number) {
    setPlano((prev) => prev.filter((item) => item.id !== id))
  }

  async function guardarProducaoSemanal() {
    if (plano.length === 0) {
      alert('Plano vazio.')
      return
    }

    const nomePlano = window.prompt('Introduz o nome do plano:')

    if (nomePlano === null) return

    const nomePlanoLimpo = nomePlano.trim()

    if (!nomePlanoLimpo) {
      alert('Tens de introduzir um nome válido para o plano.')
      return
    }

    const dataHoje = obterDataHoje()

    setAGuardar(true)

    const { data: prod, error } = await supabase
      .from('producoes_semanais')
      .insert([
        {
          nome_semana: nomePlanoLimpo,
          data_inicio: dataHoje,
        },
      ])
      .select()
      .single()

    if (error) {
      console.log('Erro ao guardar produção:', error)
      alert('Erro ao guardar.')
      setAGuardar(false)
      return
    }

    const itens = plano.map((item) => ({
      producao_semanal_id: prod.id,
      prato_id: item.id,
      quantidade: item.quantidade,
    }))

    const { error: itensError } = await supabase
      .from('producoes_semanais_itens')
      .insert(itens)

    if (itensError) {
      console.log('Erro ao guardar itens da produção:', itensError)
      alert('Erro ao guardar itens da produção.')
      setAGuardar(false)
      return
    }

    alert('Guardado com sucesso!')

    setPlano([])
    setQuantidades({})
    setPesquisa('')
    setPratos([])
    fetchProducoes()
    setAGuardar(false)
  }

  function normalizarTexto(valor: string | null | undefined) {
    return String(valor || '')
      .trim()
      .toLowerCase()
  }

  function parseNumero(valor: number | string | null | undefined) {
    if (valor === null || valor === undefined || String(valor).trim() === '') {
      return 0
    }

    const numero = parseFloat(String(valor).replace(',', '.'))
    return isNaN(numero) ? 0 : numero
  }

  function formatarNumero(valor: number) {
    return Number(valor || 0).toFixed(2)
  }

  function formatarPreco(valor: number) {
    return `${formatarNumero(valor)} €`
  }

  function formatarQuantidade(valor: number, unidade: string | null) {
    const unidadeNormalizada = (unidade || '').toLowerCase()

    if (unidadeNormalizada === 'g') {
      if (valor >= 1000) {
        return `${(valor / 1000).toFixed(2)} kg`
      }
      return `${valor.toFixed(0)} g`
    }

    if (unidadeNormalizada === 'kg') {
      return `${valor.toFixed(2)} kg`
    }

    if (unidadeNormalizada === 'un') {
      return `${valor.toFixed(2)} un`
    }

    if (unidadeNormalizada === 'ml') {
      if (valor >= 1000) {
        return `${(valor / 1000).toFixed(2)} l`
      }
      return `${valor.toFixed(0)} ml`
    }

    if (unidadeNormalizada === 'l') {
      return `${valor.toFixed(2)} l`
    }

    return `${valor.toFixed(2)}${unidade ? ` ${unidade}` : ''}`
  }

  function formatarPrecoComUnidade(
    preco: number | null,
    unidadePreco: string | null
  ) {
    if (preco === null || preco === undefined || !unidadePreco) return '-'
    return `${formatarNumero(preco)} €/${unidadePreco}`
  }

  function obterInfoIngredientePorId(ingredienteId?: number | string | null) {
    if (ingredienteId === undefined || ingredienteId === null) return undefined

    return ingredientesInfo.find(
      (item) => Number(item.id) === Number(ingredienteId)
    )
  }

  function converterQuantidadeParaUnidadePreco(
    quantidade: number,
    unidadeQuantidade: string | null,
    unidadePreco: string | null
  ) {
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

  function calcularCustoIngrediente(
    quantidade: number,
    unidadeQuantidade: string | null,
    preco: number | null,
    unidadePreco: string | null
  ) {
    if (
      preco === null ||
      preco === undefined ||
      !unidadePreco ||
      !unidadeQuantidade
    ) {
      return 0
    }

    const quantidadeConvertida = converterQuantidadeParaUnidadePreco(
      quantidade,
      unidadeQuantidade,
      unidadePreco
    )

    if (!quantidadeConvertida) return 0

    return quantidadeConvertida * preco
  }

  function obterFatorUsoComponente(pratoComponente: PratoComponente) {
    const quantidadeUsadaNoPrato = parseNumero(pratoComponente.quantidade_final)
    const rendimentoBaseComponente = parseNumero(
      pratoComponente.componentes?.rendimento_final
    )

    if (!quantidadeUsadaNoPrato || !rendimentoBaseComponente) return 0

    return quantidadeUsadaNoPrato / rendimentoBaseComponente
  }

  function calcularQuantidadeIngredienteParaProducao(
    pratoComponente: PratoComponente,
    compIng: ComponenteIngrediente,
    doses: number
  ) {
    const quantidadeBaseIngrediente = parseNumero(compIng.quantidade)
    const fatorUso = obterFatorUsoComponente(pratoComponente)

    if (!quantidadeBaseIngrediente || !fatorUso || !doses) return 0

    return quantidadeBaseIngrediente * fatorUso * doses
  }

  function exportarSecaoPDF(secao: SecaoExportacao) {
    if (!producaoSelecionada) {
      alert('Primeiro seleciona uma produção na aba Produção.')
      return
    }

    setSecaoExportar(secao)

    setTimeout(() => {
      window.print()
    }, 150)
  }

  const comprasPorSetor = useMemo(() => {
    const compras: Record<string, Record<string, CompraAgrupada>> = {}

    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const doses = Number(item.quantidade || 0)

      const componentesDoPrato = pratosComponentes.filter(
        (pc) => Number(pc.prato_id) === pratoId
      )

      componentesDoPrato.forEach((pratoComponente) => {
        const ingredientesDoComponente = componentesIngredientes.filter(
          (ci) => Number(ci.componente_id) === Number(pratoComponente.componente_id)
        )

        ingredientesDoComponente.forEach((compIng) => {
          const infoIngrediente = obterInfoIngredientePorId(compIng.ingrediente_id)

          const nomeIngrediente =
            compIng.ingredientes?.nome || infoIngrediente?.nome || 'Ingrediente'

          const quantidadeCompra = calcularQuantidadeIngredienteParaProducao(
            pratoComponente,
            compIng,
            doses
          )

          const unidade = compIng.unidade || infoIngrediente?.unidade_base || null
          const categoria = infoIngrediente?.categoria || 'Outros'

          const preco =
            infoIngrediente?.preco === null || infoIngrediente?.preco === undefined
              ? null
              : parseNumero(infoIngrediente.preco)

          const unidadePreco = infoIngrediente?.unidade_preco || null

          const custoAtual = calcularCustoIngrediente(
            quantidadeCompra,
            unidade,
            preco,
            unidadePreco
          )

          if (!compras[categoria]) {
            compras[categoria] = {}
          }

          const chaveIngrediente = [
            Number(compIng.ingrediente_id) || 0,
            normalizarTexto(nomeIngrediente),
            normalizarTexto(unidade),
          ].join('|')

          if (!compras[categoria][chaveIngrediente]) {
            compras[categoria][chaveIngrediente] = {
              ingrediente_id: Number(compIng.ingrediente_id) || null,
              nome: nomeIngrediente,
              quantidade: 0,
              unidade,
              preco,
              unidade_preco: unidadePreco,
              custo_total: 0,
            }
          }

          compras[categoria][chaveIngrediente].quantidade += quantidadeCompra
          compras[categoria][chaveIngrediente].custo_total += custoAtual
        })
      })
    })

    return compras
  }, [detalhesProducao, pratosComponentes, componentesIngredientes, ingredientesInfo])

  const totalCompras = useMemo(() => {
    return Object.values(comprasPorSetor).reduce((totalSetores, setor) => {
      const totalSetor = Object.values(setor).reduce(
        (soma, item) => soma + item.custo_total,
        0
      )
      return totalSetores + totalSetor
    }, 0)
  }, [comprasPorSetor])

  const listaPreparacao = useMemo(() => {
    const agrupado: Record<
      string,
      {
        chave: string
        ingredienteNome: string
        quantidadeTotalIngrediente: number
        unidade: string | null
        pratosMap: Record<
          string,
          {
            chave: string
            pratoNome: string
            quantidadeTotalPrato: number
            unidade: string | null
            tarefasMap: Record<string, ListaPreparacaoTarefa>
          }
        >
      }
    > = {}

    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato sem nome'
      const doses = Number(item.quantidade || 0)

      const componentesDoPrato = pratosComponentes.filter(
        (pc) => Number(pc.prato_id) === pratoId
      )

      componentesDoPrato.forEach((pratoComponente) => {
        const ingredientesDoComponente = componentesIngredientes.filter(
          (ci) => Number(ci.componente_id) === Number(pratoComponente.componente_id)
        )

        ingredientesDoComponente.forEach((compIng) => {
          const tarefasDoIngrediente = tarefasPreparacaoNovo
            .filter(
              (tarefa) =>
                Number(tarefa.componente_ingrediente_id) === Number(compIng.id)
            )
            .sort((a, b) => Number(a.ordem) - Number(b.ordem))

          if (tarefasDoIngrediente.length === 0) return

          const quantidadeIngredientePrato = calcularQuantidadeIngredienteParaProducao(
            pratoComponente,
            compIng,
            doses
          )

          if (!quantidadeIngredientePrato) return

          const infoIngrediente = obterInfoIngredientePorId(compIng.ingrediente_id)
          const ingredienteNome =
            compIng.ingredientes?.nome || infoIngrediente?.nome || 'Ingrediente'
          const unidade =
            compIng.unidade || infoIngrediente?.unidade_base || null
          const nomeComponente = pratoComponente.componentes?.nome || 'Componente'

          const ingredienteKey = [
            Number(compIng.ingrediente_id) || 0,
            normalizarTexto(ingredienteNome),
            normalizarTexto(unidade),
          ].join('|')

          if (!agrupado[ingredienteKey]) {
            agrupado[ingredienteKey] = {
              chave: ingredienteKey,
              ingredienteNome,
              quantidadeTotalIngrediente: 0,
              unidade,
              pratosMap: {},
            }
          }

          agrupado[ingredienteKey].quantidadeTotalIngrediente +=
            quantidadeIngredientePrato

          const pratoKey = [
            pratoId,
            normalizarTexto(pratoNome),
            normalizarTexto(unidade),
          ].join('|')

          if (!agrupado[ingredienteKey].pratosMap[pratoKey]) {
            agrupado[ingredienteKey].pratosMap[pratoKey] = {
              chave: pratoKey,
              pratoNome,
              quantidadeTotalPrato: 0,
              unidade,
              tarefasMap: {},
            }
          }

          agrupado[ingredienteKey].pratosMap[pratoKey].quantidadeTotalPrato +=
            quantidadeIngredientePrato

          tarefasDoIngrediente.forEach((tarefa) => {
            const ordemTarefa = Number(tarefa.ordem) || 0

            const chaveTarefa = [
              ordemTarefa,
              normalizarTexto(tarefa.tarefa),
              normalizarTexto(nomeComponente),
              normalizarTexto(tarefa.observacoes || ''),
            ].join('|')

            if (!agrupado[ingredienteKey].pratosMap[pratoKey].tarefasMap[chaveTarefa]) {
              agrupado[ingredienteKey].pratosMap[pratoKey].tarefasMap[chaveTarefa] = {
                chave: chaveTarefa,
                tarefa: tarefa.tarefa,
                componente: nomeComponente,
                observacoes: tarefa.observacoes,
                quantidadeTarefa: 0,
                unidade,
                ordem: ordemTarefa,
              }
            }

            agrupado[ingredienteKey].pratosMap[pratoKey].tarefasMap[
              chaveTarefa
            ].quantidadeTarefa += quantidadeIngredientePrato
          })
        })
      })
    })

    const resultado: ListaPreparacaoIngrediente[] = Object.values(agrupado)
      .map((ingredienteGrupo) => {
        const pratos: ListaPreparacaoPrato[] = Object.values(
          ingredienteGrupo.pratosMap
        )
          .map((pratoGrupo) => ({
            chave: pratoGrupo.chave,
            pratoNome: pratoGrupo.pratoNome,
            quantidadeTotalPrato: pratoGrupo.quantidadeTotalPrato,
            unidade: pratoGrupo.unidade,
            tarefas: Object.values(pratoGrupo.tarefasMap).sort((a, b) => {
              if (a.ordem !== b.ordem) return a.ordem - b.ordem
              return a.tarefa.localeCompare(b.tarefa)
            }),
          }))
          .sort((a, b) => a.pratoNome.localeCompare(b.pratoNome))

        return {
          chave: ingredienteGrupo.chave,
          ingredienteNome: ingredienteGrupo.ingredienteNome,
          quantidadeTotalIngrediente: ingredienteGrupo.quantidadeTotalIngrediente,
          unidade: ingredienteGrupo.unidade,
          pratos,
        }
      })
      .filter((item) => item.pratos.length > 0)
      .sort((a, b) => a.ingredienteNome.localeCompare(b.ingredienteNome))

    return resultado
  }, [
    detalhesProducao,
    pratosComponentes,
    componentesIngredientes,
    tarefasPreparacaoNovo,
    ingredientesInfo,
  ])

  const listaConfeccao = useMemo(() => {
    const agrupado: Record<
      string,
      {
        chave: string
        componenteId: number
        componenteNome: string
        quantidadeTotal: number
        unidade: string | null
        prioridadeMinima: number
        prioridadesSet: Set<number>
        pratosMap: Record<string, ListaConfeccaoPrato>
        tarefasMap: Record<string, ListaConfeccaoTarefa>
      }
    > = {}

    detalhesProducao.forEach((item) => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato sem nome'
      const doses = Number(item.quantidade || 0)
      const prioridadeEmbalamento =
        item.pratos?.prioridade_embalamento === null ||
        item.pratos?.prioridade_embalamento === undefined
          ? null
          : Number(item.pratos.prioridade_embalamento)

      const componentesDoPrato = pratosComponentes
        .filter((pc) => Number(pc.prato_id) === pratoId)
        .sort((a, b) => Number(a.ordem) - Number(b.ordem))

      componentesDoPrato.forEach((pratoComponente) => {
        const componenteId = Number(pratoComponente.componente_id)
        const componenteNome = pratoComponente.componentes?.nome || 'Componente'
        const unidade = pratoComponente.unidade
        const quantidadeComponente =
          parseNumero(pratoComponente.quantidade_final) * doses

        if (!quantidadeComponente) return

        const tarefasDoComponente = tarefasConfeccaoNovo
          .filter(
            (tarefa) => Number(tarefa.componente_id) === Number(componenteId)
          )
          .sort((a, b) => Number(a.ordem) - Number(b.ordem))

        if (tarefasDoComponente.length === 0) return

        const chaveComponente = [
          componenteId,
          normalizarTexto(componenteNome),
          normalizarTexto(unidade),
        ].join('|')

        if (!agrupado[chaveComponente]) {
          agrupado[chaveComponente] = {
            chave: chaveComponente,
            componenteId,
            componenteNome,
            quantidadeTotal: 0,
            unidade,
            prioridadeMinima:
              prioridadeEmbalamento === null ? 999 : prioridadeEmbalamento,
            prioridadesSet: new Set<number>(),
            pratosMap: {},
            tarefasMap: {},
          }
        }

        agrupado[chaveComponente].quantidadeTotal += quantidadeComponente

        if (prioridadeEmbalamento !== null) {
          agrupado[chaveComponente].prioridadesSet.add(prioridadeEmbalamento)
        }

        const prioridadeAtual =
          prioridadeEmbalamento === null ? 999 : prioridadeEmbalamento

        if (prioridadeAtual < agrupado[chaveComponente].prioridadeMinima) {
          agrupado[chaveComponente].prioridadeMinima = prioridadeAtual
        }

        const chavePrato = [
          pratoId,
          normalizarTexto(pratoNome),
          normalizarTexto(unidade),
        ].join('|')

        if (!agrupado[chaveComponente].pratosMap[chavePrato]) {
          agrupado[chaveComponente].pratosMap[chavePrato] = {
            chave: chavePrato,
            pratoId,
            pratoNome,
            prioridadeEmbalamento,
            quantidadeComponente: 0,
            unidade,
          }
        }

        agrupado[chaveComponente].pratosMap[chavePrato].quantidadeComponente +=
          quantidadeComponente

        tarefasDoComponente.forEach((tarefa) => {
          const chaveTarefa = [
            Number(tarefa.id),
            Number(tarefa.ordem || 0),
            normalizarTexto(tarefa.tarefa),
            normalizarTexto(tarefa.observacoes || ''),
          ].join('|')

          if (!agrupado[chaveComponente].tarefasMap[chaveTarefa]) {
            agrupado[chaveComponente].tarefasMap[chaveTarefa] = {
              chave: chaveTarefa,
              id: tarefa.id,
              ordem: Number(tarefa.ordem) || 0,
              tarefa: tarefa.tarefa,
              observacoes: tarefa.observacoes,
            }
          }
        })
      })
    })

    return Object.values(agrupado)
      .map((grupo) => ({
        chave: grupo.chave,
        componenteId: grupo.componenteId,
        componenteNome: grupo.componenteNome,
        quantidadeTotal: grupo.quantidadeTotal,
        unidade: grupo.unidade,
        prioridadeMinima: grupo.prioridadeMinima,
        prioridades: Array.from(grupo.prioridadesSet).sort((a, b) => a - b),
        pratos: Object.values(grupo.pratosMap).sort((a, b) => {
          const prioridadeA = a.prioridadeEmbalamento ?? 999
          const prioridadeB = b.prioridadeEmbalamento ?? 999

          if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB
          return a.pratoNome.localeCompare(b.pratoNome)
        }),
        tarefas: Object.values(grupo.tarefasMap).sort((a, b) => {
          if (a.ordem !== b.ordem) return a.ordem - b.ordem
          return a.tarefa.localeCompare(b.tarefa)
        }),
      }))
      .filter((grupo) => grupo.tarefas.length > 0)
      .sort((a, b) => {
        if (a.prioridadeMinima !== b.prioridadeMinima) {
          return a.prioridadeMinima - b.prioridadeMinima
        }
        return a.componenteNome.localeCompare(b.componenteNome)
      })
  }, [detalhesProducao, pratosComponentes, tarefasConfeccaoNovo])

  const listaFinalizacao = useMemo(() => {
    return detalhesProducao.map((item) => {
      const pratoId = Number(item.pratos?.id)

      const componentesDoPrato = pratosComponentes
        .filter((pc) => Number(pc.prato_id) === pratoId)
        .sort((a, b) => Number(a.ordem) - Number(b.ordem))

      const tarefas = componentesDoPrato.flatMap((pratoComponente) => {
        const tarefasDoComponente = tarefasFinalizacaoNovo
          .filter(
            (tarefa) =>
              Number(tarefa.componente_id) === Number(pratoComponente.componente_id)
          )
          .sort((a, b) => Number(a.ordem) - Number(b.ordem))

        return tarefasDoComponente.map((tarefa) => ({
          ...tarefa,
          componenteNome: pratoComponente.componentes?.nome || 'Componente',
          quantidadeFinalComponente:
            parseNumero(pratoComponente.quantidade_final) * Number(item.quantidade),
          unidade: pratoComponente.unidade,
        }))
      })

      return {
        pratoId,
        pratoNome: item.pratos?.nome || 'Prato sem nome',
        quantidade: item.quantidade,
        tarefas,
      }
    })
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

      const componentesDoPrato = pratosComponentes
        .filter((pc) => Number(pc.prato_id) === pratoId)
        .sort((a, b) => Number(a.ordem) - Number(b.ordem))
        .map((componente) => ({
          id: componente.id,
          nome: componente.componentes?.nome || 'Componente',
          peso: parseNumero(componente.quantidade_final),
          unidade: componente.unidade,
          posicao: componente.posicao_embalagem || '-',
          ordem: Number(componente.ordem || 0),
        }))

      const chaveGrupo = normalizarTexto(pratoNome)

      if (!agrupado[chaveGrupo]) {
        agrupado[chaveGrupo] = {
          chave: chaveGrupo,
          prato: pratoNome,
          prioridade,
          tamanhos: [],
        }
      }

      agrupado[chaveGrupo].tamanhos.push({
        chave: String(item.id),
        tamanho,
        sku,
        quantidade,
        componentes: componentesDoPrato,
      })
    })

    return Object.values(agrupado)
      .map((grupo) => ({
        ...grupo,
        tamanhos: grupo.tamanhos.sort((a, b) =>
          a.tamanho.localeCompare(b.tamanho)
        ),
      }))
      .sort((a, b) => {
        const prioridadeA = a.prioridade ?? 999
        const prioridadeB = b.prioridade ?? 999

        if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB
        return a.prato.localeCompare(b.prato)
      })
  }, [detalhesProducao, pratosComponentes])

  function renderEditorItensPlano(producaoId: number) {
    const textoPesquisa = pesquisaEdicao.trim()
    const mostrarResultados = textoPesquisa.length >= 2

    return (
      <div className="mt-4 border rounded p-4 bg-gray-50">
        <h3 className="text-lg font-bold mb-4">Editar pratos do plano</h3>

        <div className="space-y-3 mb-6">
          {itensPlanoEdicao.length === 0 ? (
            <p className="text-gray-600">Ainda não há itens neste plano.</p>
          ) : (
            itensPlanoEdicao.map((item) => (
              <div
                key={item.prato_id}
                className="border rounded p-3 bg-white flex justify-between items-center gap-4"
              >
                <div className="flex-1">
                  <p className="font-semibold">{item.nome}</p>
                  <p>SKU: {item.sku}</p>
                  <p>Tamanho: {item.tamanho}</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) =>
                      atualizarQuantidadeItemPlanoEdicao(
                        item.prato_id,
                        e.target.value
                      )
                    }
                    className="w-24 border px-2 py-1 rounded bg-white text-black"
                  />
                  <button
                    onClick={() => removerItemPlanoEdicao(item.prato_id)}
                    className="bg-red-600 text-white px-3 py-2 rounded"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border rounded p-4 bg-white mb-4">
          <h4 className="font-semibold mb-3">Adicionar prato ao plano</h4>

          <input
            type="text"
            placeholder="Pesquisar prato por nome ou SKU..."
            value={pesquisaEdicao}
            onChange={(e) => setPesquisaEdicao(e.target.value)}
            className="w-full border px-3 py-2 rounded bg-white text-black placeholder-gray-500 mb-2"
          />

          <p className="text-sm text-gray-600 mb-3">
            Escreve pelo menos 2 letras para procurar pratos.
          </p>

          {!mostrarResultados ? (
            <div className="border p-4 rounded bg-gray-50">
              <p className="text-gray-600">
                Nenhum prato é mostrado até começares a pesquisar.
              </p>
            </div>
          ) : loadingPesquisaEdicao ? (
            <p>A procurar pratos...</p>
          ) : pratosPesquisaEdicao.length === 0 ? (
            <div className="border p-4 rounded bg-gray-50">
              <p className="text-gray-600">Nenhum prato encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pratosPesquisaEdicao.map((p) => (
                <div
                  key={p.id}
                  className="border p-3 rounded flex justify-between items-center gap-4 bg-gray-50"
                >
                  <div>
                    <p className="font-semibold">{p.nome}</p>
                    <p>SKU: {p.sku}</p>
                    <p>Tamanho: {p.tamanho}</p>
                    <p>Peso: {p.peso_final}g</p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={quantidadesEdicaoAdicionar[p.id] || ''}
                      onChange={(e) =>
                        atualizarQuantidadeAdicionarEdicao(
                          p.id,
                          e.target.value
                        )
                      }
                      className="w-20 border px-2 py-1 rounded bg-white text-black"
                    />
                    <button
                      onClick={() => adicionarPratoAoPlanoEmEdicao(p)}
                      style={{ backgroundColor: '#80c944' }}
                      className="text-white px-3 rounded"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => guardarItensPlanoEditado(producaoId)}
            disabled={aGuardarItensPlano}
            style={{ backgroundColor: '#80c944' }}
            className="text-white px-4 py-2 rounded"
          >
            {aGuardarItensPlano ? 'A guardar...' : 'Guardar itens'}
          </button>

          <button
            onClick={cancelarEdicaoItensPlano}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  function renderProducao() {
    const textoPesquisa = pesquisa.trim()
    const mostrarResultados = textoPesquisa.length >= 2

    return (
      <>
        <div className="border p-4 mb-6 rounded bg-gray-50">
          <input
            type="text"
            placeholder="Pesquisar prato por nome ou SKU..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="w-full border px-3 py-2 rounded bg-white text-black placeholder-gray-500"
          />
          <p className="text-sm text-gray-600 mt-2">
            Escreve pelo menos 2 letras para procurar pratos.
          </p>
        </div>

        {!mostrarResultados ? (
          <div className="border p-6 rounded mb-8 bg-gray-50">
            <p className="text-gray-600">
              Nenhum prato é mostrado até começares a pesquisar.
            </p>
          </div>
        ) : loading ? (
          <p className="mb-6">A procurar pratos...</p>
        ) : pratos.length === 0 ? (
          <div className="border p-6 rounded mb-8 bg-gray-50">
            <p className="text-gray-600">Nenhum prato encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {pratos.map((p) => (
              <div
                key={p.id}
                className="border p-4 rounded flex justify-between items-center gap-4 bg-white"
              >
                <div>
                  <p className="font-semibold">{p.nome}</p>
                  <p>SKU: {p.sku}</p>
                  <p>Tamanho: {p.tamanho}</p>
                  <p>Peso: {p.peso_final}g</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    value={quantidades[p.id] || ''}
                    onChange={(e) => atualizarQuantidade(p.id, e.target.value)}
                    className="w-20 border px-2 py-1 rounded bg-white text-black"
                  />
                  <button
                    onClick={() => adicionarAoPlano(p)}
                    style={{ backgroundColor: '#80c944' }}
                    className="text-white px-3 rounded"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border p-6 rounded mb-10 bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Plano</h2>

          {plano.length === 0 ? (
            <p className="text-gray-600">Ainda não há pratos no plano.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {plano.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center border rounded p-3 bg-white"
                >
                  <div>
                    <p className="font-semibold">{item.nome}</p>
                    <p>SKU: {item.sku}</p>
                    <p>Tamanho: {item.tamanho}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span>{item.quantidade} doses</span>
                    <button
                      onClick={() => removerDoPlano(item.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={guardarProducaoSemanal}
            disabled={aGuardar}
            style={{ backgroundColor: '#80c944' }}
            className="text-white px-5 py-2 rounded"
          >
            {aGuardar ? 'A guardar...' : 'Guardar produção'}
          </button>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">Produções guardadas</h2>

          <div className="space-y-3">
            {producoes.map((p) => (
              <div key={p.id} className="border p-4 rounded bg-white">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    {producaoEmEdicaoId === p.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={nomeEdicao}
                          onChange={(e) => setNomeEdicao(e.target.value)}
                          className="w-full border px-3 py-2 rounded bg-white text-black"
                        />
                        <p>{p.data_inicio}</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold">{p.nome_semana}</p>
                        <p>{p.data_inicio}</p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    {producaoEmEdicaoId === p.id ? (
                      <>
                        <button
                          onClick={() => guardarNovoNomeProducao(p.id)}
                          disabled={aAtualizarProducao}
                          style={{ backgroundColor: '#80c944' }}
                          className="text-white px-4 py-2 rounded"
                        >
                          {aAtualizarProducao ? 'A guardar...' : 'Guardar nome'}
                        </button>

                        <button
                          onClick={cancelarEdicaoProducao}
                          className="bg-gray-500 text-white px-4 py-2 rounded"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => verDetalhesProducao(p)}
                          style={{ backgroundColor: '#80c944' }}
                          className="text-white px-4 py-2 rounded"
                        >
                          Ver detalhes
                        </button>

                        <button
                          onClick={() => iniciarEdicaoProducao(p)}
                          className="bg-blue-600 text-white px-4 py-2 rounded"
                        >
                          Renomear
                        </button>

                        <button
                          onClick={() => iniciarEdicaoItensPlano(p)}
                          className="bg-yellow-500 text-white px-4 py-2 rounded"
                        >
                          Editar itens
                        </button>

                        <button
                          onClick={() => apagarProducao(p)}
                          disabled={aApagarProducaoId === p.id}
                          className="bg-red-600 text-white px-4 py-2 rounded"
                        >
                          {aApagarProducaoId === p.id ? 'A apagar...' : 'Apagar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {planoEditandoId === p.id && renderEditorItensPlano(p.id)}
              </div>
            ))}
          </div>
        </div>

        {producaoSelecionada && (
          <div className="border p-6 rounded bg-gray-50">
            <h2 className="text-xl font-bold mb-4">
              Detalhes: {producaoSelecionada.nome_semana}
            </h2>

            {aCarregarDetalhes ? (
              <p>A carregar detalhes...</p>
            ) : detalhesProducao.length === 0 ? (
              <p className="text-gray-600">Sem itens nesta produção.</p>
            ) : (
              <div className="space-y-3">
                {detalhesProducao.map((item) => (
                  <div
                    key={item.id}
                    className="border p-4 rounded bg-white flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.pratos?.nome || 'Prato sem nome'}
                      </p>
                      <p>SKU: {item.pratos?.sku || '-'}</p>
                      <p>Tamanho: {item.pratos?.tamanho || '-'}</p>
                    </div>

                    <div>
                      <p className="font-semibold">{item.quantidade} doses</p>
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
          <p className="text-gray-600">
            Primeiro seleciona uma produção na aba Produção.
          </p>
        ) : Object.keys(comprasPorSetor).length === 0 ? (
          <p className="text-gray-600">Sem dados de compras ainda.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(comprasPorSetor).map(([categoria, itens]) => {
              const totalSetor = Object.values(itens).reduce(
                (soma, item) => soma + item.custo_total,
                0
              )

              return (
                <div key={categoria}>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold">{categoria}</h3>
                    <p className="font-semibold">
                      Total setor: {formatarPreco(totalSetor)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {Object.values(itens).map((info) => (
                      <div
                        key={`${info.ingrediente_id ?? info.nome}-${info.unidade ?? 'sem-unidade'}`}
                        className="border py-3 bg-white px-3 rounded"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-semibold">{info.nome}</p>
                            <p className="text-sm text-gray-600">
                              Quantidade:{' '}
                              {formatarQuantidade(info.quantidade, info.unidade)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Preço:{' '}
                              {formatarPrecoComUnidade(
                                info.preco,
                                info.unidade_preco
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm text-gray-600">Custo</p>
                            <p className="font-bold">
                              {formatarPreco(info.custo_total)}
                            </p>
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
          <p className="text-gray-600">
            Primeiro seleciona uma produção na aba Produção.
          </p>
        ) : listaPreparacao.length === 0 ? (
          <p className="text-gray-600">
            Ainda não existem tarefas de preparação para esta produção.
          </p>
        ) : (
          <div className="space-y-6">
            {listaPreparacao.map((grupo) => (
              <div key={grupo.chave} className="border rounded p-5 bg-white">
                <div className="mb-5 border-b pb-4">
                  <p className="text-xl font-bold">{grupo.ingredienteNome}</p>
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>Quantidade total do ingrediente:</strong>{' '}
                    {formatarQuantidade(
                      grupo.quantidadeTotalIngrediente,
                      grupo.unidade
                    )}
                  </p>
                </div>

                <div className="space-y-5">
                  {grupo.pratos.map((prato) => (
                    <div
                      key={prato.chave}
                      className="border rounded p-4 bg-gray-50"
                    >
                      <div className="mb-4">
                        <p className="font-semibold text-lg">
                          Para o prato: {prato.pratoNome}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          <strong>Quantidade deste ingrediente para este prato:</strong>{' '}
                          {formatarQuantidade(
                            prato.quantidadeTotalPrato,
                            prato.unidade
                          )}
                        </p>
                      </div>

                      {prato.tarefas.length === 0 ? (
                        <p className="text-gray-500">Sem tarefas.</p>
                      ) : (
                        <div className="space-y-3">
                          {prato.tarefas.map((tarefa) => (
                            <div
                              key={tarefa.chave}
                              className="border-b pb-3 last:border-b-0 last:pb-0"
                            >
                              <p>
                                <strong>Ordem:</strong> {tarefa.ordem || '-'}
                              </p>
                              <p>
                                <strong>Tarefa:</strong> {tarefa.tarefa}
                              </p>
                              <p>
                                <strong>Componente:</strong> {tarefa.componente}
                              </p>
                              <p>
                                <strong>Quantidade para esta tarefa:</strong>{' '}
                                {formatarQuantidade(
                                  tarefa.quantidadeTarefa,
                                  tarefa.unidade
                                )}
                              </p>
                              {tarefa.observacoes && (
                                <p>
                                  <strong>Obs:</strong> {tarefa.observacoes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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
          <p className="text-gray-600">
            Primeiro seleciona uma produção na aba Produção.
          </p>
        ) : listaConfeccao.length === 0 ? (
          <p className="text-gray-600">
            Ainda não existem tarefas de confeção para esta produção.
          </p>
        ) : (
          <div className="space-y-6">
            {listaConfeccao.map((bloco) => (
              <div key={bloco.chave} className="border rounded p-5 bg-white">
                <div className="mb-5 border-b pb-4">
                  <p className="text-2xl font-bold">{bloco.componenteNome}</p>
                  <p className="text-lg font-bold text-green-700 mt-2">
                    Quantidade total a produzir:{' '}
                    {formatarQuantidade(bloco.quantidadeTotal, bloco.unidade)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Prioridades de embalamento:</strong>{' '}
                    {bloco.prioridades.length > 0
                      ? bloco.prioridades.join(', ')
                      : '-'}
                  </p>
                </div>

                <div className="mb-5">
                  <h3 className="text-lg font-semibold mb-3">
                    Pratos que usam este componente
                  </h3>

                  <div className="space-y-2">
                    {bloco.pratos.map((prato) => (
                      <div
                        key={prato.chave}
                        className="border rounded p-3 bg-gray-50"
                      >
                        <p className="font-semibold">{prato.pratoNome}</p>
                        <p>
                          <strong>Quantidade deste componente para o prato:</strong>{' '}
                          {formatarQuantidade(
                            prato.quantidadeComponente,
                            prato.unidade
                          )}
                        </p>
                        <p>
                          <strong>Prioridade de embalamento do prato:</strong>{' '}
                          {prato.prioridadeEmbalamento ?? '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Tarefas de confeção
                  </h3>

                  <div className="space-y-2">
                    {bloco.tarefas.map((tarefa) => (
                      <div key={tarefa.chave} className="border-b pb-2">
                        <p>
                          <strong>Ordem:</strong> {tarefa.ordem || '-'}
                        </p>
                        <p>
                          <strong>Tarefa:</strong> {tarefa.tarefa}
                        </p>
                        {tarefa.observacoes && (
                          <p>
                            <strong>Obs:</strong> {tarefa.observacoes}
                          </p>
                        )}
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
          <p className="text-gray-600">
            Primeiro seleciona uma produção na aba Produção.
          </p>
        ) : listaFinalizacao.every((bloco) => bloco.tarefas.length === 0) ? (
          <p className="text-gray-600">Sem tarefas de finalização.</p>
        ) : (
          <div className="space-y-6">
            {listaFinalizacao.map((bloco) => (
              <div key={bloco.pratoId} className="border rounded p-4 bg-white">
                <p className="font-semibold mb-1">{bloco.pratoNome}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {bloco.quantidade} doses
                </p>

                {bloco.tarefas.length === 0 ? (
                  <p className="text-gray-500">Sem tarefas de finalização.</p>
                ) : (
                  <div className="space-y-2">
                    {bloco.tarefas.map((tarefa) => (
                      <div key={tarefa.id} className="border-b pb-2">
                        <p>
                          <strong>Componente:</strong> {tarefa.componenteNome}
                        </p>
                        <p>
                          <strong>Tarefa:</strong> {tarefa.tarefa}
                        </p>
                        <p>
                          <strong>Quantidade final do componente:</strong>{' '}
                          {formatarQuantidade(
                            tarefa.quantidadeFinalComponente,
                            tarefa.unidade
                          )}
                        </p>
                        {tarefa.observacoes && (
                          <p>
                            <strong>Obs:</strong> {tarefa.observacoes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
          <p className="text-gray-600">
            Primeiro seleciona uma produção na aba Produção.
          </p>
        ) : listaEmbalamento.length === 0 ? (
          <p className="text-gray-600">Sem dados de embalamento.</p>
        ) : (
          <div className="space-y-6">
            {listaEmbalamento.map((grupo) => (
              <div key={grupo.chave} className="border rounded p-5 bg-white">
                <div className="mb-4 border-b pb-4">
                  <p className="text-xl font-bold">{grupo.prato}</p>
                  <p>
                    <strong>Prioridade de embalamento:</strong>{' '}
                    {grupo.prioridade ?? '-'}
                  </p>
                </div>

                <div className="space-y-5">
                  {grupo.tamanhos.map((linha) => (
                    <div
                      key={linha.chave}
                      className="border rounded p-4 bg-gray-50"
                    >
                      <div className="mb-4">
                        <p className="text-2xl font-extrabold text-green-700">
                          Tamanho: {linha.tamanho}
                        </p>
                        <p>
                          <strong>SKU:</strong> {linha.sku}
                        </p>
                        <p>
                          <strong>Quantidade:</strong> {linha.quantidade}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {linha.componentes.map((componente) => (
                          <div
                            key={componente.id}
                            className="border-2 border-green-200 rounded p-4 bg-green-50"
                          >
                            <p className="font-semibold text-lg mb-2">
                              {componente.nome}
                            </p>
                            <p>
                              <strong>Peso:</strong>{' '}
                              {formatarQuantidade(
                                componente.peso,
                                componente.unidade
                              )}
                            </p>
                            <p>
                              <strong>Posição na embalagem:</strong>{' '}
                              {componente.posicao}
                            </p>
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
            <p>
              <strong>Plano:</strong> {producaoSelecionada.nome_semana}
            </p>
            <p>
              <strong>Data:</strong> {producaoSelecionada.data_inicio}
            </p>
          </div>

          {secaoExportar === 'compras' && (
            <div className="print-section">
              {Object.keys(comprasPorSetor).length === 0 ? (
                <p>Sem dados de compras.</p>
              ) : (
                Object.entries(comprasPorSetor).map(([categoria, itens]) => (
                  <div key={categoria} className="print-block">
                    <h2>{categoria}</h2>
                    <table className="print-table">
                      <thead>
                        <tr>
                          <th>Ingrediente</th>
                          <th>Quantidade</th>
                          <th>Preço</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(itens).map((info) => (
                          <tr
                            key={`${info.ingrediente_id ?? info.nome}-${info.unidade ?? 'sem-unidade'}`}
                          >
                            <td>{info.nome}</td>
                            <td>{formatarQuantidade(info.quantidade, info.unidade)}</td>
                            <td>
                              {formatarPrecoComUnidade(
                                info.preco,
                                info.unidade_preco
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {secaoExportar === 'preparacao' && (
            <div className="print-section">
              {listaPreparacao.length === 0 ? (
                <p>Sem dados de preparação.</p>
              ) : (
                listaPreparacao.map((grupo) => (
                  <div key={grupo.chave} className="print-block">
                    <h2>{grupo.ingredienteNome}</h2>
                    <p className="print-subtitle">
                      Quantidade total:{' '}
                      {formatarQuantidade(
                        grupo.quantidadeTotalIngrediente,
                        grupo.unidade
                      )}
                    </p>

                    {grupo.pratos.map((prato) => (
                      <div key={prato.chave} className="print-subblock">
                        <h3>{prato.pratoNome}</h3>
                        <p>
                          Quantidade:{' '}
                          {formatarQuantidade(
                            prato.quantidadeTotalPrato,
                            prato.unidade
                          )}
                        </p>

                        <table className="print-table">
                          <thead>
                            <tr>
                              <th>Ordem</th>
                              <th>Tarefa</th>
                              <th>Componente</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prato.tarefas.map((tarefa) => (
                              <tr key={tarefa.chave}>
                                <td>{tarefa.ordem || '-'}</td>
                                <td>{tarefa.tarefa}</td>
                                <td>{tarefa.componente}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {secaoExportar === 'confeccao' && (
            <div className="print-section">
              {listaConfeccao.length === 0 ? (
                <p>Sem dados de confeção.</p>
              ) : (
                listaConfeccao.map((bloco) => (
                  <div key={bloco.chave} className="print-block">
                    <h2>{bloco.componenteNome}</h2>
                    <p className="print-subtitle">
                      <strong>Quantidade total a produzir:</strong>{' '}
                      {formatarQuantidade(bloco.quantidadeTotal, bloco.unidade)}
                    </p>
                    <p className="print-subtitle">
                      <strong>Prioridade de embalamento:</strong>{' '}
                      {bloco.prioridades.length > 0
                        ? bloco.prioridades.join(', ')
                        : '-'}
                    </p>

                    <table className="print-table">
                      <thead>
                        <tr>
                          <th>Ordem</th>
                          <th>Tarefa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloco.tarefas.map((tarefa) => (
                          <tr key={tarefa.chave}>
                            <td>{tarefa.ordem || '-'}</td>
                            <td>{tarefa.tarefa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {secaoExportar === 'finalizacao' && (
            <div className="print-section">
              {listaFinalizacao.every((bloco) => bloco.tarefas.length === 0) ? (
                <p>Sem dados de finalização.</p>
              ) : (
                listaFinalizacao.map((bloco) => (
                  <div key={bloco.pratoId} className="print-block">
                    <h2>{bloco.pratoNome}</h2>
                    <p className="print-subtitle">{bloco.quantidade} doses</p>

                    <table className="print-table">
                      <thead>
                        <tr>
                          <th>Componente</th>
                          <th>Tarefa</th>
                          <th>Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloco.tarefas.length === 0 ? (
                          <tr>
                            <td colSpan={3}>Sem tarefas de finalização.</td>
                          </tr>
                        ) : (
                          bloco.tarefas.map((tarefa) => (
                            <tr key={tarefa.id}>
                              <td>{tarefa.componenteNome}</td>
                              <td>{tarefa.tarefa}</td>
                              <td>
                                {formatarQuantidade(
                                  tarefa.quantidadeFinalComponente,
                                  tarefa.unidade
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {secaoExportar === 'embalamento' && (
            <div className="print-section">
              {listaEmbalamento.length === 0 ? (
                <p>Sem dados de embalamento.</p>
              ) : (
                listaEmbalamento.map((grupo) => (
                  <div key={grupo.chave} className="print-block">
                    <h2>{grupo.prato}</h2>
                    <p className="print-subtitle">
                      Prioridade de embalamento: {grupo.prioridade ?? '-'}
                    </p>

                    {grupo.tamanhos.map((linha) => (
                      <div key={linha.chave} className="print-subblock">
                        <h3>Tamanho: {linha.tamanho}</h3>
                        <p>SKU: {linha.sku}</p>
                        <p>Quantidade: {linha.quantidade}</p>

                        <table className="print-table">
                          <thead>
                            <tr>
                              <th>Componente</th>
                              <th>Peso</th>
                              <th>Posição</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linha.componentes.map((componente) => (
                              <tr key={componente.id}>
                                <td>{componente.nome}</td>
                                <td>
                                  {formatarQuantidade(
                                    componente.peso,
                                    componente.unidade
                                  )}
                                </td>
                                <td>{componente.posicao}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="no-print min-h-screen bg-white text-black p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestão Cozinha Industrial</h1>

          <div className="flex gap-3 flex-wrap justify-end">
            <div className="relative group">
              <button
                className="text-white px-4 py-2 rounded font-medium flex items-center gap-2"
                style={{ backgroundColor: '#2563eb' }}
              >
                Ingredientes ▾
              </button>

              <div className="absolute right-0 top-full w-52 bg-white border rounded shadow-md hidden group-hover:block z-50">
                <Link
                  href="/ingredientes/novo"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Novo ingrediente
                </Link>
                <Link
                  href="/ingredientes/editar"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Editar ingredientes
                </Link>
              </div>
            </div>

            <div className="relative group">
              <button
                className="text-white px-4 py-2 rounded font-medium flex items-center gap-2"
                style={{ backgroundColor: '#16a34a' }}
              >
                Componentes ▾
              </button>

              <div className="absolute right-0 top-full w-52 bg-white border rounded shadow-md hidden group-hover:block z-50">
                <Link
                  href="/componentes/novo"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Novo componente
                </Link>
                <Link
                  href="/componentes/editar"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Editar componentes
                </Link>
              </div>
            </div>

            <div className="relative group">
              <button
                className="text-white px-4 py-2 rounded font-medium flex items-center gap-2"
                style={{ backgroundColor: '#80c944' }}
              >
                Pratos ▾
              </button>

              <div className="absolute right-0 top-full w-52 bg-white border rounded shadow-md hidden group-hover:block z-50">
                <Link
                  href="/pratos/novo"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Novo prato
                </Link>
                <Link
                  href="/pratos/editar"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Editar pratos
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setAbaAtiva('producao')}
            style={{
              backgroundColor: abaAtiva === 'producao' ? '#80c944' : '#e5e7eb',
              color: abaAtiva === 'producao' ? '#ffffff' : '#000000',
            }}
            className="px-4 py-2 rounded font-medium"
          >
            Produção
          </button>

          <button
            onClick={() => setAbaAtiva('compras')}
            style={{
              backgroundColor: abaAtiva === 'compras' ? '#80c944' : '#e5e7eb',
              color: abaAtiva === 'compras' ? '#ffffff' : '#000000',
            }}
            className="px-4 py-2 rounded font-medium"
          >
            Compras
          </button>

          <button
            onClick={() => setAbaAtiva('preparacao')}
            style={{
              backgroundColor: abaAtiva === 'preparacao' ? '#80c944' : '#e5e7eb',
              color: abaAtiva === 'preparacao' ? '#ffffff' : '#000000',
            }}
            className="px-4 py-2 rounded font-medium"
          >
            Preparação
          </button>

          <button
            onClick={() => setAbaAtiva('confeccao')}
            style={{
              backgroundColor: abaAtiva === 'confeccao' ? '#80c944' : '#e5e7eb',
              color: abaAtiva === 'confeccao' ? '#ffffff' : '#000000',
            }}
            className="px-4 py-2 rounded font-medium"
          >
            Confeção
          </button>

          <button
            onClick={() => setAbaAtiva('finalizacao')}
            style={{
              backgroundColor: abaAtiva === 'finalizacao' ? '#80c944' : '#e5e7eb',
              color: abaAtiva === 'finalizacao' ? '#ffffff' : '#000000',
            }}
            className="px-4 py-2 rounded font-medium"
          >
            Finalização
          </button>

          <button
            onClick={() => setAbaAtiva('embalamento')}
            style={{
              backgroundColor: abaAtiva === 'embalamento' ? '#80c944' : '#e5e7eb',
              color: abaAtiva === 'embalamento' ? '#ffffff' : '#000000',
            }}
            className="px-4 py-2 rounded font-medium"
          >
            Embalamento
          </button>
        </div>

        <div className="border rounded p-4 bg-gray-50 mb-8">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-semibold mr-2">Exportar PDF:</span>

            <button
              onClick={() => exportarSecaoPDF('compras')}
              className="bg-gray-800 text-white px-4 py-2 rounded"
            >
              Compras
            </button>

            <button
              onClick={() => exportarSecaoPDF('preparacao')}
              className="bg-gray-800 text-white px-4 py-2 rounded"
            >
              Preparação
            </button>

            <button
              onClick={() => exportarSecaoPDF('confeccao')}
              className="bg-gray-800 text-white px-4 py-2 rounded"
            >
              Confeção
            </button>

            <button
              onClick={() => exportarSecaoPDF('finalizacao')}
              className="bg-gray-800 text-white px-4 py-2 rounded"
            >
              Finalização
            </button>

            <button
              onClick={() => exportarSecaoPDF('embalamento')}
              className="bg-gray-800 text-white px-4 py-2 rounded"
            >
              Embalamento
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-3">
            Seleciona primeiro uma produção e depois escolhe a lista que queres
            exportar em formato A4.
          </p>
        </div>

        {abaAtiva === 'producao' && renderProducao()}
        {abaAtiva === 'compras' && renderCompras()}
        {abaAtiva === 'preparacao' && renderPreparacao()}
        {abaAtiva === 'confeccao' && renderConfeccao()}
        {abaAtiva === 'finalizacao' && renderFinalizacao()}
        {abaAtiva === 'embalamento' && renderEmbalamento()}
      </main>

      {renderAreaImpressao()}

      <style jsx global>{`
        .print-area {
          display: none;
        }

        @page {
          size: A4;
          margin: 10mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-area {
            display: block !important;
          }

          .print-page {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.35;
            color: #000;
          }

          .print-header {
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000;
          }

          .print-header h1 {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 6px 0;
          }

          .print-header p {
            margin: 2px 0;
          }

          .print-section {
            width: 100%;
          }

          .print-block {
            margin-bottom: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1px solid #999;
            padding: 8px;
          }

          .print-subblock {
            margin-top: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-block h2 {
            font-size: 14px;
            margin: 0 0 4px 0;
            font-weight: 700;
          }

          .print-subblock h3 {
            font-size: 12px;
            margin: 0 0 4px 0;
            font-weight: 700;
          }

          .print-subtitle {
            margin: 0 0 8px 0;
            font-size: 11px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #666;
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
          }

          .print-table th {
            font-weight: 700;
            background: #f1f1f1 !important;
          }
        }
      `}</style>
    </>
  )
}