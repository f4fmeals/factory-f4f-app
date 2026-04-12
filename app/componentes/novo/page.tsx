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
        className="w-full border px-3 py-2 rounded bg-white disabled:bg-gray-100"
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

  useEffect(() => {
    fetchIngredientes()
  }, [])

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

      // 1. Verificar se componente já existe
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

      // 2. Criar componente
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

      // 3. Gravar ingredientes do componente
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

      // 4. Criar mapa ingrediente_id -> componente_ingrediente.id
      const mapaComponenteIngredienteId = new Map<number, number>()

      for (const item of componentesIngredientesCriados) {
        mapaComponenteIngredienteId.set(Number(item.ingrediente_id), Number(item.id))
      }

      console.log(
        'mapaComponenteIngredienteId',
        Array.from(mapaComponenteIngredienteId.entries())
      )

      // 5. Preparar tarefas de preparação
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

      // 6. Gravar tarefas de confeção
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

      // 7. Gravar tarefas de finalização
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
    setComponentesIngredientes((prev) =>
      prev.filter((item) => item.idLocal !== idLocal)
    )
  }

  function atualizarIngredienteComponente(
    idLocal: string,
    campo: keyof ComponenteIngredienteForm,
    valor: string
  ) {
    setComponentesIngredientes((prev) =>
      prev.map((item) =>
        item.idLocal === idLocal ? { ...item, [campo]: valor } : item
      )
    )
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
    setTarefasPreparacao((prev) =>
      prev.filter((item) => item.idLocal !== idLocal)
    )
  }

  function atualizarTarefaPreparacao(
    idLocal: string,
    campo: keyof TarefaPreparacaoForm,
    valor: string
  ) {
    setTarefasPreparacao((prev) =>
      prev.map((item) =>
        item.idLocal === idLocal ? { ...item, [campo]: valor } : item
      )
    )
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
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded bg-gray-200 text-black font-medium"
            >
              Voltar
            </Link>
          </div>
        </div>

        {mensagem && (
          <div className="border rounded p-4 bg-blue-50 mb-6 font-bold text-blue-800">
            {mensagem}
          </div>
        )}

        <div className="space-y-8">
          <section className="border rounded p-6 bg-gray-50">
            <h2 className="text-2xl font-bold mb-4">1. Dados base</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="border px-3 py-2 rounded"
                placeholder="Nome do componente"
              />
              <input
                type="number"
                value={rendimentoFinal}
                onChange={(e) => setRendimentoFinal(e.target.value)}
                className="border px-3 py-2 rounded"
                placeholder="Rendimento final"
              />
              <select
                value={unidadeRendimento}
                onChange={(e) => setUnidadeRendimento(e.target.value)}
                className="border px-3 py-2 rounded"
              >
                {unidades.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">2. Ingredientes</h2>
              <button
                onClick={adicionarIngredienteComponente}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                + Adicionar
              </button>
            </div>

            {loadingIngredientes && (
              <div className="mb-4 text-sm text-gray-500">
                A carregar ingredientes...
              </div>
            )}

            {componentesIngredientes.map((item) => (
              <div
                key={item.idLocal}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-white border rounded"
              >
                <IngredientSearchSelect
                  ingredientes={ingredientes}
                  value={item.ingrediente_id}
                  onChange={(v) =>
                    atualizarIngredienteComponente(item.idLocal, 'ingrediente_id', v)
                  }
                />
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
                  className="border px-3 py-2 rounded"
                  placeholder="Qtd"
                />
                <select
                  value={item.unidade}
                  onChange={(e) =>
                    atualizarIngredienteComponente(
                      item.idLocal,
                      'unidade',
                      e.target.value
                    )
                  }
                  className="border px-3 py-2 rounded"
                >
                  {unidades.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removerIngredienteComponente(item.idLocal)}
                  className="bg-red-500 text-white rounded"
                >
                  Remover
                </button>
              </div>
            ))}
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">3. Preparação (por ingrediente)</h2>
              <button
                onClick={adicionarTarefaPreparacao}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                + Tarefa
              </button>
            </div>

            {tarefasPreparacao.map((item) => (
              <div
                key={item.idLocal}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2"
              >
                <IngredientSearchSelect
                  ingredientes={ingredientes}
                  value={item.ingrediente_id}
                  onChange={(v) =>
                    atualizarTarefaPreparacao(item.idLocal, 'ingrediente_id', v)
                  }
                />
                <input
                  type="text"
                  value={item.tarefa}
                  onChange={(e) =>
                    atualizarTarefaPreparacao(item.idLocal, 'tarefa', e.target.value)
                  }
                  className="border px-3 py-2 rounded"
                  placeholder="Tarefa"
                />
                <input
                  type="number"
                  value={item.ordem}
                  onChange={(e) =>
                    atualizarTarefaPreparacao(item.idLocal, 'ordem', e.target.value)
                  }
                  className="border px-3 py-2 rounded w-20"
                  placeholder="Ordem"
                />
                <button
                  onClick={() => removerTarefaPreparacao(item.idLocal)}
                  className="text-red-500"
                >
                  X
                </button>
              </div>
            ))}
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">4. Confeção</h2>
              <button
                onClick={adicionarTarefaConfeccao}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                + Tarefa
              </button>
            </div>

            {tarefasConfeccao.map((item) => (
              <div key={item.idLocal} className="flex gap-4 mb-2">
                <input
                  type="number"
                  value={item.ordem}
                  onChange={(e) =>
                    atualizarTarefaConfeccao(item.idLocal, 'ordem', e.target.value)
                  }
                  className="border px-3 py-2 rounded w-20"
                  placeholder="1"
                />
                <input
                  type="text"
                  value={item.tarefa}
                  onChange={(e) =>
                    atualizarTarefaConfeccao(item.idLocal, 'tarefa', e.target.value)
                  }
                  className="border px-3 py-2 rounded flex-1"
                  placeholder="Ex: Cozer o frango"
                />
                <button
                  onClick={() => removerTarefaConfeccao(item.idLocal)}
                  className="text-red-500"
                >
                  X
                </button>
              </div>
            ))}
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">5. Finalização</h2>
              <button
                onClick={adicionarTarefaFinalizacao}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                + Tarefa
              </button>
            </div>

            {tarefasFinalizacao.map((item) => (
              <div key={item.idLocal} className="flex gap-4 mb-2">
                <input
                  type="number"
                  value={item.ordem}
                  onChange={(e) =>
                    atualizarTarefaFinalizacao(item.idLocal, 'ordem', e.target.value)
                  }
                  className="border px-3 py-2 rounded w-20"
                  placeholder="1"
                />
                <input
                  type="text"
                  value={item.tarefa}
                  onChange={(e) =>
                    atualizarTarefaFinalizacao(item.idLocal, 'tarefa', e.target.value)
                  }
                  className="border px-3 py-2 rounded flex-1"
                  placeholder="Ex: Adicionar sementes"
                />
                <button
                  onClick={() => removerTarefaFinalizacao(item.idLocal)}
                  className="text-red-500"
                >
                  X
                </button>
              </div>
            ))}
          </section>

          <button
            onClick={guardarComponente}
            disabled={aGuardar}
            className="w-full py-4 bg-blue-700 text-white rounded-lg font-bold text-xl disabled:bg-gray-400"
          >
            {aGuardar ? 'A guardar...' : 'GUARDAR COMPONENTE COMPLETO'}
          </button>
        </div>
      </div>
    </main>
  )
}