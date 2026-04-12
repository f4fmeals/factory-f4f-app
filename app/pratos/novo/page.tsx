'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type ComponenteBase = {
  id: number
  nome: string
}

type PratoBase = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number
}

type PratoComComponentes = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number
  pratos_componentes: {
    componente_id: number
    quantidade_final: number
    unidade: string
    posicao_embalagem: string | null
    ordem: number
  }[]
}

type ComponentePratoForm = {
  idLocal: string
  componente_id: string
  quantidade_final: string
  unidade: string
  posicao_embalagem: string
  ordem: string
}

function gerarIdLocal() {
  return Math.random().toString(36).slice(2) + Date.now().toString()
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

type SearchableComponenteSelectProps = {
  componentes: ComponenteBase[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

function SearchableComponenteSelect({
  componentes,
  value,
  onChange,
  placeholder = 'Selecionar componente',
  disabled = false,
}: SearchableComponenteSelectProps) {
  const [aberto, setAberto] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const componenteSelecionado = useMemo(
    () => componentes.find((item) => String(item.id) === String(value)),
    [componentes, value]
  )

  const debouncedPesquisa = useDebouncedValue(pesquisa, 300)

  const componentesFiltrados = useMemo(() => {
    const termo = debouncedPesquisa.trim().toLowerCase()

    if (!termo) return componentes.slice(0, 30)

    return componentes
      .filter((item) => item.nome.toLowerCase().includes(termo))
      .slice(0, 30)
  }, [componentes, debouncedPesquisa])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setAberto(false)
        setPesquisa('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function abrirDropdown() {
    if (disabled) return
    setAberto(true)

    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  function selecionarComponente(id: string) {
    onChange(id)
    setAberto(false)
    setPesquisa('')
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={abrirDropdown}
        disabled={disabled}
        className="w-full border px-3 py-2 rounded bg-white text-left flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <span className={componenteSelecionado ? 'text-black' : 'text-gray-500'}>
          {componenteSelecionado ? componenteSelecionado.nome : placeholder}
        </span>
        <span className="ml-3 text-gray-500">▼</span>
      </button>

      {aberto && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded border bg-white shadow-lg">
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar componente..."
              className="w-full border px-3 py-2 rounded outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => selecionarComponente('')}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b"
            >
              {placeholder}
            </button>

            {debouncedPesquisa !== pesquisa ? (
              <div className="px-3 py-2 text-gray-500">
                A aguardar a digitação...
              </div>
            ) : componentes.length === 0 ? (
              <div className="px-3 py-2 text-gray-500">
                Nenhum componente disponível.
              </div>
            ) : componentesFiltrados.length > 0 ? (
              componentesFiltrados.map((componente) => (
                <button
                  key={componente.id}
                  type="button"
                  onClick={() => selecionarComponente(String(componente.id))}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    String(value) === String(componente.id)
                      ? 'bg-green-50 font-medium'
                      : ''
                  }`}
                >
                  {componente.nome}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500">
                Nenhum componente encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const unidades = ['g', 'kg', 'ml', 'l', 'un']
const prioridades = [1, 2, 3]

export default function NovoPratoPage() {
  const [nome, setNome] = useState('')
  const [sku, setSku] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [pesoFinal, setPesoFinal] = useState('')
  const [prioridadeEmbalamento, setPrioridadeEmbalamento] = useState('1')

  const [componentesBase, setComponentesBase] = useState<ComponenteBase[]>([])
  const [pratosBase, setPratosBase] = useState<PratoBase[]>([])
  const [loadingDados, setLoadingDados] = useState(true)

  const [pratoOrigemId, setPratoOrigemId] = useState('')
  const [aCopiarPrato, setACopiarPrato] = useState(false)

  const [componentesPrato, setComponentesPrato] = useState<ComponentePratoForm[]>([
    {
      idLocal: gerarIdLocal(),
      componente_id: '',
      quantidade_final: '',
      unidade: 'g',
      posicao_embalagem: '',
      ordem: '',
    },
  ])

  const [aGuardar, setAGuardar] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    fetchDadosBase()
  }, [])

  async function fetchDadosBase() {
    setLoadingDados(true)
    setMensagem('')

    const [componentesRes, pratosRes] = await Promise.all([
      supabase
        .from('componentes')
        .select('id, nome')
        .order('nome', { ascending: true }),
      supabase
        .from('pratos')
        .select('id, nome, sku, tamanho, peso_final, prioridade_embalamento')
        .order('nome', { ascending: true }),
    ])

    const { data: componentesData, error: componentesError } = componentesRes
    const { data: pratosData, error: pratosError } = pratosRes

    if (componentesError) {
      console.log('Erro ao carregar componentes:', componentesError)
      setComponentesBase([])
      setMensagem(`Erro ao carregar componentes: ${componentesError.message}`)
    } else {
      setComponentesBase((componentesData as ComponenteBase[]) || [])
    }

    if (pratosError) {
      console.log('Erro ao carregar pratos:', pratosError)
    } else {
      setPratosBase((pratosData as PratoBase[]) || [])
    }

    setLoadingDados(false)
  }

  function limparFormulario() {
    setNome('')
    setSku('')
    setTamanho('')
    setPesoFinal('')
    setPrioridadeEmbalamento('1')
    setPratoOrigemId('')

    setComponentesPrato([
      {
        idLocal: gerarIdLocal(),
        componente_id: '',
        quantidade_final: '',
        unidade: 'g',
        posicao_embalagem: '',
        ordem: '',
      },
    ])
  }

  function adicionarComponentePrato() {
    setComponentesPrato((prev) => [
      ...prev,
      {
        idLocal: gerarIdLocal(),
        componente_id: '',
        quantidade_final: '',
        unidade: 'g',
        posicao_embalagem: '',
        ordem: '',
      },
    ])
  }

  function removerComponentePrato(idLocal: string) {
    setComponentesPrato((prev) => prev.filter((item) => item.idLocal !== idLocal))
  }

  function atualizarComponentePrato(
    idLocal: string,
    campo: keyof ComponentePratoForm,
    valor: string
  ) {
    setComponentesPrato((prev) =>
      prev.map((item) =>
        item.idLocal === idLocal ? { ...item, [campo]: valor } : item
      )
    )
  }

  async function copiarDePratoExistente() {
    setMensagem('')

    if (!pratoOrigemId) {
      setMensagem('Seleciona um prato para copiar.')
      return
    }

    setACopiarPrato(true)

    const { data, error } = await supabase
      .from('pratos')
      .select(`
        id,
        nome,
        sku,
        tamanho,
        peso_final,
        prioridade_embalamento,
        pratos_componentes (
          componente_id,
          quantidade_final,
          unidade,
          posicao_embalagem,
          ordem
        )
      `)
      .eq('id', Number(pratoOrigemId))
      .single()

    if (error || !data) {
      console.log('Erro ao copiar prato:', error)
      setMensagem(`Erro ao carregar o prato: ${error?.message || 'sem detalhe'}`)
      setACopiarPrato(false)
      return
    }

    const prato = data as PratoComComponentes

    setNome(`${prato.nome} - cópia`)
    setSku('')
    setTamanho(prato.tamanho || '')
    setPesoFinal(prato.peso_final ? String(prato.peso_final) : '')
    setPrioridadeEmbalamento(
      prato.prioridade_embalamento
        ? String(prato.prioridade_embalamento)
        : '1'
    )

    if (prato.pratos_componentes?.length > 0) {
      const componentesConvertidos: ComponentePratoForm[] = prato.pratos_componentes
        .sort((a, b) => a.ordem - b.ordem)
        .map((item) => ({
          idLocal: gerarIdLocal(),
          componente_id: String(item.componente_id),
          quantidade_final: String(item.quantidade_final),
          unidade: item.unidade || 'g',
          posicao_embalagem: item.posicao_embalagem || '',
          ordem: String(item.ordem),
        }))

      setComponentesPrato(componentesConvertidos)
    } else {
      setComponentesPrato([
        {
          idLocal: gerarIdLocal(),
          componente_id: '',
          quantidade_final: '',
          unidade: 'g',
          posicao_embalagem: '',
          ordem: '',
        },
      ])
    }

    setMensagem('Prato copiado com sucesso. Ajusta os dados e guarda como novo.')
    setACopiarPrato(false)
  }

  function validarFormulario() {
    if (!nome.trim()) return 'O nome do prato é obrigatório.'
    if (!sku.trim()) return 'O SKU é obrigatório.'
    if (!tamanho.trim()) return 'O tamanho é obrigatório.'

    if (!pesoFinal.trim() || Number(pesoFinal) <= 0) {
      return 'O peso final tem de ser maior que 0.'
    }

    if (!prioridadeEmbalamento || ![1, 2, 3].includes(Number(prioridadeEmbalamento))) {
      return 'A prioridade de embalamento tem de ser 1, 2 ou 3.'
    }

    const componentesPreenchidos = componentesPrato.filter(
      (item) =>
        item.componente_id ||
        item.quantidade_final.trim() ||
        item.unidade.trim() ||
        item.posicao_embalagem.trim() ||
        item.ordem.trim()
    )

    if (componentesPreenchidos.length === 0) {
      return 'Tens de adicionar pelo menos um componente ao prato.'
    }

    for (const item of componentesPreenchidos) {
      if (!item.componente_id) {
        return 'Todos os componentes do prato têm de ter um componente selecionado.'
      }

      if (!item.quantidade_final.trim() || Number(item.quantidade_final) <= 0) {
        return 'Todos os componentes do prato têm de ter quantidade final maior que 0.'
      }

      if (!item.unidade.trim()) {
        return 'Todos os componentes do prato têm de ter unidade.'
      }

      if (!item.ordem.trim() || Number(item.ordem) <= 0) {
        return 'Todos os componentes do prato têm de ter uma ordem maior que 0.'
      }
    }

    const ids = componentesPreenchidos.map((item) => item.componente_id)
    const idsUnicos = new Set(ids)

    if (ids.length !== idsUnicos.size) {
      return 'Não podes repetir o mesmo componente no mesmo prato.'
    }

    return ''
  }

  async function guardarPrato() {
    setMensagem('')

    const erroValidacao = validarFormulario()
    if (erroValidacao) {
      setMensagem(erroValidacao)
      return
    }

    setAGuardar(true)

    const { data: pratoCriado, error: erroPrato } = await supabase
      .from('pratos')
      .insert([
        {
          nome: nome.trim(),
          sku: sku.trim(),
          tamanho: tamanho.trim(),
          peso_final: Number(pesoFinal),
          prioridade_embalamento: Number(prioridadeEmbalamento),
        },
      ])
      .select('id')
      .single()

    if (erroPrato || !pratoCriado) {
      console.log('Erro ao guardar prato:', erroPrato)
      setMensagem(`Erro ao guardar o prato: ${erroPrato?.message || 'sem detalhe'}`)
      setAGuardar(false)
      return
    }

    const pratoId = pratoCriado.id

    const componentesValidos = componentesPrato
      .filter(
        (item) =>
          item.componente_id &&
          item.quantidade_final.trim() &&
          item.unidade.trim() &&
          item.ordem.trim()
      )
      .map((item) => ({
        prato_id: pratoId,
        componente_id: Number(item.componente_id),
        quantidade_final: Number(item.quantidade_final),
        unidade: item.unidade.trim(),
        posicao_embalagem: item.posicao_embalagem.trim() || null,
        ordem: Number(item.ordem),
      }))

    if (componentesValidos.length > 0) {
      const { error } = await supabase
        .from('pratos_componentes')
        .insert(componentesValidos)

      if (error) {
        console.log('Erro ao guardar pratos_componentes:', error)
        setMensagem(
          `O prato foi criado, mas houve erro ao guardar os componentes do prato: ${error.message}`
        )
        setAGuardar(false)
        return
      }
    }

    setMensagem('Prato guardado com sucesso!')
    limparFormulario()
    setAGuardar(false)
  }

  const componentesSelecionados = useMemo(() => {
    return new Set(
      componentesPrato
        .map((item) => item.componente_id)
        .filter((item) => item !== '')
    )
  }, [componentesPrato])

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Novo prato</h1>

          <Link
            href="/"
            className="px-4 py-2 rounded bg-gray-200 text-black font-medium"
          >
            Voltar
          </Link>
        </div>

        {loadingDados ? (
          <div className="border rounded p-4 bg-yellow-50 mb-6">
            A carregar componentes...
          </div>
        ) : componentesBase.length === 0 ? (
          <div className="border rounded p-4 bg-yellow-50 mb-6">
            Não existem componentes criados na tabela <strong>componentes</strong>.
            Cria primeiro um componente.
          </div>
        ) : null}

        {mensagem && (
          <div className="border rounded p-4 bg-white mb-6">
            <p>{mensagem}</p>
          </div>
        )}

        <div className="space-y-8">
          <section className="border rounded p-6 bg-blue-50">
            <h2 className="text-2xl font-bold mb-4">0. Criar a partir de prato existente</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block mb-2 font-medium">Escolher prato</label>
                <select
                  value={pratoOrigemId}
                  onChange={(e) => setPratoOrigemId(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                  disabled={loadingDados || pratosBase.length === 0 || aCopiarPrato}
                >
                  <option value="">Selecionar prato existente</option>
                  {pratosBase.map((prato) => (
                    <option key={prato.id} value={prato.id}>
                      {prato.nome} {prato.tamanho ? `(${prato.tamanho})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={copiarDePratoExistente}
                  disabled={!pratoOrigemId || aCopiarPrato || loadingDados}
                  className="w-full px-4 py-2 rounded bg-blue-600 text-white font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {aCopiarPrato ? 'A copiar...' : 'Copiar prato'}
                </button>
              </div>
            </div>
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <h2 className="text-2xl font-bold mb-4">1. Dados base do prato</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 font-medium">Nome do prato</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                  placeholder="Ex: Frango com arroz"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                  placeholder="Ex: FRANGO-ARROZ-L"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Tamanho</label>
                <input
                  type="text"
                  value={tamanho}
                  onChange={(e) => setTamanho(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                  placeholder="Ex: L"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Peso final</label>
                <input
                  type="number"
                  value={pesoFinal}
                  onChange={(e) => setPesoFinal(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                  placeholder="Ex: 350"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Prioridade de embalamento</label>
                <select
                  value={prioridadeEmbalamento}
                  onChange={(e) => setPrioridadeEmbalamento(e.target.value)}
                  className="w-full border px-3 py-2 rounded bg-white"
                >
                  {prioridades.map((prioridade) => (
                    <option key={prioridade} value={prioridade}>
                      {prioridade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="border rounded p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
              <h2 className="text-2xl font-bold">2. Componentes do prato</h2>

              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/componentes/novo"
                  className="px-4 py-2 rounded bg-blue-600 text-white font-medium"
                >
                  + Novo componente
                </Link>

                <button
                  type="button"
                  onClick={adicionarComponentePrato}
                  className="px-4 py-2 rounded text-white"
                  style={{ backgroundColor: '#80c944' }}
                >
                  + Adicionar componente
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {componentesPrato.map((item, index) => {
                const componentesDaLinha = componentesBase.filter((componente) => {
                  return (
                    String(componente.id) === String(item.componente_id) ||
                    !componentesSelecionados.has(String(componente.id))
                  )
                })

                return (
                  <div
                    key={item.idLocal}
                    className="border rounded p-4 bg-white grid grid-cols-1 md:grid-cols-5 gap-4"
                  >
                    <div>
                      <label className="block mb-2 font-medium">
                        Componente {index + 1}
                      </label>
                      <SearchableComponenteSelect
                        componentes={componentesDaLinha}
                        value={item.componente_id}
                        onChange={(value) =>
                          atualizarComponentePrato(item.idLocal, 'componente_id', value)
                        }
                        placeholder="Selecionar componente"
                        disabled={loadingDados}
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Quantidade final</label>
                      <input
                        type="number"
                        value={item.quantidade_final}
                        onChange={(e) =>
                          atualizarComponentePrato(
                            item.idLocal,
                            'quantidade_final',
                            e.target.value
                          )
                        }
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Ex: 120"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Unidade</label>
                      <select
                        value={item.unidade}
                        onChange={(e) =>
                          atualizarComponentePrato(item.idLocal, 'unidade', e.target.value)
                        }
                        className="w-full border px-3 py-2 rounded bg-white"
                      >
                        {unidades.map((unidade) => (
                          <option key={unidade} value={unidade}>
                            {unidade}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Posição na embalagem</label>
                      <input
                        type="text"
                        value={item.posicao_embalagem}
                        onChange={(e) =>
                          atualizarComponentePrato(
                            item.idLocal,
                            'posicao_embalagem',
                            e.target.value
                          )
                        }
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Ex: esquerda / direita / por cima"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Ordem</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={item.ordem}
                          onChange={(e) =>
                            atualizarComponentePrato(item.idLocal, 'ordem', e.target.value)
                          }
                          className="w-full border px-3 py-2 rounded"
                          placeholder="Ex: 1"
                        />
                        <button
                          type="button"
                          onClick={() => removerComponentePrato(item.idLocal)}
                          className="px-4 py-2 rounded bg-red-600 text-white"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={guardarPrato}
              disabled={aGuardar}
              className="text-white px-6 py-3 rounded font-medium"
              style={{ backgroundColor: '#80c944' }}
            >
              {aGuardar ? 'A guardar...' : 'Guardar prato'}
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