'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type Ingrediente = {
  id: number
  nome: string
}

type Componente = {
  id: number
  nome: string
  rendimento_final: number | null
  unidade_rendimento: string | null
}

type ComponenteIngredienteForm = {
  idLocal: string
  id?: number
  ingrediente_id: string
  quantidade: string
  unidade: string
  observacoes: string
}

type TarefaPreparacaoForm = {
  idLocal: string
  id?: number
  ingrediente_id: string
  ordem: string
  tarefa: string
  observacoes: string
}

type TarefaComponenteForm = {
  idLocal: string
  id?: number
  ordem: string
  tarefa: string
  observacoes: string
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

function EditarComponentePage() {
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])

  const [loadingComponentes, setLoadingComponentes] = useState(true)
  const [loadingIngredientes, setLoadingIngredientes] = useState(true)
  const [loadingComponente, setLoadingComponente] = useState(false)
  const [aGuardar, setAGuardar] = useState(false)

  const [pesquisaComponente, setPesquisaComponente] = useState('')
  const pesquisaDebounced = useDebouncedValue(pesquisaComponente, 300)

  const [componenteSelecionadoId, setComponenteSelecionadoId] = useState<string>('')

  const [nome, setNome] = useState('')
  const [rendimentoFinal, setRendimentoFinal] = useState('')
  const [unidadeRendimento, setUnidadeRendimento] = useState('g')

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

  const [mensagem, setMensagem] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    async function init() {
      await fetchComponentes()
      await fetchIngredientes()
      const idParam = searchParams.get('id')
      if (idParam) {
        const idNumero = Number(idParam)
        if (!isNaN(idNumero) && idNumero > 0) {
          await carregarComponente(idNumero)
        }
      }
    }
    init()
  }, [])

  async function fetchComponentes() {
    setLoadingComponentes(true)

    const { data, error } = await supabase
      .from('componentes')
      .select('id, nome, rendimento_final, unidade_rendimento')
      .order('nome', { ascending: true })

    if (error) {
      console.log('Erro ao carregar componentes:', error)
      setMensagem(`Erro ao carregar componentes: ${error.message}`)
      setComponentes([])
    } else {
      setComponentes((data as Componente[]) || [])
    }

    setLoadingComponentes(false)
  }

  async function fetchIngredientes() {
    setLoadingIngredientes(true)

    const { data, error } = await supabase
      .from('ingredientes')
      .select('id, nome')
      .order('nome', { ascending: true })

    if (error) {
      console.log('Erro ao carregar ingredientes:', error)
      setMensagem(`Erro ao carregar ingredientes: ${error.message}`)
      setIngredientes([])
    } else {
      setIngredientes((data as Ingrediente[]) || [])
    }

    setLoadingIngredientes(false)
  }

  function limparFormulario() {
    setComponenteSelecionadoId('')
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

  const componentesFiltrados = useMemo(() => {
    const termo = pesquisaDebounced.trim().toLowerCase()

    if (!termo) return componentes.slice(0, 30)

    return componentes
      .filter((item) => item.nome?.toLowerCase().includes(termo))
      .slice(0, 30)
  }, [componentes, pesquisaDebounced])

  async function carregarComponente(componenteId: number) {
    setMensagem('')
    setLoadingComponente(true)

    try {
      const { data: componenteData, error: erroComponente } = await supabase
        .from('componentes')
        .select('id, nome, rendimento_final, unidade_rendimento')
        .eq('id', componenteId)
        .single()

      if (erroComponente || !componenteData) {
        setMensagem(`Erro ao carregar componente: ${erroComponente?.message || 'sem detalhe'}`)
        setLoadingComponente(false)
        return
      }

      setComponenteSelecionadoId(String(componenteData.id))
      setNome(componenteData.nome || '')
      setRendimentoFinal(
        componenteData.rendimento_final !== null && componenteData.rendimento_final !== undefined
          ? String(componenteData.rendimento_final)
          : ''
      )
      setUnidadeRendimento(componenteData.unidade_rendimento || 'g')

      const { data: ingredientesData, error: erroIngredientes } = await supabase
        .from('componente_ingredientes')
        .select('id, componente_id, ingrediente_id, quantidade, unidade')
        .eq('componente_id', componenteId)
        .order('id', { ascending: true })

      if (erroIngredientes) {
        setMensagem(`Erro ao carregar ingredientes do componente: ${erroIngredientes.message}`)
        setLoadingComponente(false)
        return
      }

      const ingredientesForm: ComponenteIngredienteForm[] =
        ingredientesData && ingredientesData.length > 0
          ? ingredientesData.map((item: any) => ({
              idLocal: gerarIdLocal(),
              id: item.id,
              ingrediente_id: item.ingrediente_id ? String(item.ingrediente_id) : '',
              quantidade:
                item.quantidade !== null && item.quantidade !== undefined
                  ? String(item.quantidade)
                  : '',
              unidade: item.unidade || 'g',
              observacoes: '',
            }))
          : [
              {
                idLocal: gerarIdLocal(),
                ingrediente_id: '',
                quantidade: '',
                unidade: 'g',
                observacoes: '',
              },
            ]

      setComponentesIngredientes(ingredientesForm)

      const mapaIngredienteIdParaCompIngId = new Map<number, number>()
      for (const item of (ingredientesData || []) as any[]) {
        mapaIngredienteIdParaCompIngId.set(Number(item.ingrediente_id), Number(item.id))
      }

      const { data: tarefasPrepData, error: erroPrep } = await supabase
        .from('tarefas_preparacao_novo')
        .select('id, componente_ingrediente_id, ordem, tarefa, observacoes')
        .in(
          'componente_ingrediente_id',
          (ingredientesData || []).map((item: any) => item.id).length > 0
            ? (ingredientesData || []).map((item: any) => item.id)
            : [-1]
        )
        .order('ordem', { ascending: true })

      if (erroPrep) {
        setMensagem(`Erro ao carregar tarefas de preparação: ${erroPrep.message}`)
        setLoadingComponente(false)
        return
      }

      const mapaCompIngIdParaIngredienteId = new Map<number, number>()
      for (const item of (ingredientesData || []) as any[]) {
        mapaCompIngIdParaIngredienteId.set(Number(item.id), Number(item.ingrediente_id))
      }

      const tarefasPrepForm: TarefaPreparacaoForm[] =
        tarefasPrepData && tarefasPrepData.length > 0
          ? tarefasPrepData.map((item: any) => ({
              idLocal: gerarIdLocal(),
              id: item.id,
              ingrediente_id: mapaCompIngIdParaIngredienteId.get(Number(item.componente_ingrediente_id))
                ? String(mapaCompIngIdParaIngredienteId.get(Number(item.componente_ingrediente_id)))
                : '',
              ordem: item.ordem !== null && item.ordem !== undefined ? String(item.ordem) : '',
              tarefa: item.tarefa || '',
              observacoes: item.observacoes || '',
            }))
          : [
              {
                idLocal: gerarIdLocal(),
                ingrediente_id: '',
                ordem: '',
                tarefa: '',
                observacoes: '',
              },
            ]

      setTarefasPreparacao(tarefasPrepForm)

      const { data: tarefasConfeccaoData, error: erroConfeccao } = await supabase
        .from('tarefas_confeccao_novo')
        .select('id, componente_id, ordem, tarefa, observacoes')
        .eq('componente_id', componenteId)
        .order('ordem', { ascending: true })

      if (erroConfeccao) {
        setMensagem(`Erro ao carregar tarefas de confeção: ${erroConfeccao.message}`)
        setLoadingComponente(false)
        return
      }

      const confeccaoForm: TarefaComponenteForm[] =
        tarefasConfeccaoData && tarefasConfeccaoData.length > 0
          ? tarefasConfeccaoData.map((item: any) => ({
              idLocal: gerarIdLocal(),
              id: item.id,
              ordem: item.ordem !== null && item.ordem !== undefined ? String(item.ordem) : '',
              tarefa: item.tarefa || '',
              observacoes: item.observacoes || '',
            }))
          : [
              {
                idLocal: gerarIdLocal(),
                ordem: '',
                tarefa: '',
                observacoes: '',
              },
            ]

      setTarefasConfeccao(confeccaoForm)

      const { data: tarefasFinalizacaoData, error: erroFinalizacao } = await supabase
        .from('tarefas_finalizacao_novo')
        .select('id, componente_id, ordem, tarefa, observacoes')
        .eq('componente_id', componenteId)
        .order('ordem', { ascending: true })

      if (erroFinalizacao) {
        setMensagem(`Erro ao carregar tarefas de finalização: ${erroFinalizacao.message}`)
        setLoadingComponente(false)
        return
      }

      const finalizacaoForm: TarefaComponenteForm[] =
        tarefasFinalizacaoData && tarefasFinalizacaoData.length > 0
          ? tarefasFinalizacaoData.map((item: any) => ({
              idLocal: gerarIdLocal(),
              id: item.id,
              ordem: item.ordem !== null && item.ordem !== undefined ? String(item.ordem) : '',
              tarefa: item.tarefa || '',
              observacoes: item.observacoes || '',
            }))
          : [
              {
                idLocal: gerarIdLocal(),
                ordem: '',
                tarefa: '',
                observacoes: '',
              },
            ]

      setTarefasFinalizacao(finalizacaoForm)

      console.log('Componente carregado com sucesso', {
        componenteData,
        ingredientesData,
        tarefasPrepData,
        tarefasConfeccaoData,
        tarefasFinalizacaoData,
        mapaIngredienteIdParaCompIngId: Array.from(mapaIngredienteIdParaCompIngId.entries()),
      })
    } catch (erro: any) {
      console.log('Erro inesperado ao carregar componente', erro)
      setMensagem(`Erro inesperado ao carregar componente: ${erro?.message || 'sem detalhe'}`)
    }

    setLoadingComponente(false)
  }

  function validarFormulario() {
    if (!componenteSelecionadoId) return 'Tens de selecionar um componente.'

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
      return 'Tens de manter pelo menos um ingrediente no componente.'
    }

    for (const item of ingredientesPreenchidos) {
      if (!item.ingrediente_id) {
        return 'Todos os ingredientes têm de ter um ingrediente selecionado.'
      }

      if (!item.quantidade.trim() || Number(item.quantidade) <= 0) {
        return 'Todos os ingredientes têm de ter quantidade maior que 0.'
      }

      if (!item.unidade.trim()) {
        return 'Todos os ingredientes têm de ter unidade.'
      }
    }

    return ''
  }

  async function guardarAlteracoes() {
    setMensagem('')

    const erroValidacao = validarFormulario()
    if (erroValidacao) {
      setMensagem(erroValidacao)
      return
    }

    setAGuardar(true)

    try {
      const componenteId = Number(componenteSelecionadoId)
      const nomeLimpo = nome.trim()

      console.log('--- INÍCIO guardarAlteracoes ---')
      console.log('componenteId', componenteId)
      console.log('nome', nomeLimpo)
      console.log('componentesIngredientes', componentesIngredientes)
      console.log('tarefasPreparacao', tarefasPreparacao)
      console.log('tarefasConfeccao', tarefasConfeccao)
      console.log('tarefasFinalizacao', tarefasFinalizacao)

      const { data: componenteComMesmoNome, error: erroNome } = await supabase
        .from('componentes')
        .select('id, nome')
        .ilike('nome', nomeLimpo)
        .neq('id', componenteId)
        .maybeSingle()

      if (erroNome) {
        setMensagem(`Erro ao validar nome do componente: ${erroNome.message}`)
        setAGuardar(false)
        return
      }

      if (componenteComMesmoNome) {
        setMensagem('Já existe outro componente com esse nome.')
        setAGuardar(false)
        return
      }

      const { error: erroUpdateComponente } = await supabase
        .from('componentes')
        .update({
          nome: nomeLimpo,
          rendimento_final: Number(rendimentoFinal),
          unidade_rendimento: unidadeRendimento.trim(),
        })
        .eq('id', componenteId)

      if (erroUpdateComponente) {
        setMensagem(`Erro ao atualizar componente: ${erroUpdateComponente.message}`)
        setAGuardar(false)
        return
      }

      const { data: compIngExistentes, error: erroCompIngExistentes } = await supabase
        .from('componente_ingredientes')
        .select('id')
        .eq('componente_id', componenteId)

      if (erroCompIngExistentes) {
        setMensagem(`Erro ao obter ingredientes atuais: ${erroCompIngExistentes.message}`)
        setAGuardar(false)
        return
      }

      const idsCompIngExistentes = (compIngExistentes || []).map((item: any) => item.id)

      if (idsCompIngExistentes.length > 0) {
        const { error: erroApagarPrep } = await supabase
          .from('tarefas_preparacao_novo')
          .delete()
          .in('componente_ingrediente_id', idsCompIngExistentes)

        if (erroApagarPrep) {
          setMensagem(`Erro ao apagar tarefas de preparação antigas: ${erroApagarPrep.message}`)
          setAGuardar(false)
          return
        }
      }

      const { error: erroApagarConfeccao } = await supabase
        .from('tarefas_confeccao_novo')
        .delete()
        .eq('componente_id', componenteId)

      if (erroApagarConfeccao) {
        setMensagem(`Erro ao apagar tarefas de confeção antigas: ${erroApagarConfeccao.message}`)
        setAGuardar(false)
        return
      }

      const { error: erroApagarFinalizacao } = await supabase
        .from('tarefas_finalizacao_novo')
        .delete()
        .eq('componente_id', componenteId)

      if (erroApagarFinalizacao) {
        setMensagem(`Erro ao apagar tarefas de finalização antigas: ${erroApagarFinalizacao.message}`)
        setAGuardar(false)
        return
      }

      const { error: erroApagarIngredientes } = await supabase
        .from('componente_ingredientes')
        .delete()
        .eq('componente_id', componenteId)

      if (erroApagarIngredientes) {
        setMensagem(`Erro ao apagar ingredientes antigos: ${erroApagarIngredientes.message}`)
        setAGuardar(false)
        return
      }

      const ingredientesValidos = componentesIngredientes
        .filter((item) => item.ingrediente_id && item.quantidade.trim())
        .map((item) => ({
          componente_id: componenteId,
          ingrediente_id: Number(item.ingrediente_id),
          quantidade: Number(item.quantidade),
          unidade: item.unidade.trim(),
        }))

      console.log('ingredientesValidos update', ingredientesValidos)

      let componentesIngredientesCriados: ComponenteIngredienteCriado[] = []

      if (ingredientesValidos.length > 0) {
        const { data, error } = await supabase
          .from('componente_ingredientes')
          .insert(ingredientesValidos)
          .select('id, componente_id, ingrediente_id')

        console.log('resultado insert componente_ingredientes update', data)
        console.log('erro insert componente_ingredientes update', error)

        if (error) {
          setMensagem(`Erro ao gravar ingredientes atualizados: ${error.message}`)
          setAGuardar(false)
          return
        }

        componentesIngredientesCriados = (data as ComponenteIngredienteCriado[]) || []
      }

      const mapaComponenteIngredienteId = new Map<number, number>()
      for (const item of componentesIngredientesCriados) {
        mapaComponenteIngredienteId.set(Number(item.ingrediente_id), Number(item.id))
      }

      console.log(
        'mapaComponenteIngredienteId update',
        Array.from(mapaComponenteIngredienteId.entries())
      )

      const tarefasPreparacaoValidas = tarefasPreparacao
        .filter((item) => item.ingrediente_id && item.tarefa.trim())
        .map((item) => {
          const compIngId = mapaComponenteIngredienteId.get(Number(item.ingrediente_id))

          return {
            componente_ingrediente_id: compIngId || null,
            ordem: Number(item.ordem) || 1,
            tarefa: item.tarefa.trim(),
            observacoes: item.observacoes.trim() || null,
          }
        })
        .filter((item) => item.componente_ingrediente_id !== null)

      console.log('tarefasPreparacaoValidas update', tarefasPreparacaoValidas)

      if (tarefasPreparacaoValidas.length > 0) {
        const { error: erroPrep } = await supabase
          .from('tarefas_preparacao_novo')
          .insert(tarefasPreparacaoValidas)

        if (erroPrep) {
          setMensagem(`Erro ao gravar tarefas de preparação: ${erroPrep.message}`)
          setAGuardar(false)
          return
        }
      }

      const tarefasConfeccaoValidas = tarefasConfeccao
        .filter((item) => item.tarefa.trim())
        .map((item) => ({
          componente_id: componenteId,
          ordem: Number(item.ordem) || 1,
          tarefa: item.tarefa.trim(),
          observacoes: item.observacoes.trim() || null,
        }))

      console.log('tarefasConfeccaoValidas update', tarefasConfeccaoValidas)

      if (tarefasConfeccaoValidas.length > 0) {
        const { error: erroConfeccao } = await supabase
          .from('tarefas_confeccao_novo')
          .insert(tarefasConfeccaoValidas)

        if (erroConfeccao) {
          setMensagem(`Erro ao gravar tarefas de confeção: ${erroConfeccao.message}`)
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

      console.log('tarefasFinalizacaoValidas update', tarefasFinalizacaoValidas)

      if (tarefasFinalizacaoValidas.length > 0) {
        const { error: erroFinalizacao } = await supabase
          .from('tarefas_finalizacao_novo')
          .insert(tarefasFinalizacaoValidas)

        if (erroFinalizacao) {
          setMensagem(`Erro ao gravar tarefas de finalização: ${erroFinalizacao.message}`)
          setAGuardar(false)
          return
        }
      }

      setMensagem('Componente atualizado com sucesso!')
      await fetchComponentes()
      await carregarComponente(componenteId)
    } catch (erro: any) {
      console.log('Erro inesperado ao guardar alterações', erro)
      setMensagem(`Erro inesperado: ${erro?.message || 'sem detalhe'}`)
    }

    setAGuardar(false)
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
    setComponentesIngredientes((prev) => prev.filter((item) => item.idLocal !== idLocal))
  }

  function atualizarIngredienteComponente(
    idLocal: string,
    campo: keyof ComponenteIngredienteForm,
    valor: string
  ) {
    setComponentesIngredientes((prev) =>
      prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))
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
    setTarefasPreparacao((prev) => prev.filter((item) => item.idLocal !== idLocal))
  }

  function atualizarTarefaPreparacao(
    idLocal: string,
    campo: keyof TarefaPreparacaoForm,
    valor: string
  ) {
    setTarefasPreparacao((prev) =>
      prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))
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
    setTarefasConfeccao((prev) => prev.filter((item) => item.idLocal !== idLocal))
  }

  function atualizarTarefaConfeccao(
    idLocal: string,
    campo: keyof TarefaComponenteForm,
    valor: string
  ) {
    setTarefasConfeccao((prev) =>
      prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))
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
    setTarefasFinalizacao((prev) => prev.filter((item) => item.idLocal !== idLocal))
  }

  function atualizarTarefaFinalizacao(
    idLocal: string,
    campo: keyof TarefaComponenteForm,
    valor: string
  ) {
    setTarefasFinalizacao((prev) =>
      prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))
    )
  }

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Editar componentes</h1>
          <div className="flex gap-3">
            <Link href="/gestao" className="px-4 py-2 rounded bg-gray-200 text-black font-medium">
              Voltar
            </Link>
          </div>
        </div>

        {mensagem && (
          <div className="border rounded p-4 bg-blue-50 mb-6 font-bold text-blue-800">
            {mensagem}
          </div>
        )}

        <section className="border rounded p-6 bg-gray-50 mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Procurar componente</h2>

          <input
            type="text"
            value={pesquisaComponente}
            onChange={(e) => setPesquisaComponente(e.target.value)}
            className="border px-3 py-2 rounded w-full mb-4"
            placeholder="Escreve o nome do componente..."
          />

          {loadingComponentes ? (
            <div className="text-sm text-gray-500">A carregar componentes...</div>
          ) : (
            <div className="border rounded bg-white max-h-80 overflow-y-auto">
              {componentesFiltrados.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Nenhum componente encontrado.</div>
              ) : (
                componentesFiltrados.map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => carregarComponente(comp.id)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-100 ${
                      String(comp.id) === componenteSelecionadoId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="font-semibold">{comp.nome}</div>
                    <div className="text-sm text-gray-500">
                      ID: {comp.id} | Rendimento:{' '}
                      {comp.rendimento_final ?? '-'} {comp.unidade_rendimento ?? ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        <div className="space-y-8">
          <section className="border rounded p-6 bg-gray-50">
            <h2 className="text-2xl font-bold mb-4">2. Dados base</h2>

            {loadingComponente && (
              <div className="mb-4 text-sm text-gray-500">A carregar componente...</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="border px-3 py-2 rounded"
                placeholder="Nome do componente"
                disabled={!componenteSelecionadoId}
              />
              <input
                type="number"
                value={rendimentoFinal}
                onChange={(e) => setRendimentoFinal(e.target.value)}
                className="border px-3 py-2 rounded"
                placeholder="Rendimento final"
                disabled={!componenteSelecionadoId}
              />
              <select
                value={unidadeRendimento}
                onChange={(e) => setUnidadeRendimento(e.target.value)}
                className="border px-3 py-2 rounded"
                disabled={!componenteSelecionadoId}
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
              <h2 className="text-2xl font-bold">3. Ingredientes</h2>
              <button
                type="button"
                onClick={adicionarIngredienteComponente}
                disabled={!componenteSelecionadoId}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
              >
                + Adicionar
              </button>
            </div>

            {loadingIngredientes && (
              <div className="mb-4 text-sm text-gray-500">A carregar ingredientes...</div>
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
                  disabled={!componenteSelecionadoId}
                />
                <input
                  type="number"
                  value={item.quantidade}
                  onChange={(e) =>
                    atualizarIngredienteComponente(item.idLocal, 'quantidade', e.target.value)
                  }
                  className="border px-3 py-2 rounded"
                  placeholder="Qtd"
                  disabled={!componenteSelecionadoId}
                />
                <select
                  value={item.unidade}
                  onChange={(e) =>
                    atualizarIngredienteComponente(item.idLocal, 'unidade', e.target.value)
                  }
                  className="border px-3 py-2 rounded"
                  disabled={!componenteSelecionadoId}
                >
                  {unidades.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removerIngredienteComponente(item.idLocal)}
                  disabled={!componenteSelecionadoId}
                  className="bg-red-500 text-white rounded disabled:bg-gray-400"
                >
                  Remover
                </button>
              </div>
            ))}
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">4. Preparação (por ingrediente)</h2>
              <button
                type="button"
                onClick={adicionarTarefaPreparacao}
                disabled={!componenteSelecionadoId}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
              >
                + Tarefa
              </button>
            </div>

            {tarefasPreparacao.map((item) => (
              <div key={item.idLocal} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                <IngredientSearchSelect
                  ingredientes={ingredientes}
                  value={item.ingrediente_id}
                  onChange={(v) =>
                    atualizarTarefaPreparacao(item.idLocal, 'ingrediente_id', v)
                  }
                  disabled={!componenteSelecionadoId}
                />
                <input
                  type="text"
                  value={item.tarefa}
                  onChange={(e) =>
                    atualizarTarefaPreparacao(item.idLocal, 'tarefa', e.target.value)
                  }
                  className="border px-3 py-2 rounded"
                  placeholder="Tarefa"
                  disabled={!componenteSelecionadoId}
                />
                <input
                  type="number"
                  value={item.ordem}
                  onChange={(e) =>
                    atualizarTarefaPreparacao(item.idLocal, 'ordem', e.target.value)
                  }
                  className="border px-3 py-2 rounded w-20"
                  placeholder="Ordem"
                  disabled={!componenteSelecionadoId}
                />
                <button
                  type="button"
                  onClick={() => removerTarefaPreparacao(item.idLocal)}
                  disabled={!componenteSelecionadoId}
                  className="text-red-500 disabled:text-gray-400"
                >
                  X
                </button>
              </div>
            ))}
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">5. Confeção</h2>
              <button
                type="button"
                onClick={adicionarTarefaConfeccao}
                disabled={!componenteSelecionadoId}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
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
                  disabled={!componenteSelecionadoId}
                />
                <input
                  type="text"
                  value={item.tarefa}
                  onChange={(e) =>
                    atualizarTarefaConfeccao(item.idLocal, 'tarefa', e.target.value)
                  }
                  className="border px-3 py-2 rounded flex-1"
                  placeholder="Ex: Cozer o frango"
                  disabled={!componenteSelecionadoId}
                />
                <button
                  type="button"
                  onClick={() => removerTarefaConfeccao(item.idLocal)}
                  disabled={!componenteSelecionadoId}
                  className="text-red-500 disabled:text-gray-400"
                >
                  X
                </button>
              </div>
            ))}
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">6. Finalização</h2>
              <button
                type="button"
                onClick={adicionarTarefaFinalizacao}
                disabled={!componenteSelecionadoId}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
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
                  disabled={!componenteSelecionadoId}
                />
                <input
                  type="text"
                  value={item.tarefa}
                  onChange={(e) =>
                    atualizarTarefaFinalizacao(item.idLocal, 'tarefa', e.target.value)
                  }
                  className="border px-3 py-2 rounded flex-1"
                  placeholder="Ex: Adicionar sementes"
                  disabled={!componenteSelecionadoId}
                />
                <button
                  type="button"
                  onClick={() => removerTarefaFinalizacao(item.idLocal)}
                  disabled={!componenteSelecionadoId}
                  className="text-red-500 disabled:text-gray-400"
                >
                  X
                </button>
              </div>
            ))}
          </section>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={guardarAlteracoes}
              disabled={aGuardar || !componenteSelecionadoId}
              className="flex-1 py-4 bg-blue-700 text-white rounded-lg font-bold text-xl disabled:bg-gray-400"
            >
              {aGuardar ? 'A guardar...' : 'GUARDAR ALTERAÇÕES'}
            </button>

            <button
              type="button"
              onClick={limparFormulario}
              className="px-6 py-4 bg-gray-300 text-black rounded-lg font-bold"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

import { Suspense } from 'react'

export default function EditarComponentePageWrapper() {
  return (
    <Suspense fallback={<div className="p-8">A carregar...</div>}>
      <EditarComponentePage />
    </Suspense>
  )
}