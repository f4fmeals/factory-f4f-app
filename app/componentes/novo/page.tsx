'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Ingrediente = {
  id: number
  nome: string
}

type ComponenteIngredienteForm = {
  idLocal: string
  ingrediente_id: string
  quantidade: string
  unidade: string
  observacoes: string
}

type TarefaPreparacaoForm = {
  idLocal: string
  ingrediente_id: string
  ordem: string
  tarefa: string
  observacoes: string
}

type TarefaComponenteForm = {
  idLocal: string
  ordem: string
  tarefa: string
  observacoes: string
}

type ComponenteCriado = {
  id: number
  nome: string
  rendimento_final: number | null
  unidade_rendimento: string | null
}

type ComponenteIngredienteCriado = {
  id: number
  componente_id: number
  ingrediente_id: number
}

type ComponentePesquisa = {
  id: number
  nome: string
  rendimento_final: number | null
  unidade_rendimento: string | null
}

function gerarIdLocal() {
  return Math.random().toString(36).slice(2) + Date.now().toString()
}

function formatarNomeIngrediente(ingrediente?: Ingrediente | null) {
  if (!ingrediente) return ''
  return ingrediente.nome
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

type IngredientSearchSelectProps = {
  ingredientes: Ingrediente[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

function IngredientSearchSelect({
  ingredientes,
  value,
  onChange,
  placeholder = 'Pesquisar ingrediente...',
  disabled = false,
}: IngredientSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const ingredienteSelecionado = useMemo(
    () => ingredientes.find((item) => String(item.id) === String(value)),
    [ingredientes, value]
  )

  const debouncedQuery = useDebouncedValue(query, 300)

  useEffect(() => {
    if (ingredienteSelecionado && !isOpen) {
      setQuery(formatarNomeIngrediente(ingredienteSelecionado))
    }
    if (!value && !isOpen) {
      setQuery('')
    }
  }, [ingredienteSelecionado, value, isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false)

        if (ingredienteSelecionado) {
          setQuery(formatarNomeIngrediente(ingredienteSelecionado))
        } else {
          setQuery('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ingredienteSelecionado])

  const ingredientesFiltrados = useMemo(() => {
    const termo = debouncedQuery.trim().toLowerCase()

    if (!termo) {
      return ingredientes.slice(0, 20)
    }

    return ingredientes
      .filter((item) => {
        const nome = item.nome?.toLowerCase() || ''
        return nome.includes(termo)
      })
      .slice(0, 20)
  }, [ingredientes, debouncedQuery])

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          if (disabled) return
          setIsOpen(true)
          if (ingredienteSelecionado) {
            setQuery('')
          }
        }}
        onChange={(e) => {
          if (disabled) return
          setQuery(e.target.value)
          setIsOpen(true)

          if (value) {
            onChange('')
          }
        }}
        className="w-full border px-3 py-2 rounded bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        autoComplete="off"
      />

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded border bg-white shadow-lg max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange('')
              setQuery('')
              setIsOpen(false)
            }}
            className="block w-full text-left px-3 py-2 hover:bg-gray-100 border-b"
          >
            Limpar seleção
          </button>

          {debouncedQuery !== query && (
            <div className="px-3 py-2 text-sm text-gray-500 border-b">
              A aguardar a digitação...
            </div>
          )}

          {debouncedQuery === query && ingredientesFiltrados.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              Nenhum ingrediente encontrado.
            </div>
          )}

          {debouncedQuery === query &&
            ingredientesFiltrados.map((ing) => (
              <button
                key={ing.id}
                type="button"
                onClick={() => {
                  onChange(String(ing.id))
                  setQuery(formatarNomeIngrediente(ing))
                  setIsOpen(false)
                }}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                {formatarNomeIngrediente(ing)}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

const unidades = ['g', 'kg', 'ml', 'l', 'un']

export default function NovoComponentePage() {
  const [nome, setNome] = useState('')
  const [rendimentoFinal, setRendimentoFinal] = useState('')
  const [unidadeRendimento, setUnidadeRendimento] = useState('g')

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loadingIngredientes, setLoadingIngredientes] = useState(true)

  const [componentesIngredientes, setComponentesIngredientes] = useState<
    ComponenteIngredienteForm[]
  >([
    {
      idLocal: gerarIdLocal(),
      ingrediente_id: '',
      quantidade: '',
      unidade: 'g',
      observacoes: '',
    },
  ])

  const [tarefasPreparacao, setTarefasPreparacao] = useState<
    TarefaPreparacaoForm[]
  >([
    {
      idLocal: gerarIdLocal(),
      ingrediente_id: '',
      ordem: '',
      tarefa: '',
      observacoes: '',
    },
  ])

  const [tarefasConfeccao, setTarefasConfeccao] = useState<TarefaComponenteForm[]>(
    [
      {
        idLocal: gerarIdLocal(),
        ordem: '',
        tarefa: '',
        observacoes: '',
      },
    ]
  )

  const [tarefasFinalizacao, setTarefasFinalizacao] = useState<
    TarefaComponenteForm[]
  >([
    {
      idLocal: gerarIdLocal(),
      ordem: '',
      tarefa: '',
      observacoes: '',
    },
  ])

  const [aGuardar, setAGuardar] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [pesquisaComponente, setPesquisaComponente] = useState('')
  const [resultadosPesquisa, setResultadosPesquisa] = useState<ComponentePesquisa[]>([])
  const [loadingPesquisa, setLoadingPesquisa] = useState(false)
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false)
  const pesquisaWrapperRef = useRef<HTMLDivElement | null>(null)
  const pesquisaDebounced = useDebouncedValue(pesquisaComponente, 300)

  const [ingredientesPreparacaoRemovidos, setIngredientesPreparacaoRemovidos] =
    useState<string[]>([])

  useEffect(() => {
    fetchIngredientes()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pesquisaWrapperRef.current &&
        event.target instanceof Node &&
        !pesquisaWrapperRef.current.contains(event.target)
      ) {
        setMostrarPesquisa(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    async function fetchComponentesPesquisa() {
      const termo = pesquisaDebounced.trim()

      if (!termo) {
        setResultadosPesquisa([])
        setLoadingPesquisa(false)
        return
      }

      setLoadingPesquisa(true)

      const { data, error } = await supabase
        .from('componentes')
        .select('id, nome, rendimento_final, unidade_rendimento')
        .ilike('nome', `%${termo}%`)
        .order('nome', { ascending: true })
        .limit(8)

      if (error) {
        console.log('Erro ao pesquisar componentes:', error)
        setResultadosPesquisa([])
      } else {
        setResultadosPesquisa((data as ComponentePesquisa[]) || [])
      }

      setLoadingPesquisa(false)
    }

    fetchComponentesPesquisa()
  }, [pesquisaDebounced])

  useEffect(() => {
    const ingredienteIdsAtuais = Array.from(
      new Set(
        componentesIngredientes
          .map((item) => item.ingrediente_id)
          .filter((id) => id && id.trim() !== '')
      )
    )

    setTarefasPreparacao((prev) => {
      const tarefasFiltradas = prev.filter((item) => {
        if (!item.ingrediente_id) return true
        return ingredienteIdsAtuais.includes(item.ingrediente_id)
      })

      const ingredienteIdsJaNasTarefas = new Set(
        tarefasFiltradas
          .map((item) => item.ingrediente_id)
          .filter((id) => id && id.trim() !== '')
      )

      const novos = ingredienteIdsAtuais
        .filter(
          (id) =>
            !ingredienteIdsJaNasTarefas.has(id) &&
            !ingredientesPreparacaoRemovidos.includes(id)
        )
        .map((ingrediente_id) => ({
          idLocal: gerarIdLocal(),
          ingrediente_id,
          ordem: '',
          tarefa: '',
          observacoes: '',
        }))

      const resultado = [...tarefasFiltradas, ...novos]

      return resultado.length > 0
        ? resultado
        : [
            {
              idLocal: gerarIdLocal(),
              ingrediente_id: '',
              ordem: '',
              tarefa: '',
              observacoes: '',
            },
          ]
    })
  }, [componentesIngredientes])

  async function fetchIngredientes() {
    setLoadingIngredientes(true)
    setMensagem('')

    const { data, error } = await supabase
      .from('ingredientes')
      .select('id, nome')
      .order('nome', { ascending: true })

    if (error) {
      console.log('Erro ao carregar ingredientes:', error)
      setIngredientes([])
      setMensagem(`Erro ao carregar ingredientes: ${error.message}`)
    } else {
      setIngredientes((data as Ingrediente[]) || [])
    }

    setLoadingIngredientes(false)
  }

  function limparFormulario() {
    setNome('')
    setRendimentoFinal('')
    setUnidadeRendimento('g')
    setMensagem('')
    setPesquisaComponente('')
    setResultadosPesquisa([])
    setMostrarPesquisa(false)
    setIngredientesPreparacaoRemovidos([])

    setComponentesIngredientes([
      {
        idLocal: gerarIdLocal(),
        ingrediente_id: '',
        quantidade: '',
        unidade: 'g',
        observacoes: '',
      },
    ])

    setTarefasPreparacao([
      {
        idLocal: gerarIdLocal(),
        ingrediente_id: '',
        ordem: '',
        tarefa: '',
        observacoes: '',
      },
    ])

    setTarefasConfeccao([
      {
        idLocal: gerarIdLocal(),
        ordem: '',
        tarefa: '',
        observacoes: '',
      },
    ])

    setTarefasFinalizacao([
      {
        idLocal: gerarIdLocal(),
        ordem: '',
        tarefa: '',
        observacoes: '',
      },
    ])
  }

  function validarFormulario() {
    if (!nome.trim()) return 'O nome do componente é obrigatório.'

    if (!rendimentoFinal.trim() || Number(rendimentoFinal) <= 0) {
      return 'O rendimento final tem de ser maior que 0.'
    }

    if (!unidadeRendimento.trim()) {
      return 'A unidade do rendimento final é obrigatória.'
    }

    const ingredientesPreenchidos = componentesIngredientes.filter(
      (item) =>
        item.ingrediente_id ||
        item.quantidade.trim() ||
        item.unidade.trim() ||
        item.observacoes.trim()
    )

    if (ingredientesPreenchidos.length === 0) {
      return 'Tens de adicionar pelo menos um ingrediente ao componente.'
    }

    for (const item of ingredientesPreenchidos) {
      if (!item.ingrediente_id) {
        return 'Todos os ingredientes do componente têm de ter um ingrediente selecionado.'
      }

      if (!item.quantidade.trim() || Number(item.quantidade) <= 0) {
        return 'Todos os ingredientes do componente têm de ter quantidade maior que 0.'
      }

      if (!item.unidade.trim()) {
        return 'Todos os ingredientes do componente têm de ter unidade.'
      }
    }

    return ''
  }

  async function guardarComponente() {
    setMensagem('')

    const erroValidacao = validarFormulario()
    if (erroValidacao) {
      setMensagem(erroValidacao)
      return
    }

    setAGuardar(true)

    try {
      const nomeLimpo = nome.trim()

      console.log('--- INÍCIO guardarComponente ---')
      console.log('nome', nomeLimpo)
      console.log('rendimentoFinal', rendimentoFinal)
      console.log('unidadeRendimento', unidadeRendimento)
      console.log('componentesIngredientes', componentesIngredientes)
      console.log('tarefasPreparacao', tarefasPreparacao)
      console.log('tarefasConfeccao', tarefasConfeccao)
      console.log('tarefasFinalizacao', tarefasFinalizacao)

      const { data: componenteExistente, error: erroComponenteExistente } =
        await supabase
          .from('componentes')
          .select('id, nome')
          .ilike('nome', nomeLimpo)
          .maybeSingle()

      console.log('componenteExistente', componenteExistente)
      console.log('erroComponenteExistente', erroComponenteExistente)

      if (erroComponenteExistente) {
        setMensagem(`Erro ao verificar componente: ${erroComponenteExistente.message}`)
        setAGuardar(false)
        return
      }

      if (componenteExistente) {
        setMensagem('Já existe um componente com esse nome.')
        setAGuardar(false)
        return
      }

      const { data: componenteCriado, error: erroCriarComponente } = await supabase
        .from('componentes')
        .insert([
          {
            nome: nomeLimpo,
            rendimento_final: Number(rendimentoFinal),
            unidade_rendimento: unidadeRendimento.trim(),
          },
        ])
        .select('id, nome, rendimento_final, unidade_rendimento')
        .single()

      console.log('componenteCriado', componenteCriado)
      console.log('erroCriarComponente', erroCriarComponente)

      if (erroCriarComponente || !componenteCriado) {
        setMensagem(
          `Erro ao criar o componente: ${erroCriarComponente?.message || 'sem detalhe'}`
        )
        setAGuardar(false)
        return
      }

      const componenteId = (componenteCriado as ComponenteCriado).id

      const ingredientesValidos = componentesIngredientes
        .filter((item) => item.ingrediente_id && item.quantidade.trim())
        .map((item) => ({
          componente_id: componenteId,
          ingrediente_id: Number(item.ingrediente_id),
          quantidade: Number(item.quantidade),
          unidade: item.unidade.trim(),
        }))

      console.log('ingredientesValidos', ingredientesValidos)

      let componentesIngredientesCriados: ComponenteIngredienteCriado[] = []

      if (ingredientesValidos.length > 0) {
        const { data, error } = await supabase
          .from('componente_ingredientes')
          .insert(ingredientesValidos)
          .select('id, componente_id, ingrediente_id')

        console.log('resultado insert componente_ingredientes', data)
        console.log('erro insert componente_ingredientes', error)

        if (error) {
          setMensagem(`Erro nos ingredientes: ${error.message}`)
          setAGuardar(false)
          return
        }

        componentesIngredientesCriados = (data as ComponenteIngredienteCriado[]) || []
      }

      console.log('componentesIngredientesCriados', componentesIngredientesCriados)

      const mapaComponenteIngredienteId = new Map<number, number>()

      for (const item of componentesIngredientesCriados) {
        mapaComponenteIngredienteId.set(Number(item.ingrediente_id), Number(item.id))
      }

      console.log(
        'mapaComponenteIngredienteId',
        Array.from(mapaComponenteIngredienteId.entries())
      )

      const tarefasPreparacaoFiltradas = tarefasPreparacao.filter(
        (item) => item.ingrediente_id && item.tarefa.trim()
      )

      console.log('tarefasPreparacaoFiltradas', tarefasPreparacaoFiltradas)

      const tarefasPreparacaoValidas = tarefasPreparacaoFiltradas
        .map((item) => {
          const compIngId = mapaComponenteIngredienteId.get(Number(item.ingrediente_id))

          console.log('map tarefa preparação', {
            ingredienteSelecionadoNaTarefa: item.ingrediente_id,
            compIngIdEncontrado: compIngId,
            tarefa: item.tarefa,
          })

          return {
            componente_ingrediente_id: compIngId || null,
            ordem: Number(item.ordem) || 1,
            tarefa: item.tarefa.trim(),
            observacoes: item.observacoes.trim() || null,
          }
        })
        .filter((item) => item.componente_ingrediente_id !== null)

      console.log('tarefasPreparacaoValidas', tarefasPreparacaoValidas)

      if (tarefasPreparacaoValidas.length > 0) {
        const { data, error } = await supabase
          .from('tarefas_preparacao_novo')
          .insert(tarefasPreparacaoValidas)
          .select()

        console.log('resultado insert tarefas_preparacao_novo', data)
        console.log('erro insert tarefas_preparacao_novo', error)

        if (error) {
          setMensagem(`Erro nas tarefas de preparação: ${error.message}`)
          setAGuardar(false)
          return
        }
      } else {
        console.log('Nenhuma tarefa de preparação válida para inserir.')
      }

      const tarefasConfeccaoValidas = tarefasConfeccao
        .filter((item) => item.tarefa.trim())
        .map((item) => ({
          componente_id: componenteId,
          ordem: Number(item.ordem) || 1,
          tarefa: item.tarefa.trim(),
          observacoes: item.observacoes.trim() || null,
        }))

      console.log('tarefasConfeccaoValidas', tarefasConfeccaoValidas)

      if (tarefasConfeccaoValidas.length > 0) {
        const { data, error } = await supabase
          .from('tarefas_confeccao_novo')
          .insert(tarefasConfeccaoValidas)
          .select()

        console.log('resultado insert tarefas_confeccao_novo', data)
        console.log('erro insert tarefas_confeccao_novo', error)

        if (error) {
          setMensagem(`Erro nas tarefas de confeção: ${error.message}`)
          setAGuardar(false)
          return
        }
      }

      const tarefasFinalizacaoValidas = tarefasFinalizacao
        .filter((item) => item.tarefa.trim())
        .map((item) => ({
          componente_id: componenteId,
          ordem: Number(item.ordem) || 1,
          tarefa: item.tarefa.trim(),
          observacoes: item.observacoes.trim() || null,
        }))

      console.log('tarefasFinalizacaoValidas', tarefasFinalizacaoValidas)

      if (tarefasFinalizacaoValidas.length > 0) {
        const { data, error } = await supabase
          .from('tarefas_finalizacao_novo')
          .insert(tarefasFinalizacaoValidas)
          .select()

        console.log('resultado insert tarefas_finalizacao_novo', data)
        console.log('erro insert tarefas_finalizacao_novo', error)

        if (error) {
          setMensagem(`Erro nas tarefas de finalização: ${error.message}`)
          setAGuardar(false)
          return
        }
      }

      console.log('--- FIM guardarComponente COM SUCESSO ---')
      setMensagem('Componente e tarefas guardados com sucesso!')
      limparFormulario()
      setAGuardar(false)
    } catch (erro: any) {
      console.log('ERRO INESPERADO guardarComponente', erro)
      setMensagem(`Erro inesperado: ${erro?.message || 'sem detalhe'}`)
      setAGuardar(false)
    }
  }

  function adicionarIngredienteComponente() {
    setComponentesIngredientes((prev) => [
      ...prev,
      {
        idLocal: gerarIdLocal(),
        ingrediente_id: '',
        quantidade: '',
        unidade: 'g',
        observacoes: '',
      },
    ])
  }

  function removerIngredienteComponente(idLocal: string) {
    const itemRemovido = componentesIngredientes.find((item) => item.idLocal === idLocal)

    if (itemRemovido?.ingrediente_id) {
      setIngredientesPreparacaoRemovidos((prev) => {
        if (prev.includes(itemRemovido.ingrediente_id)) return prev
        return [...prev, itemRemovido.ingrediente_id]
      })
    }

    setComponentesIngredientes((prev) =>
      prev.filter((item) => item.idLocal !== idLocal)
    )
  }

  function atualizarIngredienteComponente(
    idLocal: string,
    campo: keyof ComponenteIngredienteForm,
    valor: string
  ) {
    const ingredienteAntigo = componentesIngredientes.find(
      (item) => item.idLocal === idLocal
    )?.ingrediente_id

    setComponentesIngredientes((prev) =>
      prev.map((item) =>
        item.idLocal === idLocal ? { ...item, [campo]: valor } : item
      )
    )

    if (campo === 'ingrediente_id') {
      if (ingredienteAntigo && ingredienteAntigo !== valor) {
        setIngredientesPreparacaoRemovidos((prev) =>
          prev.filter((id) => id !== ingredienteAntigo)
        )
      }

      if (valor) {
        setIngredientesPreparacaoRemovidos((prev) =>
          prev.filter((id) => id !== valor)
        )
      }
    }
  }

  function adicionarTarefaPreparacao() {
    setTarefasPreparacao((prev) => [
      ...prev,
      {
        idLocal: gerarIdLocal(),
        ingrediente_id: '',
        ordem: '',
        tarefa: '',
        observacoes: '',
      },
    ])
  }

  function removerTarefaPreparacao(idLocal: string) {
    const tarefa = tarefasPreparacao.find((item) => item.idLocal === idLocal)

    if (tarefa?.ingrediente_id) {
      setIngredientesPreparacaoRemovidos((prev) => {
        if (prev.includes(tarefa.ingrediente_id)) return prev
        return [...prev, tarefa.ingrediente_id]
      })
    }

    setTarefasPreparacao((prev) => prev.filter((item) => item.idLocal !== idLocal))
  }

  function atualizarTarefaPreparacao(
    idLocal: string,
    campo: keyof TarefaPreparacaoForm,
    valor: string
  ) {
    const valorAnterior = tarefasPreparacao.find(
      (item) => item.idLocal === idLocal
    )?.ingrediente_id

    setTarefasPreparacao((prev) =>
      prev.map((item) =>
        item.idLocal === idLocal ? { ...item, [campo]: valor } : item
      )
    )

    if (campo === 'ingrediente_id') {
      if (valorAnterior) {
        setIngredientesPreparacaoRemovidos((prev) =>
          prev.filter((id) => id !== valorAnterior)
        )
      }

      if (valor) {
        setIngredientesPreparacaoRemovidos((prev) =>
          prev.filter((id) => id !== valor)
        )
      }
    }
  }

  function adicionarTarefaConfeccao() {
    setTarefasConfeccao((prev) => [
      ...prev,
      {
        idLocal: gerarIdLocal(),
        ordem: '',
        tarefa: '',
        observacoes: '',
      },
    ])
  }

  function removerTarefaConfeccao(idLocal: string) {
    setTarefasConfeccao((prev) =>
      prev.filter((item) => item.idLocal !== idLocal)
    )
  }

  function atualizarTarefaConfeccao(
    idLocal: string,
    campo: keyof TarefaComponenteForm,
    valor: string
  ) {
    setTarefasConfeccao((prev) =>
      prev.map((item) =>
        item.idLocal === idLocal ? { ...item, [campo]: valor } : item
      )
    )
  }

  function adicionarTarefaFinalizacao() {
    setTarefasFinalizacao((prev) => [
      ...prev,
      {
        idLocal: gerarIdLocal(),
        ordem: '',
        tarefa: '',
        observacoes: '',
      },
    ])
  }

  function removerTarefaFinalizacao(idLocal: string) {
    setTarefasFinalizacao((prev) =>
      prev.filter((item) => item.idLocal !== idLocal)
    )
  }

  function atualizarTarefaFinalizacao(
    idLocal: string,
    campo: keyof TarefaComponenteForm,
    valor: string
  ) {
    setTarefasFinalizacao((prev) =>
      prev.map((item) =>
        item.idLocal === idLocal ? { ...item, [campo]: valor } : item
      )
    )
  }

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Novo componente</h1>

          <Link
            href="/"
            className="px-4 py-2 rounded bg-gray-200 text-black font-medium"
          >
            Voltar
          </Link>
        </div>

        <section className="border rounded p-6 bg-gray-50 mb-8">
          <h2 className="text-2xl font-bold mb-4">Pesquisar componente existente</h2>

          <div ref={pesquisaWrapperRef} className="relative">
            <input
              type="text"
              value={pesquisaComponente}
              onChange={(e) => {
                setPesquisaComponente(e.target.value)
                setMostrarPesquisa(true)
              }}
              onFocus={() => {
                if (pesquisaComponente.trim()) {
                  setMostrarPesquisa(true)
                }
              }}
              className="w-full border px-3 py-2 rounded bg-white"
              placeholder="Escreve para verificar se o componente já existe..."
            />

            {mostrarPesquisa && pesquisaComponente.trim() && (
              <div className="absolute z-30 mt-1 w-full rounded border bg-white shadow-lg max-h-72 overflow-y-auto">
                {loadingPesquisa && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    A pesquisar componentes...
                  </div>
                )}

                {!loadingPesquisa && resultadosPesquisa.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Nenhum componente encontrado.
                  </div>
                )}

                {!loadingPesquisa &&
                  resultadosPesquisa.map((comp) => (
                    <div
                      key={comp.id}
                      className="px-3 py-3 border-b last:border-b-0"
                    >
                      <div className="font-medium">{comp.nome}</div>
                      <div className="text-sm text-gray-600">
                        {comp.rendimento_final ?? '-'}{' '}
                        {comp.unidade_rendimento ?? ''}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {loadingIngredientes ? (
          <div className="border rounded p-4 bg-yellow-50 mb-6">
            A carregar ingredientes...
          </div>
        ) : ingredientes.length === 0 ? (
          <div className="border rounded p-4 bg-yellow-50 mb-6">
            Não existem ingredientes criados na tabela <strong>ingredientes</strong>.
          </div>
        ) : null}

        {mensagem && (
          <div className="border rounded p-4 bg-white mb-6">
            <p>{mensagem}</p>
          </div>
        )}

        <div className="space-y-8">
          <section className="border rounded p-6 bg-gray-50">
            <h2 className="text-2xl font-bold mb-4">1. Dados base do componente</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 font-medium">Nome do componente</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                  placeholder="Ex: Arroz basmati cozido"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Rendimento final</label>
                <input
                  type="number"
                  value={rendimentoFinal}
                  onChange={(e) => setRendimentoFinal(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                  placeholder="Ex: 2500"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Unidade do rendimento</label>
                <select
                  value={unidadeRendimento}
                  onChange={(e) => setUnidadeRendimento(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                >
                  {unidades.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">2. Ingredientes do componente</h2>

              <button
                type="button"
                onClick={adicionarIngredienteComponente}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: '#80c944' }}
              >
                + Adicionar ingrediente
              </button>
            </div>

            <div className="space-y-4">
              {componentesIngredientes.map((item, index) => (
                <div
                  key={item.idLocal}
                  className="border rounded p-4 bg-white grid grid-cols-1 md:grid-cols-5 gap-4"
                >
                  <div>
                    <label className="block mb-2 font-medium">
                      Ingrediente {index + 1}
                    </label>
                    <IngredientSearchSelect
                      ingredientes={ingredientes}
                      value={item.ingrediente_id}
                      onChange={(v) =>
                        atualizarIngredienteComponente(item.idLocal, 'ingrediente_id', v)
                      }
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Quantidade</label>
                    <input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) =>
                        atualizarIngredienteComponente(
                          item.idLocal,
                          'quantidade',
                          e.target.value
                        )
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Ex: 500"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Unidade</label>
                    <select
                      value={item.unidade}
                      onChange={(e) =>
                        atualizarIngredienteComponente(
                          item.idLocal,
                          'unidade',
                          e.target.value
                        )
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                    >
                      {unidades.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Observações</label>
                    <input
                      type="text"
                      value={item.observacoes}
                      onChange={(e) =>
                        atualizarIngredienteComponente(
                          item.idLocal,
                          'observacoes',
                          e.target.value
                        )
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">&nbsp;</label>
                    <button
                      type="button"
                      onClick={() => removerIngredienteComponente(item.idLocal)}
                      className="w-full px-4 py-2 rounded bg-red-600 text-white"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">3. Preparação (por ingrediente)</h2>

              <button
                type="button"
                onClick={adicionarTarefaPreparacao}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: '#80c944' }}
              >
                + Tarefa
              </button>
            </div>

            <div className="space-y-4">
              {tarefasPreparacao.map((item, index) => (
                <div
                  key={item.idLocal}
                  className="border rounded p-4 bg-white grid grid-cols-1 md:grid-cols-5 gap-4"
                >
                  <div>
                    <label className="block mb-2 font-medium">
                      Ingrediente {index + 1}
                    </label>
                    <IngredientSearchSelect
                      ingredientes={ingredientes}
                      value={item.ingrediente_id}
                      onChange={(v) =>
                        atualizarTarefaPreparacao(item.idLocal, 'ingrediente_id', v)
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium">Tarefa</label>
                    <input
                      type="text"
                      value={item.tarefa}
                      onChange={(e) =>
                        atualizarTarefaPreparacao(item.idLocal, 'tarefa', e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Ex: Cortar em cubos pequenos"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">Ordem</label>
                    <input
                      type="number"
                      value={item.ordem}
                      onChange={(e) =>
                        atualizarTarefaPreparacao(item.idLocal, 'ordem', e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Ex: 1"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">&nbsp;</label>
                    <button
                      type="button"
                      onClick={() => removerTarefaPreparacao(item.idLocal)}
                      className="w-full px-4 py-2 rounded bg-red-600 text-white"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="md:col-span-5">
                    <label className="block mb-2 font-medium">Observações</label>
                    <input
                      type="text"
                      value={item.observacoes}
                      onChange={(e) =>
                        atualizarTarefaPreparacao(
                          item.idLocal,
                          'observacoes',
                          e.target.value
                        )
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">4. Confeção</h2>

              <button
                type="button"
                onClick={adicionarTarefaConfeccao}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: '#80c944' }}
              >
                + Tarefa
              </button>
            </div>

            <div className="space-y-4">
              {tarefasConfeccao.map((item) => (
                <div
                  key={item.idLocal}
                  className="border rounded p-4 bg-white grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <div>
                    <label className="block mb-2 font-medium">Ordem</label>
                    <input
                      type="number"
                      value={item.ordem}
                      onChange={(e) =>
                        atualizarTarefaConfeccao(item.idLocal, 'ordem', e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Ex: 1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium">Tarefa</label>
                    <input
                      type="text"
                      value={item.tarefa}
                      onChange={(e) =>
                        atualizarTarefaConfeccao(item.idLocal, 'tarefa', e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Ex: Cozer o frango"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">&nbsp;</label>
                    <button
                      type="button"
                      onClick={() => removerTarefaConfeccao(item.idLocal)}
                      className="w-full px-4 py-2 rounded bg-red-600 text-white"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block mb-2 font-medium">Observações</label>
                    <input
                      type="text"
                      value={item.observacoes}
                      onChange={(e) =>
                        atualizarTarefaConfeccao(
                          item.idLocal,
                          'observacoes',
                          e.target.value
                        )
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">5. Finalização</h2>

              <button
                type="button"
                onClick={adicionarTarefaFinalizacao}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: '#80c944' }}
              >
                + Tarefa
              </button>
            </div>

            <div className="space-y-4">
              {tarefasFinalizacao.map((item) => (
                <div
                  key={item.idLocal}
                  className="border rounded p-4 bg-white grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <div>
                    <label className="block mb-2 font-medium">Ordem</label>
                    <input
                      type="number"
                      value={item.ordem}
                      onChange={(e) =>
                        atualizarTarefaFinalizacao(item.idLocal, 'ordem', e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Ex: 1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium">Tarefa</label>
                    <input
                      type="text"
                      value={item.tarefa}
                      onChange={(e) =>
                        atualizarTarefaFinalizacao(item.idLocal, 'tarefa', e.target.value)
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Ex: Adicionar sementes"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 font-medium">&nbsp;</label>
                    <button
                      type="button"
                      onClick={() => removerTarefaFinalizacao(item.idLocal)}
                      className="w-full px-4 py-2 rounded bg-red-600 text-white"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block mb-2 font-medium">Observações</label>
                    <input
                      type="text"
                      value={item.observacoes}
                      onChange={(e) =>
                        atualizarTarefaFinalizacao(
                          item.idLocal,
                          'observacoes',
                          e.target.value
                        )
                      }
                      className="w-full border px-3 py-2 rounded bg-white"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex gap-3 pb-8 flex-wrap">
            <button
              type="button"
              onClick={guardarComponente}
              disabled={aGuardar}
              className="text-white px-6 py-3 rounded font-medium"
              style={{ backgroundColor: '#80c944' }}
            >
              {aGuardar ? 'A guardar...' : 'Guardar componente'}
            </button>

            <button
              type="button"
              onClick={limparFormulario}
              className="px-6 py-3 rounded bg-gray-200 text-black font-medium"
            >
              Limpar
            </button>

            <Link
              href="/"
              className="px-6 py-3 rounded bg-gray-200 text-black font-medium"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}