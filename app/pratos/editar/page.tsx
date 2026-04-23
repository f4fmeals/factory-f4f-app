'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Prato = {
  id: number
  nome: string
  sku: string
  tamanho: string
  peso_final: number
  prioridade_embalamento: number | null
  categoria_prato: string | null
}

type ComponenteBase = {
  id: number
  nome: string
}

type PratoComponenteDB = {
  id: number
  prato_id: number
  componente_id: number
  quantidade_final: number | string
  unidade: string | null
  posicao_embalagem: string | null
  ordem: number | string
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

type SearchablePratoSelectProps = {
  pratos: Prato[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  minChars?: number
}

function SearchablePratoSelect({
  pratos,
  value,
  onChange,
  placeholder = 'Selecionar prato',
  disabled = false,
  minChars = 2,
}: SearchablePratoSelectProps) {
  const [aberto, setAberto] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const pratoSelecionado = useMemo(
    () => pratos.find((item) => String(item.id) === String(value)),
    [pratos, value]
  )

  const debouncedPesquisa = useDebouncedValue(pesquisa, 300)

  const termo = debouncedPesquisa.trim().toLowerCase()
  const podeMostrarResultados = termo.length >= minChars

  const pratosFiltrados = useMemo(() => {
    if (!podeMostrarResultados) return []

    return pratos
      .filter((item) => {
        const nome = item.nome?.toLowerCase() || ''
        const sku = item.sku?.toLowerCase() || ''
        return nome.includes(termo) || sku.includes(termo)
      })
      .slice(0, 30)
  }, [pratos, termo, podeMostrarResultados])

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

  function selecionarPrato(id: string) {
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
        <span className={pratoSelecionado ? 'text-black' : 'text-gray-500'}>
          {pratoSelecionado
            ? `${pratoSelecionado.nome} (${pratoSelecionado.sku})`
            : placeholder}
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
              placeholder="Pesquisar por nome ou SKU..."
              className="w-full border px-3 py-2 rounded outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => selecionarPrato('')}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b"
            >
              {placeholder}
            </button>

            {debouncedPesquisa !== pesquisa ? (
              <div className="px-3 py-2 text-gray-500">A aguardar a digitação...</div>
            ) : pratos.length === 0 ? (
              <div className="px-3 py-2 text-gray-500">Nenhum prato disponível.</div>
            ) : !podeMostrarResultados ? (
              <div className="px-3 py-2 text-gray-500">
                Escreve pelo menos {minChars} caracteres para pesquisar.
              </div>
            ) : pratosFiltrados.length > 0 ? (
              pratosFiltrados.map((prato) => (
                <button
                  key={prato.id}
                  type="button"
                  onClick={() => selecionarPrato(String(prato.id))}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    String(value) === String(prato.id) ? 'bg-green-50 font-medium' : ''
                  }`}
                >
                  <div>{prato.nome}</div>
                  <div className="text-sm text-gray-500">{prato.sku}</div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500">Nenhum prato encontrado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
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
              <div className="px-3 py-2 text-gray-500">A aguardar a digitação...</div>
            ) : componentes.length === 0 ? (
              <div className="px-3 py-2 text-gray-500">Nenhum componente disponível.</div>
            ) : componentesFiltrados.length > 0 ? (
              componentesFiltrados.map((componente) => (
                <button
                  key={componente.id}
                  type="button"
                  onClick={() => selecionarComponente(String(componente.id))}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    String(value) === String(componente.id) ? 'bg-green-50 font-medium' : ''
                  }`}
                >
                  {componente.nome}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500">Nenhum componente encontrado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const unidades = ['g', 'kg', 'ml', 'l', 'un']
const prioridades = [1, 2, 3]
const categorias = [
  'Pratos principais',
  'Pratos leves',
  'Pequenos almoços',
  'Doces',
  'Sumos',
  'Unidoses',
]

export default function EditarPratosPage() {
  const [pratos, setPratos] = useState<Prato[]>([])
  const [componentesBase, setComponentesBase] = useState<ComponenteBase[]>([])

  const [loadingInicial, setLoadingInicial] = useState(true)
  const [carregandoPrato, setCarregandoPrato] = useState(false)
  const [aGuardar, setAGuardar] = useState(false)
  const [aApagar, setAApagar] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [pratoSelecionadoId, setPratoSelecionadoId] = useState('')

  const [nome, setNome] = useState('')
  const [sku, setSku] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [pesoFinal, setPesoFinal] = useState('')
  const [prioridadeEmbalamento, setPrioridadeEmbalamento] = useState('1')
  const [categoriaPrato, setCategoriaPrato] = useState('')

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

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  async function carregarDadosIniciais() {
    setLoadingInicial(true)
    setMensagem('')

    const { data: pratosData, error: pratosError } = await supabase
      .from('pratos')
      .select('id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato')
      .order('nome', { ascending: true })

    const { data: componentesData, error: componentesError } = await supabase
      .from('componentes')
      .select('id, nome')
      .order('nome', { ascending: true })

    if (pratosError) {
      console.log('Erro ao carregar pratos:', pratosError)
      setMensagem(`Erro ao carregar pratos: ${pratosError.message}`)
      setPratos([])
    } else {
      setPratos((pratosData as Prato[]) || [])
    }

    if (componentesError) {
      console.log('Erro ao carregar componentes:', componentesError)
      setMensagem((prev) =>
        prev
          ? `${prev} | Erro ao carregar componentes: ${componentesError.message}`
          : `Erro ao carregar componentes: ${componentesError.message}`
      )
      setComponentesBase([])
    } else {
      setComponentesBase((componentesData as ComponenteBase[]) || [])
    }

    setLoadingInicial(false)
  }

  function limparFormulario() {
    setNome('')
    setSku('')
    setTamanho('')
    setPesoFinal('')
    setPrioridadeEmbalamento('1')
    setCategoriaPrato('')
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

  async function carregarPratoCompleto(pratoId: string) {
    if (!pratoId) {
      limparFormulario()
      return
    }

    setCarregandoPrato(true)
    setMensagem('')

    const { data: pratoData, error: pratoError } = await supabase
      .from('pratos')
      .select('id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato')
      .eq('id', Number(pratoId))
      .single()

    if (pratoError || !pratoData) {
      console.log('Erro ao carregar prato:', pratoError)
      setMensagem(
        `Erro ao carregar os dados base do prato: ${pratoError?.message || 'sem detalhe'}`
      )
      setCarregandoPrato(false)
      return
    }

    const { data: pratoComponentesData, error: pratoComponentesError } =
      await supabase
        .from('pratos_componentes')
        .select('id, prato_id, componente_id, quantidade_final, unidade, posicao_embalagem, ordem')
        .eq('prato_id', Number(pratoId))
        .order('ordem', { ascending: true })

    if (pratoComponentesError) {
      console.log('Erro ao carregar pratos_componentes:', pratoComponentesError)
      setMensagem(`Erro ao carregar componentes do prato: ${pratoComponentesError.message}`)
      setCarregandoPrato(false)
      return
    }

    setNome(pratoData.nome || '')
    setSku(pratoData.sku || '')
    setTamanho(pratoData.tamanho || '')
    setPesoFinal(String(pratoData.peso_final || ''))
    setPrioridadeEmbalamento(String(pratoData.prioridade_embalamento || 1))
    setCategoriaPrato(pratoData.categoria_prato || '')

    const componentesPratoConvertidos = ((pratoComponentesData as PratoComponenteDB[]) || []).map(
      (item) => ({
        idLocal: gerarIdLocal(),
        componente_id: String(item.componente_id ?? ''),
        quantidade_final: String(item.quantidade_final ?? ''),
        unidade: item.unidade || 'g',
        posicao_embalagem: item.posicao_embalagem || '',
        ordem: String(item.ordem ?? ''),
      })
    )

    setComponentesPrato(
      componentesPratoConvertidos.length > 0
        ? componentesPratoConvertidos
        : [
            {
              idLocal: gerarIdLocal(),
              componente_id: '',
              quantidade_final: '',
              unidade: 'g',
              posicao_embalagem: '',
              ordem: '',
            },
          ]
    )

    setCarregandoPrato(false)
  }

  function validarFormulario() {
    if (!pratoSelecionadoId) return 'Seleciona um prato.'
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

  async function guardarAlteracoes() {
    setMensagem('')

    const erroValidacao = validarFormulario()
    if (erroValidacao) {
      setMensagem(erroValidacao)
      return
    }

    setAGuardar(true)

    const pratoId = Number(pratoSelecionadoId)

    const { error: erroUpdatePrato } = await supabase
      .from('pratos')
      .update({
        nome: nome.trim(),
        sku: sku.trim(),
        tamanho: tamanho.trim(),
        peso_final: Number(pesoFinal),
        prioridade_embalamento: Number(prioridadeEmbalamento),
        categoria_prato: categoriaPrato || null,
      })
      .eq('id', pratoId)

    if (erroUpdatePrato) {
      console.log('Erro ao atualizar prato:', erroUpdatePrato)
      setMensagem(`Erro ao atualizar os dados base do prato: ${erroUpdatePrato.message}`)
      setAGuardar(false)
      return
    }

    const { error: erroDeletePratoComponentes } = await supabase
      .from('pratos_componentes')
      .delete()
      .eq('prato_id', pratoId)

    if (erroDeletePratoComponentes) {
      console.log('Erro ao limpar pratos_componentes:', erroDeletePratoComponentes)
      setMensagem(`Erro ao limpar componentes antigos do prato: ${erroDeletePratoComponentes.message}`)
      setAGuardar(false)
      return
    }

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
      const { error } = await supabase.from('pratos_componentes').insert(componentesValidos)

      if (error) {
        console.log('Erro ao inserir pratos_componentes:', error)
        setMensagem(`Erro ao gravar os componentes do prato: ${error.message}`)
        setAGuardar(false)
        return
      }
    }

    setMensagem('Alterações guardadas com sucesso.')
    setAGuardar(false)
    await carregarDadosIniciais()
    await carregarPratoCompleto(pratoSelecionadoId)
  }

  async function eliminarPratoCompleto() {
    if (!pratoSelecionadoId) {
      setMensagem('Seleciona um prato para eliminar.')
      return
    }

    const pratoAtual = pratos.find((p) => String(p.id) === pratoSelecionadoId)
    const nomePrato = pratoAtual?.nome || 'este prato'

    const confirmar = window.confirm(
      `Tens a certeza que queres eliminar "${nomePrato}"?\n\nIsto vai apagar:\n- o prato\n- componentes do prato\n- linhas de produção associadas a esse prato`
    )

    if (!confirmar) return

    setMensagem('')
    setAApagar(true)

    const pratoId = Number(pratoSelecionadoId)

    const { error: erroProdItens } = await supabase
      .from('producoes_semanais_itens')
      .delete()
      .eq('prato_id', pratoId)

    if (erroProdItens) {
      console.log('Erro ao apagar producoes_semanais_itens:', erroProdItens)
      setMensagem(`Erro ao apagar linhas de produção ligadas ao prato: ${erroProdItens.message}`)
      setAApagar(false)
      return
    }

    const { error: erroPratoComponentes } = await supabase
      .from('pratos_componentes')
      .delete()
      .eq('prato_id', pratoId)

    if (erroPratoComponentes) {
      console.log('Erro ao apagar pratos_componentes:', erroPratoComponentes)
      setMensagem(`Erro ao apagar componentes do prato: ${erroPratoComponentes.message}`)
      setAApagar(false)
      return
    }

    const { error: erroPrato } = await supabase
      .from('pratos')
      .delete()
      .eq('id', pratoId)

    if (erroPrato) {
      console.log('Erro ao apagar prato:', erroPrato)
      setMensagem(`Erro ao apagar o prato: ${erroPrato.message}`)
      setAApagar(false)
      return
    }

    setMensagem(`Prato "${nomePrato}" eliminado com sucesso.`)
    setAApagar(false)
    setPratoSelecionadoId('')
    limparFormulario()
    await carregarDadosIniciais()
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
      prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))
    )
  }

  const componentesSelecionados = useMemo(() => {
    return new Set(
      componentesPrato.map((item) => item.componente_id).filter((item) => item !== '')
    )
  }, [componentesPrato])

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Editar pratos</h1>
          <div className="flex gap-3">
            <Link
              href="/pratos/novo"
              className="px-4 py-2 rounded text-white font-medium"
              style={{ backgroundColor: '#80c944' }}
            >
              Novo prato
            </Link>
            <Link href="/gestao" className="px-4 py-2 rounded bg-gray-200 text-black font-medium">
              Voltar
            </Link>
          </div>
        </div>

        {mensagem && (
          <div className="border rounded p-4 bg-white mb-6">
            <p>{mensagem}</p>
          </div>
        )}

        {loadingInicial ? (
          <div className="border rounded p-4 bg-gray-50">
            <p>A carregar dados...</p>
          </div>
        ) : (
          <>
            <section className="border rounded p-6 bg-gray-50 mb-8">
              <h2 className="text-2xl font-bold mb-4">1. Escolher prato</h2>
              <div className="max-w-xl">
                <label className="block mb-2 font-medium">Prato</label>
                <SearchablePratoSelect
                  pratos={pratos}
                  value={pratoSelecionadoId}
                  onChange={async (novoId) => {
                    setPratoSelecionadoId(novoId)
                    await carregarPratoCompleto(novoId)
                  }}
                  placeholder="Selecionar prato"
                  minChars={2}
                />
              </div>
            </section>

            {pratoSelecionadoId && (
              <>
                {carregandoPrato ? (
                  <div className="border rounded p-4 bg-gray-50 mb-8">
                    <p>A carregar prato...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <section className="border rounded p-6 bg-gray-50">
                      <h2 className="text-2xl font-bold mb-4">2. Dados base do prato</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block mb-2 font-medium">Nome do prato</label>
                          <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full border px-3 py-2 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block mb-2 font-medium">SKU</label>
                          <input
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            className="w-full border px-3 py-2 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block mb-2 font-medium">Tamanho</label>
                          <input
                            type="text"
                            value={tamanho}
                            onChange={(e) => setTamanho(e.target.value)}
                            className="w-full border px-3 py-2 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block mb-2 font-medium">Peso final</label>
                          <input
                            type="number"
                            value={pesoFinal}
                            onChange={(e) => setPesoFinal(e.target.value)}
                            className="w-full border px-3 py-2 rounded bg-white"
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
                        <div>
                          <label className="block mb-2 font-medium">Categoria do prato</label>
                          <select
                            value={categoriaPrato}
                            onChange={(e) => setCategoriaPrato(e.target.value)}
                            className="w-full border px-3 py-2 rounded bg-white"
                          >
                            <option value="">Selecionar categoria</option>
                            {categorias.map((categoria) => (
                              <option key={categoria} value={categoria}>
                                {categoria}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </section>

                    <section className="border rounded p-6 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">3. Componentes do prato</h2>
                        <button
                          type="button"
                          onClick={adicionarComponentePrato}
                          className="px-4 py-2 rounded text-white"
                          style={{ backgroundColor: '#80c944' }}
                        >
                          + Adicionar componente
                        </button>
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
                                />
                              </div>
                              <div>
                                <label className="block mb-2 font-medium">Quantidade final</label>
                                <input
                                  type="number"
                                  value={item.quantidade_final}
                                  onChange={(e) =>
                                    atualizarComponentePrato(item.idLocal, 'quantidade_final', e.target.value)
                                  }
                                  className="w-full border px-3 py-2 rounded"
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
                                    atualizarComponentePrato(item.idLocal, 'posicao_embalagem', e.target.value)
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

                    <div className="flex flex-wrap gap-3 pb-8">
                      <button
                        type="button"
                        onClick={guardarAlteracoes}
                        disabled={aGuardar}
                        className="text-white px-6 py-3 rounded font-medium"
                        style={{ backgroundColor: '#80c944' }}
                      >
                        {aGuardar ? 'A guardar...' : 'Guardar alterações'}
                      </button>
                      <button
                        type="button"
                        onClick={eliminarPratoCompleto}
                        disabled={aApagar}
                        className="px-6 py-3 rounded bg-red-600 text-white font-medium"
                      >
                        {aApagar ? 'A eliminar...' : 'Eliminar prato completo'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}