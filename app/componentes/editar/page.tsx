'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type Ingrediente = { id: number; nome: string }
type Componente = { id: number; nome: string; rendimento_final: number | null; unidade_rendimento: string | null }
type ComponenteIngredienteForm = { idLocal: string; id?: number; ingrediente_id: string; quantidade: string; unidade: string; observacoes: string }
type TarefaPreparacaoForm = { idLocal: string; id?: number; ingrediente_id: string; ordem: string; tarefa: string; observacoes: string }
type TarefaComponenteForm = { idLocal: string; id?: number; ordem: string; tarefa: string; observacoes: string }
type ComponenteIngredienteCriado = { id: number; componente_id: number; ingrediente_id: number }

function gerarIdLocal() { return Math.random().toString(36).slice(2) + Date.now().toString() }
function formatarNomeIngrediente(ingrediente?: Ingrediente | null) { if (!ingrediente) return ''; return ingrediente.nome }

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => { const timer = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(timer) }, [value, delay])
  return debouncedValue
}

function IngredientSearchSelect({ ingredientes, value, onChange, placeholder = 'Pesquisar ingrediente...', disabled = false }: { ingredientes: Ingrediente[]; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const ingredienteSelecionado = useMemo(() => ingredientes.find((item) => String(item.id) === String(value)), [ingredientes, value])
  const debouncedQuery = useDebouncedValue(query, 300)
  useEffect(() => { if (ingredienteSelecionado && !isOpen) setQuery(formatarNomeIngrediente(ingredienteSelecionado)); if (!value && !isOpen) setQuery('') }, [ingredienteSelecionado, value, isOpen])
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && event.target instanceof Node && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
        if (ingredienteSelecionado) setQuery(formatarNomeIngrediente(ingredienteSelecionado)); else setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ingredienteSelecionado])
  const ingredientesFiltrados = useMemo(() => { const termo = debouncedQuery.trim().toLowerCase(); if (!termo) return ingredientes.slice(0, 20); return ingredientes.filter((item) => (item.nome?.toLowerCase() || '').includes(termo)).slice(0, 20) }, [ingredientes, debouncedQuery])
  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input type="text" value={query} placeholder={placeholder} disabled={disabled}
        onFocus={() => { if (disabled) return; setIsOpen(true); if (ingredienteSelecionado) setQuery('') }}
        onChange={(e) => { if (disabled) return; setQuery(e.target.value); setIsOpen(true); if (value) onChange('') }}
        style={{ width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', background: disabled ? '#f3f4f6' : '#fff', color: '#111', boxSizing: 'border-box' }}
        autoComplete="off" />
      {isOpen && !disabled && (
        <div style={{ position: 'absolute', zIndex: 30, marginTop: '4px', width: '100%', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '260px', overflowY: 'auto' }}>
          <button type="button" onClick={() => { onChange(''); setQuery(''); setIsOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', borderBottom: '1px solid #e5e7eb', background: 'none', cursor: 'pointer' }}>Limpar seleção</button>
          {debouncedQuery !== query && <div style={{ padding: '8px 12px', fontSize: '13px', color: '#9ca3af' }}>A aguardar...</div>}
          {debouncedQuery === query && ingredientesFiltrados.length === 0 && <div style={{ padding: '8px 12px', fontSize: '13px', color: '#9ca3af' }}>Nenhum ingrediente encontrado.</div>}
          {debouncedQuery === query && ingredientesFiltrados.map((ing) => (
            <button key={ing.id} type="button" onClick={() => { onChange(String(ing.id)); setQuery(formatarNomeIngrediente(ing)); setIsOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '14px', background: 'none', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              {formatarNomeIngrediente(ing)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const unidades = ['g', 'kg', 'ml', 'l', 'un']

const inputStyle = { width: '100%', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', color: '#111', background: '#fff', boxSizing: 'border-box' as const }
const inputDisabledStyle = { ...inputStyle, background: '#f3f4f6', color: '#9ca3af' }
const labelStyle = { fontSize: '13px', color: '#374151', marginBottom: '6px', display: 'block' }
const sectionStyle = { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '24px', background: '#f9fafb', marginBottom: '24px' }
const sectionTitleStyle = { fontSize: '20px', fontWeight: '700', color: '#111', margin: '0 0 20px 0' }

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
  const [componentesIngredientes, setComponentesIngredientes] = useState<ComponenteIngredienteForm[]>([{ idLocal: gerarIdLocal(), ingrediente_id: '', quantidade: '', unidade: 'g', observacoes: '' }])
  const [tarefasPreparacao, setTarefasPreparacao] = useState<TarefaPreparacaoForm[]>([{ idLocal: gerarIdLocal(), ingrediente_id: '', ordem: '', tarefa: '', observacoes: '' }])
  const [tarefasConfeccao, setTarefasConfeccao] = useState<TarefaComponenteForm[]>([{ idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }])
  const [tarefasFinalizacao, setTarefasFinalizacao] = useState<TarefaComponenteForm[]>([{ idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }])
  const [mensagem, setMensagem] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    async function init() {
      await fetchComponentes()
      await fetchIngredientes()
      const idParam = searchParams.get('id')
      if (idParam) { const idNumero = Number(idParam); if (!isNaN(idNumero) && idNumero > 0) await carregarComponente(idNumero) }
    }
    init()
  }, [])

  async function fetchComponentes() {
    setLoadingComponentes(true)
    const { data, error } = await supabase.from('componentes').select('id, nome, rendimento_final, unidade_rendimento').order('nome', { ascending: true })
    if (error) { setMensagem(`Erro ao carregar componentes: ${error.message}`); setComponentes([]) } else setComponentes((data as Componente[]) || [])
    setLoadingComponentes(false)
  }

  async function fetchIngredientes() {
    setLoadingIngredientes(true)
    const { data, error } = await supabase.from('ingredientes').select('id, nome').order('nome', { ascending: true })
    if (error) { setMensagem(`Erro ao carregar ingredientes: ${error.message}`); setIngredientes([]) } else setIngredientes((data as Ingrediente[]) || [])
    setLoadingIngredientes(false)
  }

  function limparFormulario() {
    setComponenteSelecionadoId(''); setNome(''); setRendimentoFinal(''); setUnidadeRendimento('g')
    setComponentesIngredientes([{ idLocal: gerarIdLocal(), ingrediente_id: '', quantidade: '', unidade: 'g', observacoes: '' }])
    setTarefasPreparacao([{ idLocal: gerarIdLocal(), ingrediente_id: '', ordem: '', tarefa: '', observacoes: '' }])
    setTarefasConfeccao([{ idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }])
    setTarefasFinalizacao([{ idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }])
  }

  const componentesFiltrados = useMemo(() => {
    const termo = pesquisaDebounced.trim().toLowerCase()
    if (!termo) return componentes.slice(0, 30)
    return componentes.filter((item) => item.nome?.toLowerCase().includes(termo)).slice(0, 30)
  }, [componentes, pesquisaDebounced])

  async function carregarComponente(componenteId: number) {
    setMensagem(''); setLoadingComponente(true)
    try {
      const { data: componenteData, error: erroComponente } = await supabase.from('componentes').select('id, nome, rendimento_final, unidade_rendimento').eq('id', componenteId).single()
      if (erroComponente || !componenteData) { setMensagem(`Erro ao carregar componente: ${erroComponente?.message || 'sem detalhe'}`); setLoadingComponente(false); return }
      setComponenteSelecionadoId(String(componenteData.id)); setNome(componenteData.nome || '')
      setRendimentoFinal(componenteData.rendimento_final !== null && componenteData.rendimento_final !== undefined ? String(componenteData.rendimento_final) : '')
      setUnidadeRendimento(componenteData.unidade_rendimento || 'g')
      const { data: ingredientesData, error: erroIngredientes } = await supabase.from('componente_ingredientes').select('id, componente_id, ingrediente_id, quantidade, unidade').eq('componente_id', componenteId).order('id', { ascending: true })
      if (erroIngredientes) { setMensagem(`Erro ao carregar ingredientes: ${erroIngredientes.message}`); setLoadingComponente(false); return }
      setComponentesIngredientes(ingredientesData && ingredientesData.length > 0 ? ingredientesData.map((item: any) => ({ idLocal: gerarIdLocal(), id: item.id, ingrediente_id: item.ingrediente_id ? String(item.ingrediente_id) : '', quantidade: item.quantidade !== null && item.quantidade !== undefined ? String(item.quantidade) : '', unidade: item.unidade || 'g', observacoes: '' })) : [{ idLocal: gerarIdLocal(), ingrediente_id: '', quantidade: '', unidade: 'g', observacoes: '' }])
      const mapaCompIngIdParaIngredienteId = new Map<number, number>()
      for (const item of (ingredientesData || []) as any[]) mapaCompIngIdParaIngredienteId.set(Number(item.id), Number(item.ingrediente_id))
      const { data: tarefasPrepData, error: erroPrep } = await supabase.from('tarefas_preparacao_novo').select('id, componente_ingrediente_id, ordem, tarefa, observacoes').in('componente_ingrediente_id', (ingredientesData || []).map((item: any) => item.id).length > 0 ? (ingredientesData || []).map((item: any) => item.id) : [-1]).order('ordem', { ascending: true })
      if (erroPrep) { setMensagem(`Erro ao carregar tarefas de preparação: ${erroPrep.message}`); setLoadingComponente(false); return }
      setTarefasPreparacao(tarefasPrepData && tarefasPrepData.length > 0 ? tarefasPrepData.map((item: any) => ({ idLocal: gerarIdLocal(), id: item.id, ingrediente_id: mapaCompIngIdParaIngredienteId.get(Number(item.componente_ingrediente_id)) ? String(mapaCompIngIdParaIngredienteId.get(Number(item.componente_ingrediente_id))) : '', ordem: item.ordem !== null && item.ordem !== undefined ? String(item.ordem) : '', tarefa: item.tarefa || '', observacoes: item.observacoes || '' })) : [{ idLocal: gerarIdLocal(), ingrediente_id: '', ordem: '', tarefa: '', observacoes: '' }])
      const { data: tarefasConfeccaoData, error: erroConfeccao } = await supabase.from('tarefas_confeccao_novo').select('id, componente_id, ordem, tarefa, observacoes').eq('componente_id', componenteId).order('ordem', { ascending: true })
      if (erroConfeccao) { setMensagem(`Erro ao carregar tarefas de confeção: ${erroConfeccao.message}`); setLoadingComponente(false); return }
      setTarefasConfeccao(tarefasConfeccaoData && tarefasConfeccaoData.length > 0 ? tarefasConfeccaoData.map((item: any) => ({ idLocal: gerarIdLocal(), id: item.id, ordem: item.ordem !== null && item.ordem !== undefined ? String(item.ordem) : '', tarefa: item.tarefa || '', observacoes: item.observacoes || '' })) : [{ idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }])
      const { data: tarefasFinalizacaoData, error: erroFinalizacao } = await supabase.from('tarefas_finalizacao_novo').select('id, componente_id, ordem, tarefa, observacoes').eq('componente_id', componenteId).order('ordem', { ascending: true })
      if (erroFinalizacao) { setMensagem(`Erro ao carregar tarefas de finalização: ${erroFinalizacao.message}`); setLoadingComponente(false); return }
      setTarefasFinalizacao(tarefasFinalizacaoData && tarefasFinalizacaoData.length > 0 ? tarefasFinalizacaoData.map((item: any) => ({ idLocal: gerarIdLocal(), id: item.id, ordem: item.ordem !== null && item.ordem !== undefined ? String(item.ordem) : '', tarefa: item.tarefa || '', observacoes: item.observacoes || '' })) : [{ idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }])
    } catch (erro: any) { setMensagem(`Erro inesperado: ${erro?.message || 'sem detalhe'}`) }
    setLoadingComponente(false)
  }

  function validarFormulario() {
    if (!componenteSelecionadoId) return 'Tens de selecionar um componente.'
    if (!nome.trim()) return 'O nome do componente é obrigatório.'
    if (!rendimentoFinal.trim() || Number(rendimentoFinal) <= 0) return 'O rendimento final tem de ser maior que 0.'
    if (!unidadeRendimento.trim()) return 'A unidade do rendimento final é obrigatória.'
    const ingredientesPreenchidos = componentesIngredientes.filter((item) => item.ingrediente_id || item.quantidade.trim() || item.unidade.trim() || item.observacoes.trim())
    if (ingredientesPreenchidos.length === 0) return 'Tens de manter pelo menos um ingrediente no componente.'
    for (const item of ingredientesPreenchidos) {
      if (!item.ingrediente_id) return 'Todos os ingredientes têm de ter um ingrediente selecionado.'
      if (!item.quantidade.trim() || Number(item.quantidade) <= 0) return 'Todos os ingredientes têm de ter quantidade maior que 0.'
      if (!item.unidade.trim()) return 'Todos os ingredientes têm de ter unidade.'
    }
    return ''
  }

  async function guardarAlteracoes() {
    setMensagem('')
    const erroValidacao = validarFormulario()
    if (erroValidacao) { setMensagem(erroValidacao); return }
    setAGuardar(true)
    try {
      const componenteId = Number(componenteSelecionadoId); const nomeLimpo = nome.trim()
      const { data: componenteComMesmoNome, error: erroNome } = await supabase.from('componentes').select('id, nome').ilike('nome', nomeLimpo).neq('id', componenteId).maybeSingle()
      if (erroNome) { setMensagem(`Erro ao validar nome: ${erroNome.message}`); setAGuardar(false); return }
      if (componenteComMesmoNome) { setMensagem('Já existe outro componente com esse nome.'); setAGuardar(false); return }
      const { error: erroUpdate } = await supabase.from('componentes').update({ nome: nomeLimpo, rendimento_final: Number(rendimentoFinal), unidade_rendimento: unidadeRendimento.trim() }).eq('id', componenteId)
      if (erroUpdate) { setMensagem(`Erro ao atualizar componente: ${erroUpdate.message}`); setAGuardar(false); return }
      const { data: compIngExistentes, error: erroCompIngExistentes } = await supabase.from('componente_ingredientes').select('id').eq('componente_id', componenteId)
      if (erroCompIngExistentes) { setMensagem(`Erro ao obter ingredientes atuais: ${erroCompIngExistentes.message}`); setAGuardar(false); return }
      const idsCompIngExistentes = (compIngExistentes || []).map((item: any) => item.id)
      if (idsCompIngExistentes.length > 0) { const { error: erroApagarPrep } = await supabase.from('tarefas_preparacao_novo').delete().in('componente_ingrediente_id', idsCompIngExistentes); if (erroApagarPrep) { setMensagem(`Erro ao apagar tarefas de preparação: ${erroApagarPrep.message}`); setAGuardar(false); return } }
      const { error: erroApagarConfeccao } = await supabase.from('tarefas_confeccao_novo').delete().eq('componente_id', componenteId)
      if (erroApagarConfeccao) { setMensagem(`Erro ao apagar tarefas de confeção: ${erroApagarConfeccao.message}`); setAGuardar(false); return }
      const { error: erroApagarFinalizacao } = await supabase.from('tarefas_finalizacao_novo').delete().eq('componente_id', componenteId)
      if (erroApagarFinalizacao) { setMensagem(`Erro ao apagar tarefas de finalização: ${erroApagarFinalizacao.message}`); setAGuardar(false); return }
      const { error: erroApagarIngredientes } = await supabase.from('componente_ingredientes').delete().eq('componente_id', componenteId)
      if (erroApagarIngredientes) { setMensagem(`Erro ao apagar ingredientes: ${erroApagarIngredientes.message}`); setAGuardar(false); return }
      const ingredientesValidos = componentesIngredientes.filter((item) => item.ingrediente_id && item.quantidade.trim()).map((item) => ({ componente_id: componenteId, ingrediente_id: Number(item.ingrediente_id), quantidade: Number(item.quantidade), unidade: item.unidade.trim() }))
      let componentesIngredientesCriados: ComponenteIngredienteCriado[] = []
      if (ingredientesValidos.length > 0) {
        const { data, error } = await supabase.from('componente_ingredientes').insert(ingredientesValidos).select('id, componente_id, ingrediente_id')
        if (error) { setMensagem(`Erro ao gravar ingredientes: ${error.message}`); setAGuardar(false); return }
        componentesIngredientesCriados = (data as ComponenteIngredienteCriado[]) || []
      }
      const mapaComponenteIngredienteId = new Map<number, number>()
      for (const item of componentesIngredientesCriados) mapaComponenteIngredienteId.set(Number(item.ingrediente_id), Number(item.id))
      const tarefasPreparacaoValidas = tarefasPreparacao.filter((item) => item.ingrediente_id && item.tarefa.trim()).map((item) => { const compIngId = mapaComponenteIngredienteId.get(Number(item.ingrediente_id)); return { componente_ingrediente_id: compIngId || null, ordem: Number(item.ordem) || 1, tarefa: item.tarefa.trim(), observacoes: item.observacoes.trim() || null } }).filter((item) => item.componente_ingrediente_id !== null)
      if (tarefasPreparacaoValidas.length > 0) { const { error: erroPrep } = await supabase.from('tarefas_preparacao_novo').insert(tarefasPreparacaoValidas); if (erroPrep) { setMensagem(`Erro ao gravar tarefas de preparação: ${erroPrep.message}`); setAGuardar(false); return } }
      const tarefasConfeccaoValidas = tarefasConfeccao.filter((item) => item.tarefa.trim()).map((item) => ({ componente_id: componenteId, ordem: Number(item.ordem) || 1, tarefa: item.tarefa.trim(), observacoes: item.observacoes.trim() || null }))
      if (tarefasConfeccaoValidas.length > 0) { const { error: erroConfeccao } = await supabase.from('tarefas_confeccao_novo').insert(tarefasConfeccaoValidas); if (erroConfeccao) { setMensagem(`Erro ao gravar tarefas de confeção: ${erroConfeccao.message}`); setAGuardar(false); return } }
      const tarefasFinalizacaoValidas = tarefasFinalizacao.filter((item) => item.tarefa.trim()).map((item) => ({ componente_id: componenteId, ordem: Number(item.ordem) || 1, tarefa: item.tarefa.trim(), observacoes: item.observacoes.trim() || null }))
      if (tarefasFinalizacaoValidas.length > 0) { const { error: erroFinalizacao } = await supabase.from('tarefas_finalizacao_novo').insert(tarefasFinalizacaoValidas); if (erroFinalizacao) { setMensagem(`Erro ao gravar tarefas de finalização: ${erroFinalizacao.message}`); setAGuardar(false); return } }
      setMensagem('Componente atualizado com sucesso!')
      await fetchComponentes(); await carregarComponente(componenteId)
    } catch (erro: any) { setMensagem(`Erro inesperado: ${erro?.message || 'sem detalhe'}`) }
    setAGuardar(false)
  }

  function adicionarIngredienteComponente() { setComponentesIngredientes((prev) => [...prev, { idLocal: gerarIdLocal(), ingrediente_id: '', quantidade: '', unidade: 'g', observacoes: '' }]) }
  function removerIngredienteComponente(idLocal: string) { setComponentesIngredientes((prev) => prev.filter((item) => item.idLocal !== idLocal)) }
  function atualizarIngredienteComponente(idLocal: string, campo: keyof ComponenteIngredienteForm, valor: string) { setComponentesIngredientes((prev) => prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))) }
  function adicionarTarefaPreparacao() { setTarefasPreparacao((prev) => [...prev, { idLocal: gerarIdLocal(), ingrediente_id: '', ordem: '', tarefa: '', observacoes: '' }]) }
  function removerTarefaPreparacao(idLocal: string) { setTarefasPreparacao((prev) => prev.filter((item) => item.idLocal !== idLocal)) }
  function atualizarTarefaPreparacao(idLocal: string, campo: keyof TarefaPreparacaoForm, valor: string) { setTarefasPreparacao((prev) => prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))) }
  function adicionarTarefaConfeccao() { setTarefasConfeccao((prev) => [...prev, { idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }]) }
  function removerTarefaConfeccao(idLocal: string) { setTarefasConfeccao((prev) => prev.filter((item) => item.idLocal !== idLocal)) }
  function atualizarTarefaConfeccao(idLocal: string, campo: keyof TarefaComponenteForm, valor: string) { setTarefasConfeccao((prev) => prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))) }
  function adicionarTarefaFinalizacao() { setTarefasFinalizacao((prev) => [...prev, { idLocal: gerarIdLocal(), ordem: '', tarefa: '', observacoes: '' }]) }
  function removerTarefaFinalizacao(idLocal: string) { setTarefasFinalizacao((prev) => prev.filter((item) => item.idLocal !== idLocal)) }
  function atualizarTarefaFinalizacao(idLocal: string, campo: keyof TarefaComponenteForm, valor: string) { setTarefasFinalizacao((prev) => prev.map((item) => (item.idLocal === idLocal ? { ...item, [campo]: valor } : item))) }

  return (
    <main style={{ minHeight: '100vh', background: '#fff', color: '#111', padding: '32px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Editar componente</h1>
          <Link href="/gestao" style={{ padding: '8px 16px', borderRadius: '6px', background: '#e5e7eb', color: '#111', fontWeight: '500', fontSize: '14px', textDecoration: 'none' }}>← Voltar</Link>
        </div>

        {mensagem && (
          <div style={{ border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px 18px', background: '#eff6ff', color: '#1e40af', fontWeight: '600', marginBottom: '24px', fontSize: '14px' }}>
            {mensagem}
          </div>
        )}

        {/* 1. Procurar componente */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>1. Procurar componente</p>
          <label style={labelStyle}>Nome do componente</label>
          <input type="text" value={pesquisaComponente} onChange={(e) => setPesquisaComponente(e.target.value)}
            style={{ ...inputStyle, marginBottom: '12px' }} placeholder="Escreve o nome do componente..." />
          {loadingComponentes ? (
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>A carregar componentes...</p>
          ) : (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', maxHeight: '280px', overflowY: 'auto' }}>
              {componentesFiltrados.length === 0 ? (
                <p style={{ padding: '16px', fontSize: '13px', color: '#9ca3af' }}>Nenhum componente encontrado.</p>
              ) : componentesFiltrados.map((comp) => (
                <button key={comp.id} type="button" onClick={() => carregarComponente(comp.id)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: String(comp.id) === componenteSelecionadoId ? '#f0fdf4' : 'none', cursor: 'pointer', border: 'none', borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => { if (String(comp.id) !== componenteSelecionadoId) e.currentTarget.style.background = '#f9fafb' }}
                  onMouseLeave={e => { e.currentTarget.style.background = String(comp.id) === componenteSelecionadoId ? '#f0fdf4' : 'none' }}>
                  <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{comp.nome}</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Rendimento: {comp.rendimento_final ?? '-'} {comp.unidade_rendimento ?? ''}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Dados base */}
        <div style={sectionStyle}>
          <p style={sectionTitleStyle}>2. Dados base</p>
          {loadingComponente && <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>A carregar...</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Nome do componente</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Frango grelhado" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
            </div>
            <div>
              <label style={labelStyle}>Rendimento final</label>
              <input type="number" value={rendimentoFinal} onChange={(e) => setRendimentoFinal(e.target.value)} placeholder="Ex: 500" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
            </div>
            <div>
              <label style={labelStyle}>Unidade</label>
              <select value={unidadeRendimento} onChange={(e) => setUnidadeRendimento(e.target.value)} disabled={!componenteSelecionadoId}
                style={{ ...(!componenteSelecionadoId ? inputDisabledStyle : inputStyle) }}>
                {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Ingredientes */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ ...sectionTitleStyle, margin: 0 }}>3. Ingredientes</p>
            <button type="button" onClick={adicionarIngredienteComponente} disabled={!componenteSelecionadoId}
              style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer' }}>
              + Adicionar
            </button>
          </div>
          {loadingIngredientes && <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>A carregar ingredientes...</p>}
          {componentesIngredientes.map((item, idx) => (
            <div key={item.idLocal} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#fff', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>Ingrediente {idx + 1}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Ingrediente</label>
                  <IngredientSearchSelect ingredientes={ingredientes} value={item.ingrediente_id} onChange={(v) => atualizarIngredienteComponente(item.idLocal, 'ingrediente_id', v)} disabled={!componenteSelecionadoId} />
                </div>
                <div>
                  <label style={labelStyle}>Quantidade</label>
                  <input type="number" value={item.quantidade} onChange={(e) => atualizarIngredienteComponente(item.idLocal, 'quantidade', e.target.value)} placeholder="Ex: 200" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
                </div>
                <div>
                  <label style={labelStyle}>Unidade</label>
                  <select value={item.unidade} onChange={(e) => atualizarIngredienteComponente(item.idLocal, 'unidade', e.target.value)} disabled={!componenteSelecionadoId} style={{ ...(!componenteSelecionadoId ? inputDisabledStyle : inputStyle) }}>
                    {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => removerIngredienteComponente(item.idLocal)} disabled={!componenteSelecionadoId}
                  style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 4. Preparação */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ ...sectionTitleStyle, margin: 0 }}>4. Preparação (por ingrediente)</p>
            <button type="button" onClick={adicionarTarefaPreparacao} disabled={!componenteSelecionadoId}
              style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer' }}>
              + Tarefa
            </button>
          </div>
          {tarefasPreparacao.map((item) => (
            <div key={item.idLocal} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px auto', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Ingrediente</label>
                <IngredientSearchSelect ingredientes={ingredientes} value={item.ingrediente_id} onChange={(v) => atualizarTarefaPreparacao(item.idLocal, 'ingrediente_id', v)} disabled={!componenteSelecionadoId} />
              </div>
              <div>
                <label style={labelStyle}>Tarefa</label>
                <input type="text" value={item.tarefa} onChange={(e) => atualizarTarefaPreparacao(item.idLocal, 'tarefa', e.target.value)} placeholder="Ex: Picar finamente" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
              </div>
              <div>
                <label style={labelStyle}>Ordem</label>
                <input type="number" value={item.ordem} onChange={(e) => atualizarTarefaPreparacao(item.idLocal, 'ordem', e.target.value)} placeholder="1" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
              </div>
              <button type="button" onClick={() => removerTarefaPreparacao(item.idLocal)} disabled={!componenteSelecionadoId}
                style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer', alignSelf: 'end' }}>
                Remover
              </button>
            </div>
          ))}
        </div>

        {/* 5. Confeção */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ ...sectionTitleStyle, margin: 0 }}>5. Confeção</p>
            <button type="button" onClick={adicionarTarefaConfeccao} disabled={!componenteSelecionadoId}
              style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer' }}>
              + Tarefa
            </button>
          </div>
          {tarefasConfeccao.map((item) => (
            <div key={item.idLocal} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Ordem</label>
                <input type="number" value={item.ordem} onChange={(e) => atualizarTarefaConfeccao(item.idLocal, 'ordem', e.target.value)} placeholder="1" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
              </div>
              <div>
                <label style={labelStyle}>Tarefa</label>
                <input type="text" value={item.tarefa} onChange={(e) => atualizarTarefaConfeccao(item.idLocal, 'tarefa', e.target.value)} placeholder="Ex: Cozer o frango" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
              </div>
              <button type="button" onClick={() => removerTarefaConfeccao(item.idLocal)} disabled={!componenteSelecionadoId}
                style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer', alignSelf: 'end' }}>
                Remover
              </button>
            </div>
          ))}
        </div>

        {/* 6. Finalização */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ ...sectionTitleStyle, margin: 0 }}>6. Finalização</p>
            <button type="button" onClick={adicionarTarefaFinalizacao} disabled={!componenteSelecionadoId}
              style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer' }}>
              + Tarefa
            </button>
          </div>
          {tarefasFinalizacao.map((item) => (
            <div key={item.idLocal} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Ordem</label>
                <input type="number" value={item.ordem} onChange={(e) => atualizarTarefaFinalizacao(item.idLocal, 'ordem', e.target.value)} placeholder="1" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
              </div>
              <div>
                <label style={labelStyle}>Tarefa</label>
                <input type="text" value={item.tarefa} onChange={(e) => atualizarTarefaFinalizacao(item.idLocal, 'tarefa', e.target.value)} placeholder="Ex: Adicionar sementes" style={!componenteSelecionadoId ? inputDisabledStyle : inputStyle} disabled={!componenteSelecionadoId} />
              </div>
              <button type="button" onClick={() => removerTarefaFinalizacao(item.idLocal)} disabled={!componenteSelecionadoId}
                style={{ backgroundColor: !componenteSelecionadoId ? '#d1d5db' : '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: !componenteSelecionadoId ? 'not-allowed' : 'pointer', alignSelf: 'end' }}>
                Remover
              </button>
            </div>
          ))}
        </div>

        {/* Botões finais */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={guardarAlteracoes} disabled={aGuardar || !componenteSelecionadoId}
            style={{ flex: 1, padding: '14px', backgroundColor: aGuardar || !componenteSelecionadoId ? '#d1d5db' : '#80c944', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: aGuardar || !componenteSelecionadoId ? 'not-allowed' : 'pointer' }}>
            {aGuardar ? 'A guardar...' : 'Guardar alterações'}
          </button>
          <button type="button" onClick={limparFormulario}
            style={{ padding: '14px 24px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
            Limpar
          </button>
        </div>

      </div>
    </main>
  )
}

import { Suspense } from 'react'

export default function EditarComponentePageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '32px' }}>A carregar...</div>}>
      <EditarComponentePage />
    </Suspense>
  )
}