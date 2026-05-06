// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type ProducaoAtiva = {
  id: number
  nome_semana: string
  data_inicio: string
  instalacao_id: number | null
}

type Staff = {
  id: number
  nome: string
}

type DetalheProducao = {
  id: number
  quantidade: number
  pratos: {
    id: number
    nome: string
    sku: string
    tamanho: string
    peso_final?: number
    prioridade_embalamento?: number | null
    categoria_prato?: string | null
  } | null
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
  ingredientes: { id: number; nome: string; requer_desinfeccao?: boolean | null } | null
}

type TarefaPreparacao = {
  id: number
  componente_ingrediente_id: number
  ordem: number
  tarefa: string
  observacoes: string | null
}

type TarefaConfeccao = {
  id: number
  componente_id: number
  ordem: number
  tarefa: string
  observacoes: string | null
}

type TarefaFinalizacao = {
  id: number
  componente_id: number
  ordem: number
  tarefa: string
  observacoes: string | null
}

type Registo = {
  id?: string
  concluido: boolean
  quantidade_final: number | null
  temperatura_confeccao: number | null
  temperatura_abatimento: number | null
  tempo_arrefecimento: number | null
  extras: boolean | null
  quantidade_extras: number | null
  impressao_etiqueta: boolean
  nome_staff: string | null
}

type RegistoEmbalamento = {
  id?: string
  concluido: boolean
  extras: boolean | null
  extrasPorTamanho: Record<number, number>
  etiquetasImpressas: boolean
}

type RegistoDesinfeccao = {
  id?: string
  quantidade_desinfectante_ml: number
  litros_agua: number
  tempo_minutos: number
  concluido: boolean
  nome_staff: string | null
}

const DEFAULT_DESINFECCAO: RegistoDesinfeccao = {
  quantidade_desinfectante_ml: 30,
  litros_agua: 6,
  tempo_minutos: 5,
  concluido: false,
  nome_staff: null,
}

type SecaoAtiva = 'preparacao' | 'confeccao' | 'finalizacao' | 'embalamento'

const ORDEM_TAMANHO: Record<string, number> = { m: 1, l: 2, xl: 3 }
function ordemTamanho(t: string) { return ORDEM_TAMANHO[t?.toLowerCase()] ?? 99 }

const ORDEM_CATEGORIAS = ['Pratos principais', 'Pratos leves', 'Pequenos almoços', 'Doces', 'Unidoses', 'Sumos']

const CORES_CATEGORIA: Record<string, { bg: string; texto: string; borda: string }> = {
  'Pratos principais': { bg: '#bbf7d0', texto: '#14532d', borda: '#86efac' },
  'Pratos leves': { bg: '#dcfce7', texto: '#14532d', borda: '#86efac' },
  'Pequenos almoços': { bg: '#fef9c3', texto: '#713f12', borda: '#fde047' },
  'Doces': { bg: '#ffedd5', texto: '#7c2d12', borda: '#fdba74' },
  'Unidoses': { bg: '#f3e8ff', texto: '#581c87', borda: '#d8b4fe' },
  'Sumos': { bg: '#dbeafe', texto: '#1e3a8a', borda: '#93c5fd' },
}
function coresCategoria(cat: string | null | undefined) {
  if (!cat) return { bg: '#f3f4f6', texto: '#111827', borda: '#d1d5db' }
  return CORES_CATEGORIA[cat] || { bg: '#f3f4f6', texto: '#111827', borda: '#d1d5db' }
}

// ── Helpers de unidade para o slider de quantidade final ─────
function configSliderUnidade(unidade: string | null | undefined) {
  const u = (unidade || 'kg').toLowerCase()
  if (u === 'g') return { unidade: 'g', min: 0, max: 50000, step: 50, formatar: (v: number) => `${Math.round(v)} g` }
  if (u === 'ml') return { unidade: 'ml', min: 0, max: 50000, step: 50, formatar: (v: number) => `${Math.round(v)} ml` }
  if (u === 'l') return { unidade: 'l', min: 0, max: 200, step: 0.5, formatar: (v: number) => `${v.toFixed(1)} l` }
  if (u === 'un' || u === 'unidades' || u === 'unidade') return { unidade: 'un', min: 0, max: 500, step: 1, formatar: (v: number) => `${Math.round(v)} un` }
  // default: kg
  return { unidade: 'kg', min: 0, max: 100, step: 0.5, formatar: (v: number) => `${v.toFixed(1)} kg` }
}

function PillConcluido({ label, onDesfazer }: { label: string; onDesfazer: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '99px', padding: '6px 12px', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
        <span style={{ color: '#16a34a', fontSize: '13px', flexShrink: 0 }}>✓</span>
        <span style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <button onClick={onDesfazer}
        style={{ background: 'transparent', border: 'none', fontSize: '11px', color: '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, padding: '0 4px' }}>
        Desfazer
      </button>
    </div>
  )
}

// Slider com botões − e + para ajustar valores em tablet
function SliderComBotoes({
  valor,
  min,
  max,
  step,
  onChange,
  formatarValor,
  corValor,
}: {
  valor: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  formatarValor: (v: number) => string
  corValor?: string
}) {
  const decrementar = () => {
    const novo = Math.max(min, Number((valor - step).toFixed(2)))
    onChange(novo)
  }
  const incrementar = () => {
    const novo = Math.min(max, Number((valor + step).toFixed(2)))
    onChange(novo)
  }
  const estiloBotao: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: '#fff',
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
    lineHeight: 1,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button type="button" onClick={decrementar} style={estiloBotao}>−</button>
      <input type="range" min={min} max={max} step={step} value={valor}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#111827' }} />
      <button type="button" onClick={incrementar} style={estiloBotao}>+</button>
      <span style={{ fontSize: '17px', fontWeight: '700', minWidth: '90px', textAlign: 'right', color: corValor || '#111827' }}>
        {formatarValor(valor)}
      </span>
    </div>
  )
}

function SeletorEtiquetas({
  valor,
  onChange,
  altura = 40,
}: {
  valor: number
  onChange: (v: number) => void
  altura?: number
}) {
  const decrementar = () => onChange(Math.max(1, valor - 1))
  const incrementar = () => onChange(Math.min(5, valor + 1))
  const estiloBotao: React.CSSProperties = {
    width: '32px',
    height: `${altura}px`,
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: '15px',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
    lineHeight: 1,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <button type="button" onClick={decrementar} disabled={valor <= 1}
        style={{ ...estiloBotao, borderRadius: '8px 0 0 8px', color: '#6b7280', cursor: valor <= 1 ? 'not-allowed' : 'pointer' }}>−</button>
      <span style={{ fontSize: '14px', fontWeight: '600', width: '28px', height: `${altura}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>{valor}</span>
      <button type="button" onClick={incrementar} disabled={valor >= 5}
        style={{ ...estiloBotao, borderRadius: '0 8px 8px 0', color: valor >= 5 ? '#d1d5db' : '#6b7280', cursor: valor >= 5 ? 'not-allowed' : 'pointer' }}>+</button>
    </div>
  )
}

function SliderSimples({
  valor,
  min,
  max,
  step,
  onChange,
  formatarValor,
}: {
  valor: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  formatarValor: (v: number) => string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input type="range" min={min} max={max} step={step} value={valor}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: '#111827' }} />
      <span style={{ fontSize: '15px', fontWeight: '600', minWidth: '80px', textAlign: 'right', color: '#111827' }}>
        {formatarValor(valor)}
      </span>
    </div>
  )
}

export default function Cozinha() {
  const router = useRouter()

  const [aCarregar, setACarregar] = useState(true)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [seccoes, setSeccoes] = useState<string[]>([])
  const [producaoAtiva, setProducaoAtiva] = useState<ProducaoAtiva | null>(null)
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>('preparacao')
  const [categoriaEmbalamento, setCategoriaEmbalamento] = useState<string>('')
  const [mostrarPainelExtras, setMostrarPainelExtras] = useState(false)
  const [pesquisaEmbalamento, setPesquisaEmbalamento] = useState('')
  const [pesquisaConfeccao, setPesquisaConfeccao] = useState('')
  const [pesquisaPreparacao, setPesquisaPreparacao] = useState('')
  const [pesquisaFinalizacao, setPesquisaFinalizacao] = useState('')

  const [detalhes, setDetalhes] = useState<DetalheProducao[]>([])
  const [pratosComponentes, setPratosComponentes] = useState<PratoComponente[]>([])
  const [componentesIngredientes, setComponentesIngredientes] = useState<ComponenteIngrediente[]>([])
  const [tarefasPreparacao, setTarefasPreparacao] = useState<TarefaPreparacao[]>([])
  const [tarefasConfeccao, setTarefasConfeccao] = useState<TarefaConfeccao[]>([])
  const [tarefasFinalizacao, setTarefasFinalizacao] = useState<TarefaFinalizacao[]>([])
  const [registos, setRegistos] = useState<Record<string, Registo>>({})
  const [registosEmbalamento, setRegistosEmbalamento] = useState<Record<string, RegistoEmbalamento>>({})
  const [registosDesinfeccao, setRegistosDesinfeccao] = useState<Record<number, RegistoDesinfeccao>>({})
  const [staffLoja, setStaffLoja] = useState<Staff[]>([])
  const [numEtiquetas, setNumEtiquetas] = useState<Record<string, number>>({})


  // Ref para evitar fetches sobrepostos quando o tablet volta a ficar visível
  const aRefazerFetch = useRef(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase.from('perfis').select('nome, role, seccoes').eq('id', user.id).single()
      if (!perfil || !['gestor', 'cozinha'].includes(perfil.role)) { router.push('/'); return }
      setNomeUtilizador(perfil.nome)
      setSeccoes(perfil.seccoes || [])
      if (perfil.seccoes?.length > 0) setSecaoAtiva(perfil.seccoes[0] as SecaoAtiva)
      const { data: prod } = await supabase.from('producoes_semanais').select('id, nome_semana, data_inicio, instalacao_id').eq('estado', 'ativo').single()
      if (!prod) { setACarregar(false); return }
      setProducaoAtiva(prod)
      if (prod.instalacao_id) {
        const { data: staff } = await supabase
          .from('haccp_staff')
          .select('id, nome')
          .eq('instalacao_id', prod.instalacao_id)
          .eq('ativo', true)
          .order('nome', { ascending: true })
        setStaffLoja((staff as Staff[]) || [])
      }
      await carregarDados(prod.id)
      setACarregar(false)
    }
    init()
  }, [])

  // Subscription Realtime + re-fetch silencioso quando o tablet volta a ficar visível
  useEffect(() => {
    if (!producaoAtiva) return

    const aplicarRegisto = (r: any) => {
      if (!r || r.producao_semanal_id !== producaoAtiva.id) return
      if (r.setor === 'embalamento_grupo') {
        const chave = `emb|${r.referencia_id}`
        let extrasPorTamanho: Record<number, number> = {}
        try { if (r.quantidade_extras) extrasPorTamanho = JSON.parse(r.quantidade_extras) } catch {}
        setRegistosEmbalamento(prev => ({
          ...prev,
          [chave]: { id: r.id, concluido: r.concluido, extras: r.extras, extrasPorTamanho, etiquetasImpressas: r.observacoes === 'etiquetas_impressas' }
        }))
      } else {
        const chave = `${r.setor}|${r.referencia_id}`
        setRegistos(prev => ({
          ...prev,
          [chave]: {
            id: r.id,
            concluido: r.concluido,
            quantidade_final: r.quantidade_final,
            temperatura_confeccao: r.temperatura_confeccao,
            temperatura_abatimento: r.temperatura_abatimento,
            tempo_arrefecimento: r.tempo_arrefecimento,
            extras: r.extras,
            quantidade_extras: r.quantidade_extras,
            impressao_etiqueta: r.impressao_etiqueta || false,
            nome_staff: r.nome_staff || null,
          }
        }))
      }
    }

    const aplicarRegistoDesinfeccao = (r: any) => {
      if (!r || r.producao_semanal_id !== producaoAtiva.id) return
      setRegistosDesinfeccao(prev => ({
        ...prev,
        [Number(r.tarefa_preparacao_id)]: {
          id: r.id,
          quantidade_desinfectante_ml: Number(r.quantidade_desinfectante_ml),
          litros_agua: Number(r.litros_agua),
          tempo_minutos: Number(r.tempo_minutos),
          concluido: r.concluido,
          nome_staff: r.nome_staff || null,
        },
      }))
    }

    // Canal estável (sem Date.now() — antes era recriado a cada render e podia perder eventos)
    const channel = supabase.channel(`registos_cozinha_${producaoAtiva.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registos_producao' },
        (payload) => aplicarRegisto(payload.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registos_desinfeccao' },
        (payload) => aplicarRegistoDesinfeccao(payload.new))
      .subscribe()

    // Re-fetch quando o tablet volta a ficar visível (acordou do sleep, voltou ao separador, etc.)
    const aoFicarVisivel = async () => {
      if (document.visibilityState !== 'visible') return
      if (aRefazerFetch.current) return
      aRefazerFetch.current = true
      try {
        await carregarRegistos(producaoAtiva.id)
      } finally {
        aRefazerFetch.current = false
      }
    }
    document.addEventListener('visibilitychange', aoFicarVisivel)
    window.addEventListener('focus', aoFicarVisivel)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', aoFicarVisivel)
      window.removeEventListener('focus', aoFicarVisivel)
    }
  }, [producaoAtiva])

  async function carregarRegistos(producaoId: number) {
    const { data: reg } = await supabase.from('registos_producao').select('*').eq('producao_semanal_id', producaoId)
    if (reg) {
      const mapa: Record<string, Registo> = {}
      const mapaEmb: Record<string, RegistoEmbalamento> = {}
      reg.forEach((r: any) => {
        if (r.setor === 'embalamento_grupo') {
          const chave = `emb|${r.referencia_id}`
          let extrasPorTamanho: Record<number, number> = {}
          try { if (r.quantidade_extras) extrasPorTamanho = JSON.parse(r.quantidade_extras) } catch {}
          mapaEmb[chave] = { id: r.id, concluido: r.concluido, extras: r.extras, extrasPorTamanho, etiquetasImpressas: r.observacoes === 'etiquetas_impressas' }
        } else {
          mapa[`${r.setor}|${r.referencia_id}`] = { id: r.id, concluido: r.concluido, quantidade_final: r.quantidade_final, temperatura_confeccao: r.temperatura_confeccao, temperatura_abatimento: r.temperatura_abatimento, tempo_arrefecimento: r.tempo_arrefecimento, extras: r.extras, quantidade_extras: r.quantidade_extras, impressao_etiqueta: r.impressao_etiqueta || false, nome_staff: r.nome_staff || null }
        }
      })
      setRegistos(mapa)
      setRegistosEmbalamento(mapaEmb)
    }

    const { data: regDes } = await supabase.from('registos_desinfeccao').select('*').eq('producao_semanal_id', producaoId)
    if (regDes) {
      const mapaDes: Record<number, RegistoDesinfeccao> = {}
      regDes.forEach((r: any) => {
        mapaDes[Number(r.tarefa_preparacao_id)] = {
          id: r.id,
          quantidade_desinfectante_ml: Number(r.quantidade_desinfectante_ml),
          litros_agua: Number(r.litros_agua),
          tempo_minutos: Number(r.tempo_minutos),
          concluido: r.concluido,
          nome_staff: r.nome_staff || null,
        }
      })
      setRegistosDesinfeccao(mapaDes)
    }
  }

  async function carregarDados(producaoId: number) {
    const { data: det } = await supabase.from('producoes_semanais_itens')
      .select('id, quantidade, pratos (id, nome, sku, tamanho, peso_final, prioridade_embalamento, categoria_prato)')
      .eq('producao_semanal_id', producaoId).order('ordem', { ascending: true })
    const detalhesLista = (det || []) as DetalheProducao[]
    setDetalhes(detalhesLista)

    const pratoIds = detalhesLista.map(i => Number(i.pratos?.id)).filter(Boolean)
    if (!pratoIds.length) return

    const { data: pc } = await supabase.from('pratos_componentes')
      .select('id, prato_id, componente_id, quantidade_final, unidade, posicao_embalagem, ordem, componentes (id, nome, rendimento_final, unidade_rendimento)')
      .in('prato_id', pratoIds).order('ordem', { ascending: true })
    const pcLista = (pc || []) as PratoComponente[]
    setPratosComponentes(pcLista)

    const compIds = Array.from(new Set(pcLista.map(i => Number(i.componente_id))))
    const { data: ci } = await supabase.from('componente_ingredientes')
      .select('id, componente_id, ingrediente_id, quantidade, unidade, ingredientes (id, nome, requer_desinfeccao)')
      .in('componente_id', compIds.length ? compIds : [-1])
    setComponentesIngredientes((ci || []) as ComponenteIngrediente[])

    const ciIds = Array.from(new Set(((ci || []) as ComponenteIngrediente[]).map(i => Number(i.id))))
    const { data: tp } = await supabase.from('tarefas_preparacao_novo')
      .select('id, componente_ingrediente_id, ordem, tarefa, observacoes')
      .in('componente_ingrediente_id', ciIds.length ? ciIds : [-1]).order('ordem', { ascending: true })
    setTarefasPreparacao((tp || []) as TarefaPreparacao[])

    const { data: tc } = await supabase.from('tarefas_confeccao_novo')
      .select('id, componente_id, ordem, tarefa, observacoes')
      .in('componente_id', compIds.length ? compIds : [-1]).order('ordem', { ascending: true })
    setTarefasConfeccao((tc || []) as TarefaConfeccao[])

    const { data: tf } = await supabase.from('tarefas_finalizacao_novo')
      .select('id, componente_id, ordem, tarefa, observacoes')
      .in('componente_id', compIds.length ? compIds : [-1]).order('ordem', { ascending: true })
    setTarefasFinalizacao((tf || []) as TarefaFinalizacao[])

    await carregarRegistos(producaoId)
  }

  async function guardarRegisto(setor: string, referenciaId: number, dados: Partial<Registo>) {
    if (!producaoAtiva) return
    const chave = `${setor}|${referenciaId}`
    setRegistos(prev => ({ ...prev, [chave]: { ...prev[chave], ...dados } as Registo }))

    const { data } = await supabase
      .from('registos_producao')
      .upsert(
        {
          producao_semanal_id: producaoAtiva.id,
          setor,
          referencia_id: referenciaId,
          ...dados,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'producao_semanal_id,setor,referencia_id' }
      )
      .select()
      .single()

    if (data) {
      setRegistos(prev => ({ ...prev, [chave]: { ...prev[chave], id: data.id } as Registo }))
    }
  }

  async function guardarRegistoEmbalamento(chaveGrupo: string, referenciaId: number, dados: Partial<RegistoEmbalamento>) {
    if (!producaoAtiva) return

    const estadoAtual = registosEmbalamento[chaveGrupo] || { concluido: false, extras: null, extrasPorTamanho: {}, etiquetasImpressas: false }
    const novoEstado = { ...estadoAtual, ...dados }
    setRegistosEmbalamento(prev => ({ ...prev, [chaveGrupo]: novoEstado as RegistoEmbalamento }))

    let quantidadeExtrasDB: string | null = null
    if (novoEstado.extras === true && novoEstado.extrasPorTamanho) {
      const entries = Object.entries(novoEstado.extrasPorTamanho)
      if (entries.length > 0) {
        quantidadeExtrasDB = JSON.stringify(novoEstado.extrasPorTamanho)
      }
    }

    const dadosDB = {
      producao_semanal_id: producaoAtiva.id,
      setor: 'embalamento_grupo',
      referencia_id: referenciaId,
      concluido: novoEstado.concluido ?? false,
      extras: novoEstado.extras ?? null,
      quantidade_extras: quantidadeExtrasDB,
      observacoes: novoEstado.etiquetasImpressas ? 'etiquetas_impressas' : null,
      atualizado_em: new Date().toISOString(),
    }

    // Usar upsert para evitar race conditions entre tablets
    const { data } = await supabase
      .from('registos_producao')
      .upsert(dadosDB, { onConflict: 'producao_semanal_id,setor,referencia_id' })
      .select()
      .single()

    if (data) setRegistosEmbalamento(prev => ({ ...prev, [chaveGrupo]: { ...novoEstado, id: data.id } as RegistoEmbalamento }))
  }

  async function guardarRegistoDesinfeccao(tarefaPreparacaoId: number, dados: Partial<RegistoDesinfeccao>) {
    if (!producaoAtiva) return

    const estadoAtual = registosDesinfeccao[tarefaPreparacaoId] || DEFAULT_DESINFECCAO
    const novoEstado: RegistoDesinfeccao = { ...estadoAtual, ...dados }
    setRegistosDesinfeccao(prev => ({ ...prev, [tarefaPreparacaoId]: novoEstado }))

    const dadosDB = {
      producao_semanal_id: producaoAtiva.id,
      tarefa_preparacao_id: tarefaPreparacaoId,
      quantidade_desinfectante_ml: novoEstado.quantidade_desinfectante_ml,
      litros_agua: novoEstado.litros_agua,
      tempo_minutos: novoEstado.tempo_minutos,
      concluido: novoEstado.concluido,
      nome_staff: novoEstado.nome_staff,
      atualizado_em: new Date().toISOString(),
    }

    const { data } = await supabase
      .from('registos_desinfeccao')
      .upsert(dadosDB, { onConflict: 'producao_semanal_id,tarefa_preparacao_id' })
      .select()
      .single()

    if (data) setRegistosDesinfeccao(prev => ({ ...prev, [tarefaPreparacaoId]: { ...novoEstado, id: data.id } }))
  }

  const PRINTER_URL = 'https://expansys-football-complement-numerical.trycloudflare.com/print'

  function gerarZPL(dados: {
    componenteDestino: string
    pratoDestino: string
    ingrediente: string
    quantidade: string
    data: string
  }) {
    const esc = (s: string) => (s || '').replace(/[\^~\\]/g, '')
    return `^XA
^PW609
^LL406
^CI28
^LH0,0
^CF0,52
^FO20,20^FB570,2,4,L^FD${esc(dados.ingrediente)}^FS
^CF0,30
^FO20,150^FB570,1,0,L^FD${esc(dados.componenteDestino)}^FS
^CF0,24
^FO20,200^FB570,2,0,L^FD-> ${esc(dados.pratoDestino)} (${esc(dados.quantidade)})^FS
^FO20,300^GB570,2,2^FS
^CF0,18
^FO20,370^FD${esc(dados.data)}^FS
^XZ`
  }

  async function imprimirEtiqueta(
  dados: {
    componenteDestino: string
    pratoDestino: string
    ingrediente: string
    quantidade: string
    data: string
  },
  onImprimiu: () => void
) {
  const zpl = gerarZPL(dados)
  await enviarZPL(zpl, onImprimiu)
}

  function gerarZPLConfeccao(dados: {
    componente: string
    pratosDestino: string
    quantidadeFinal: string
    data: string
  }) {
    const esc = (s: string) => (s || '').replace(/[\^~\\]/g, '')
    return `^XA
^PW609
^LL406
^CI28
^LH0,0
^CF0,52
^FO20,20^FB570,2,4,L^FD${esc(dados.componente)}^FS
^CF0,22
^FO20,150^FB570,2,0,L^FD${esc(dados.pratosDestino)}^FS
^FO20,260^GB570,2,2^FS
^CF0,30
^FO20,280^FDQuantidade: ${esc(dados.quantidadeFinal)}^FS
^CF0,18
^FO20,370^FD${esc(dados.data)}^FS
^XZ`
  }

  async function imprimirEtiquetaConfeccao(
    dados: { componente: string; pratosDestino: string; quantidadeFinal: string; data: string },
    onImprimiu: () => void
  ) {
    const zpl = gerarZPLConfeccao(dados)
    await enviarZPL(zpl, onImprimiu)
  }

  function gerarZPLFinalizacao(dados: {
    componente: string
    pratoDestino: string
    data: string
  }) {
    const esc = (s: string) => (s || '').replace(/[\^~\\]/g, '')
    return `^XA
^PW609
^LL406
^CI28
^LH0,0
^CF0,52
^FO20,20^FB570,2,4,L^FD${esc(dados.componente)}^FS
^CF0,30
^FO20,160^FB570,2,0,L^FD${esc(dados.pratoDestino)}^FS
^FO20,270^GB570,2,2^FS
^CF0,28
^FO20,290^FD(Produto Finalizado)^FS
^CF0,18
^FO20,370^FD${esc(dados.data)}^FS
^XZ`
  }

  async function imprimirEtiquetaFinalizacao(
    dados: { componente: string; pratoDestino: string; data: string },
    onImprimiu: () => void
  ) {
    const zpl = gerarZPLFinalizacao(dados)
    await enviarZPL(zpl, onImprimiu)
  }

  async function imprimirVarias(zpl: string, quantidade: number, onImprimiu: () => void) {
    try {
      for (let i = 0; i < quantidade; i++) {
        const resposta = await fetch(PRINTER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zpl }),
        })
        if (!resposta.ok) throw new Error('Erro ao enviar etiqueta')
      }
      onImprimiu()
    } catch (erro) {
      console.error('Erro de impressão:', erro)
      alert('Não consegui imprimir.\n\nVerifica:\n• PC ligado\n• servidor ativo\n• tablet na mesma rede')
    }
  }

  async function enviarZPL(zpl: string, onImprimiu: () => void) {
    try {
      const resposta = await fetch(PRINTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zpl }),
      })
      if (!resposta.ok) throw new Error('Erro ao enviar etiqueta')
      onImprimiu()
    } catch (erro) {
      console.error('Erro de impressão:', erro)
      alert('Não consegui imprimir.\n\nVerifica:\n• PC ligado\n• servidor ativo\n• tablet na mesma rede')
    }
  }

  function parseNum(v: any) {
    const n = parseFloat(String(v || '').replace(',', '.'))
    return isNaN(n) ? 0 : n
  }

  function fatorUso(pc: PratoComponente) {
    const usado = parseNum(pc.quantidade_final)
    const rendimento = parseNum(pc.componentes?.rendimento_final)
    if (!usado || !rendimento) return 0
    return usado / rendimento
  }

  function fmtQtd(valor: number, unidade: string | null) {
    const u = (unidade || '').toLowerCase()
    if (u === 'g') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} kg` : `${valor.toFixed(0)} g`
    if (u === 'kg') return `${valor.toFixed(2)} kg`
    if (u === 'ml') return valor >= 1000 ? `${(valor / 1000).toFixed(2)} l` : `${valor.toFixed(0)} ml`
    if (u === 'l') return `${valor.toFixed(2)} l`
    return `${valor.toFixed(2)}${unidade ? ` ${unidade}` : ''}`
  }

  function dataHoje() {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const secoesVisiveis: SecaoAtiva[] = seccoes.length > 0 ? (seccoes as SecaoAtiva[]) : ['preparacao', 'confeccao', 'finalizacao', 'embalamento']
  const labelSecao: Record<SecaoAtiva, string> = { preparacao: 'Preparação', confeccao: 'Confeção', finalizacao: 'Finalização', embalamento: 'Embalamento' }
  const estiloLabel = { fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }

  // ── Preparação ───────────────────────────────────────────────
  function renderPreparacao() {
    const grupos: Record<string, {
      ingredienteNome: string
      tarefas: { tarefaId: number; tarefa: string; observacoes: string | null; ordem: number; quantidade: number; unidade: string | null; componenteDestino: string; pratoDestino: string; requerDesinfeccao: boolean }[]
    }> = {}

    detalhes.forEach(item => {
      const pratoId = Number(item.pratos?.id)
      const pratoDestino = item.pratos?.nome || 'Prato'
      const doses = Number(item.quantidade || 0)
      pratosComponentes.filter(pc => Number(pc.prato_id) === pratoId).forEach(pc => {
        const componenteDestino = pc.componentes?.nome || 'Componente'
        componentesIngredientes.filter(ci => Number(ci.componente_id) === Number(pc.componente_id)).forEach(ci => {
          const tarefasCi = tarefasPreparacao.filter(t => Number(t.componente_ingrediente_id) === Number(ci.id))
          if (!tarefasCi.length) return
          const qtd = parseNum(ci.quantidade) * fatorUso(pc) * doses
          if (!qtd) return
          const nome = ci.ingredientes?.nome || 'Ingrediente'
          const requerDesinfeccao = !!ci.ingredientes?.requer_desinfeccao
          const chave = `${Number(ci.ingrediente_id)}|${nome}`
          if (!grupos[chave]) grupos[chave] = { ingredienteNome: nome, tarefas: [] }
          tarefasCi.forEach(t => {
            const idx = grupos[chave].tarefas.findIndex(x => x.tarefaId === t.id)
            if (idx >= 0) grupos[chave].tarefas[idx].quantidade += qtd
            else grupos[chave].tarefas.push({ tarefaId: t.id, tarefa: t.tarefa, observacoes: t.observacoes, ordem: Number(t.ordem), quantidade: qtd, unidade: ci.unidade, componenteDestino, pratoDestino, requerDesinfeccao })
          })
        })
      })
    })

    const gruposFiltrados = Object.values(grupos)
      .filter(g => g.ingredienteNome.toLowerCase().includes(pesquisaPreparacao.toLowerCase()))
      .sort((a, b) => a.ingredienteNome.localeCompare(b.ingredienteNome))

    // Construir lista plana de pills concluídos (todos os grupos)
    const pillsConcluidos: { tarefaId: number; label: string }[] = []
    gruposFiltrados.forEach(grupo => {
      grupo.tarefas.forEach(tarefa => {
        const reg = registos[`preparacao|${tarefa.tarefaId}`]
        if (reg?.concluido && reg?.impressao_etiqueta) {
          pillsConcluidos.push({ tarefaId: tarefa.tarefaId, label: tarefa.tarefa })
        }
      })
    })

    // Filtrar grupos para mostrar apenas os que têm tarefas ativas
    const gruposAtivos = gruposFiltrados
      .map(grupo => ({
        ...grupo,
        tarefas: grupo.tarefas.filter(tarefa => {
          const reg = registos[`preparacao|${tarefa.tarefaId}`]
          return !(reg?.concluido && reg?.impressao_etiqueta)
        })
      }))
      .filter(grupo => grupo.tarefas.length > 0)

    return (
      <div>
        <div style={{ position: 'sticky', top: '97px', zIndex: 9, background: '#f9fafb', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
          <input
            type="text"
            placeholder="Pesquisar ingrediente..."
            value={pesquisaPreparacao}
            onChange={e => setPesquisaPreparacao(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '20px', alignItems: 'start' }}>
          {/* Coluna principal: ingredientes ativos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {gruposAtivos.length === 0 && (
              <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>
                {gruposFiltrados.length === 0 ? 'Nenhum ingrediente encontrado.' : 'Todas as tarefas foram concluídas.'}
              </p>
            )}
            {gruposAtivos.map(grupo => (
              <div key={grupo.ingredienteNome}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #e5e7eb' }}>
                  {grupo.ingredienteNome}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {grupo.tarefas.sort((a, b) => a.ordem - b.ordem).map(tarefa => {
                    const chave = `preparacao|${tarefa.tarefaId}`
                    const reg = registos[chave] || { concluido: false, impressao_etiqueta: false }
                    const feita = reg.concluido || false
                    const impressa = reg.impressao_etiqueta || false
                    const desinf = registosDesinfeccao[tarefa.tarefaId] || DEFAULT_DESINFECCAO

                    return (
                      <div key={tarefa.tarefaId} style={{ background: feita ? '#f0fdf4' : '#fff', border: `1px solid ${feita ? '#86efac' : '#e5e7eb'}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: '500', color: feita ? '#9ca3af' : '#111', textDecoration: feita ? 'line-through' : 'none', margin: '0 0 4px' }}>{tarefa.tarefa}</p>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }}>{fmtQtd(tarefa.quantidade, tarefa.unidade)}</p>
                          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 1px' }}>→ {tarefa.componenteDestino}</p>
                          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{tarefa.pratoDestino}</p>
                          {tarefa.observacoes && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{tarefa.observacoes}</p>}
                        </div>
                        {!feita && (
                          <button onClick={() => guardarRegisto('preparacao', tarefa.tarefaId, { concluido: true })}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#80c944', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                            Feito ✓
                          </button>
                        )}
                        {feita && !impressa && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {tarefa.requerDesinfeccao && (
                              <div style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                                  Desinfeção
                                </p>
                                <div>
                                  <label style={estiloLabel}>Desinfectante (ml)</label>
                                  <SliderSimples
                                    valor={desinf.quantidade_desinfectante_ml}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onChange={v => guardarRegistoDesinfeccao(tarefa.tarefaId, { quantidade_desinfectante_ml: Math.round(v) })}
                                    formatarValor={v => `${Math.round(v)} ml`}
                                  />
                                </div>
                                <div>
                                  <label style={estiloLabel}>Água (litros)</label>
                                  <SliderSimples
                                    valor={desinf.litros_agua}
                                    min={0}
                                    max={50}
                                    step={0.5}
                                    onChange={v => guardarRegistoDesinfeccao(tarefa.tarefaId, { litros_agua: Number(v.toFixed(1)) })}
                                    formatarValor={v => `${v.toFixed(1)} l`}
                                  />
                                </div>
                                <div>
                                  <label style={estiloLabel}>Tempo (minutos)</label>
                                  <SliderSimples
                                    valor={desinf.tempo_minutos}
                                    min={0}
                                    max={20}
                                    step={1}
                                    onChange={v => guardarRegistoDesinfeccao(tarefa.tarefaId, { tempo_minutos: Math.round(v) })}
                                    formatarValor={v => `${Math.round(v)} min`}
                                  />
                                </div>
                                <div>
                                  <label style={estiloLabel}>Funcionário</label>
                                  <select value={desinf.nome_staff || ''}
                                    onChange={e => guardarRegistoDesinfeccao(tarefa.tarefaId, { nome_staff: e.target.value || null })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: '#fff', color: '#111827', boxSizing: 'border-box' }}>
                                    <option value="">— Seleciona quem fez —</option>
                                    {staffLoja.map(s => (
                                      <option key={s.id} value={s.nome}>{s.nome}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                            {(() => {
                              const desinfStaffOk = !tarefa.requerDesinfeccao || !!desinf.nome_staff
                              const chaveEtiq = `preparacao|${tarefa.tarefaId}`
                              const qtdEtiq = numEtiquetas[chaveEtiq] || 1
                              const concluirSemImprimir = () => {
                                if (!desinfStaffOk) return
                                guardarRegisto('preparacao', tarefa.tarefaId, { impressao_etiqueta: true })
                                if (tarefa.requerDesinfeccao) {
                                  guardarRegistoDesinfeccao(tarefa.tarefaId, { concluido: true })
                                }
                              }
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <SeletorEtiquetas
                                      valor={qtdEtiq}
                                      onChange={v => setNumEtiquetas(prev => ({ ...prev, [chaveEtiq]: v }))}
                                      altura={44}
                                    />
                                    <button
                                      onClick={() => {
                                        if (!desinfStaffOk) return
                                        const zpl = gerarZPL({ componenteDestino: tarefa.componenteDestino, pratoDestino: tarefa.pratoDestino, ingrediente: grupo.ingredienteNome, quantidade: fmtQtd(tarefa.quantidade, tarefa.unidade), data: dataHoje() })
                                        imprimirVarias(zpl, qtdEtiq, () => {
                                          guardarRegisto('preparacao', tarefa.tarefaId, { impressao_etiqueta: true })
                                          if (tarefa.requerDesinfeccao) {
                                            guardarRegistoDesinfeccao(tarefa.tarefaId, { concluido: true })
                                          }
                                        })
                                      }}
                                      disabled={!desinfStaffOk}
                                      title={desinfStaffOk ? '' : 'Seleciona o funcionário antes de imprimir'}
                                      style={{ flex: 1, height: '44px', borderRadius: '8px', border: '1px solid ' + (desinfStaffOk ? '#d1d5db' : '#e5e7eb'), background: desinfStaffOk ? '#fff' : '#f3f4f6', color: desinfStaffOk ? '#374151' : '#9ca3af', fontSize: '14px', fontWeight: '500', cursor: desinfStaffOk ? 'pointer' : 'not-allowed' }}>
                                      {desinfStaffOk ? '🖨 Imprimir etiqueta' : 'Seleciona o funcionário'}
                                    </button>
                                  </div>
                                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={concluirSemImprimir}
                                      disabled={!desinfStaffOk}
                                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: desinfStaffOk ? '#6b7280' : '#d1d5db', fontSize: '12px', cursor: desinfStaffOk ? 'pointer' : 'not-allowed' }}>
                                      Concluir sem imprimir
                                    </button>
                                    <button onClick={() => guardarRegisto('preparacao', tarefa.tarefaId, { concluido: false })}
                                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                                      Desfazer
                                    </button>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Coluna lateral: tarefas concluídas como pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pillsConcluidos.length > 0 && (
              <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                Concluídos ({pillsConcluidos.length})
              </p>
            )}
            {pillsConcluidos.map(pill => (
              <PillConcluido
                key={pill.tarefaId}
                label={pill.label}
                onDesfazer={() => guardarRegisto('preparacao', pill.tarefaId, { concluido: false, impressao_etiqueta: false })}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Confeção ─────────────────────────────────────────────────
  function renderConfeccao() {
    const componentesMap: Record<string, { componenteId: number; componenteNome: string; quantidadeTotal: number; unidade: string | null; unidadeRendimento: string | null; tarefas: TarefaConfeccao[]; pratosDestino: Set<string> }> = {}
    detalhes.forEach(item => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato'
      const doses = Number(item.quantidade || 0)
      pratosComponentes.filter(pc => Number(pc.prato_id) === pratoId).forEach(pc => {
        const cId = Number(pc.componente_id)
        const cNome = pc.componentes?.nome || 'Componente'
        const qtd = parseNum(pc.quantidade_final) * doses
        const tarefasC = tarefasConfeccao.filter(t => Number(t.componente_id) === cId)
        if (!tarefasC.length) return
        const chave = String(cId)
        if (!componentesMap[chave]) componentesMap[chave] = { componenteId: cId, componenteNome: cNome, quantidadeTotal: 0, unidade: pc.unidade, unidadeRendimento: pc.componentes?.unidade_rendimento || null, tarefas: tarefasC, pratosDestino: new Set() }
        componentesMap[chave].quantidadeTotal += qtd
        componentesMap[chave].pratosDestino.add(pratoNome)
      })
    })

    const todosComponentes = Object.values(componentesMap)
      .filter(c => c.componenteNome.toLowerCase().includes(pesquisaConfeccao.toLowerCase()))
      .sort((a, b) => a.componenteNome.localeCompare(b.componenteNome))

    const ativos = todosComponentes.filter(c => {
      const reg = registos[`confeccao|${c.componenteId}`]
      return !(reg?.concluido && reg?.impressao_etiqueta)
    })
    const feitos = todosComponentes.filter(c => {
      const reg = registos[`confeccao|${c.componenteId}`]
      return reg?.concluido && reg?.impressao_etiqueta
    })

    return (
      <div>
        {/* Barra de pesquisa sticky */}
        <div style={{ position: 'sticky', top: '97px', zIndex: 9, background: '#f9fafb', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
          <input
            type="text"
            placeholder="Pesquisar componente..."
            value={pesquisaConfeccao}
            onChange={e => setPesquisaConfeccao(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box' }}
          />
        </div>

        {/* Layout duas zonas: ativos à esquerda, feitos à direita */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '20px', alignItems: 'start' }}>
          {/* Coluna principal: componentes ativos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ativos.length === 0 && (
              <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>
                {todosComponentes.length === 0 ? 'Nenhum componente encontrado.' : 'Todos os componentes foram concluídos.'}
              </p>
            )}
            {ativos.map(comp => {
              const chave = `confeccao|${comp.componenteId}`
              const reg = registos[chave] || { concluido: false, impressao_etiqueta: false }
              const cfgSlider = configSliderUnidade(comp.unidadeRendimento)
              const qtdFinal = reg.quantidade_final ?? 0
              const tempConf = reg.temperatura_confeccao ?? 75
              const tempAbat = reg.temperatura_abatimento ?? 6
              const tempArref = reg.tempo_arrefecimento ?? 60
              const confOk = tempConf >= 75
              const abatOk = tempAbat >= 2 && tempAbat <= 6
              const arrefOk = tempArref >= 20 && tempArref <= 120
              const feito = reg.concluido || false
              const impressa = reg.impressao_etiqueta || false
              const podeImprimir = qtdFinal > 0
              const pratosDestinoStr = Array.from(comp.pratosDestino).join(', ')

              if (!feito) {
                return (
                  <div key={comp.componenteId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <p style={{ fontSize: '17px', fontWeight: '500', color: '#111', margin: '0 0 2px' }}>{comp.componenteNome}</p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{fmtQtd(comp.quantidadeTotal, comp.unidade)}</p>
                      {pratosDestinoStr && (
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>→ {pratosDestinoStr}</p>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tarefas</p>
                      {comp.tarefas.sort((a, b) => a.ordem - b.ordem).map(t => (
                        <p key={t.id} style={{ fontSize: '13px', color: '#374151', margin: '0 0 3px' }}>{t.ordem}. {t.tarefa}{t.observacoes ? ` — ${t.observacoes}` : ''}</p>
                      ))}
                    </div>

                    <button
                      onClick={() => guardarRegisto('confeccao', comp.componenteId, { concluido: true })}
                      style={{ width: '100%', padding: '13px', borderRadius: '8px', border: 'none', background: '#80c944', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                      Feito ✓
                    </button>
                  </div>
                )
              }

              return (
                <div key={comp.componenteId} style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <p style={{ fontSize: '17px', fontWeight: '500', color: '#111', margin: '0 0 2px' }}>{comp.componenteNome}</p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{fmtQtd(comp.quantidadeTotal, comp.unidade)}</p>
                    {pratosDestinoStr && (
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>→ {pratosDestinoStr}</p>
                    )}
                  </div>

                  <div>
                    <label style={estiloLabel}>Quantidade final ({cfgSlider.unidade})</label>
                    <SliderComBotoes
                      valor={qtdFinal}
                      min={cfgSlider.min}
                      max={cfgSlider.max}
                      step={cfgSlider.step}
                      onChange={v => guardarRegisto('confeccao', comp.componenteId, { quantidade_final: v })}
                      formatarValor={cfgSlider.formatar}
                    />
                  </div>

                  <div>
                    <label style={estiloLabel}>
                      Temp. confeção — <span style={{ color: confOk ? '#16a34a' : '#dc2626', fontWeight: '500' }}>{confOk ? '✓ OK' : '⚠ Mín. 75°C'}</span>
                    </label>
                    <SliderComBotoes
                      valor={tempConf}
                      min={-18}
                      max={100}
                      step={0.1}
                      onChange={v => guardarRegisto('confeccao', comp.componenteId, { temperatura_confeccao: Number(v.toFixed(1)) })}
                      formatarValor={v => `${v.toFixed(1)}°C`}
                      corValor={confOk ? '#16a34a' : '#dc2626'}
                    />
                  </div>

                  <div>
                    <label style={estiloLabel}>
                      Temp. abatimento — <span style={{ color: abatOk ? '#16a34a' : '#dc2626', fontWeight: '500' }}>{abatOk ? '✓ OK' : '⚠ Entre 2°C e 6°C'}</span>
                    </label>
                    <SliderComBotoes
                      valor={tempAbat}
                      min={-18}
                      max={100}
                      step={0.1}
                      onChange={v => guardarRegisto('confeccao', comp.componenteId, { temperatura_abatimento: Number(v.toFixed(1)) })}
                      formatarValor={v => `${v.toFixed(1)}°C`}
                      corValor={abatOk ? '#16a34a' : '#dc2626'}
                    />
                  </div>

                  <div>
                    <label style={estiloLabel}>
                      Tempo de arrefecimento — <span style={{ color: arrefOk ? '#16a34a' : '#dc2626', fontWeight: '500' }}>{arrefOk ? '✓ OK' : '⚠ Entre 20 min e 2h'}</span>
                    </label>
                    <SliderComBotoes
                      valor={tempArref}
                      min={0}
                      max={180}
                      step={1}
                      onChange={v => guardarRegisto('confeccao', comp.componenteId, { tempo_arrefecimento: Math.round(v) })}
                      formatarValor={v => `${Math.round(v)} min`}
                      corValor={arrefOk ? '#16a34a' : '#dc2626'}
                    />
                  </div>

                  <div>
                    <label style={estiloLabel}>Funcionário</label>
                    <select value={reg.nome_staff || ''}
                      onChange={e => guardarRegisto('confeccao', comp.componenteId, { nome_staff: e.target.value || null })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: '#fff', color: '#111827', boxSizing: 'border-box' }}>
                      <option value="">— Seleciona quem fez —</option>
                      {staffLoja.map(s => (
                        <option key={s.id} value={s.nome}>{s.nome}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const staffOk = !!reg.nome_staff
                    const podeImprimirAgora = podeImprimir && staffOk
                    const chaveEtiq = `confeccao|${comp.componenteId}`
                    const qtdEtiq = numEtiquetas[chaveEtiq] || 1
                    const labelBotao = !podeImprimir ? 'Define a quantidade final' : !staffOk ? 'Seleciona o funcionário' : '🖨 Imprimir etiqueta'
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <SeletorEtiquetas
                            valor={qtdEtiq}
                            onChange={v => setNumEtiquetas(prev => ({ ...prev, [chaveEtiq]: v }))}
                            altura={44}
                          />
                          <button
                            onClick={() => {
                              if (!podeImprimirAgora) return
                              const zpl = gerarZPLConfeccao({ componente: comp.componenteNome, pratosDestino: pratosDestinoStr, quantidadeFinal: cfgSlider.formatar(qtdFinal), data: dataHoje() })
                              imprimirVarias(zpl, qtdEtiq, () => guardarRegisto('confeccao', comp.componenteId, { impressao_etiqueta: true }))
                            }}
                            disabled={!podeImprimirAgora}
                            style={{
                              flex: 1,
                              height: '44px',
                              borderRadius: '8px',
                              border: '1px solid ' + (podeImprimirAgora ? '#d1d5db' : '#e5e7eb'),
                              background: podeImprimirAgora ? '#fff' : '#f3f4f6',
                              color: podeImprimirAgora ? '#374151' : '#9ca3af',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: podeImprimirAgora ? 'pointer' : 'not-allowed',
                            }}>
                            {labelBotao}
                          </button>
                        </div>
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => podeImprimirAgora && guardarRegisto('confeccao', comp.componenteId, { impressao_etiqueta: true })}
                            disabled={!podeImprimirAgora}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: podeImprimirAgora ? '#6b7280' : '#d1d5db', fontSize: '12px', cursor: podeImprimirAgora ? 'pointer' : 'not-allowed' }}>
                            Concluir sem imprimir
                          </button>
                          <button onClick={() => guardarRegisto('confeccao', comp.componenteId, { concluido: false, impressao_etiqueta: false })}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                            Desfazer
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {/* Coluna lateral: componentes feitos como pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {feitos.length > 0 && (
              <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                Concluídos ({feitos.length})
              </p>
            )}
            {feitos.map(comp => {
              const chave = `confeccao|${comp.componenteId}`
              const reg = registos[chave]
              const cfgSlider = configSliderUnidade(comp.unidadeRendimento)
              const qtdFinal = reg?.quantidade_final ?? 0
              const label = `${comp.componenteNome} · ${cfgSlider.formatar(qtdFinal)}`
              return (
                <PillConcluido
                  key={comp.componenteId}
                  label={label}
                  onDesfazer={() => guardarRegisto('confeccao', comp.componenteId, { concluido: false, impressao_etiqueta: false })}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Finalização ──────────────────────────────────────────────
  function renderFinalizacao() {
    const pratosMap: Record<string, { pratoNome: string; tarefas: { tarefaId: number; tarefa: string; observacoes: string | null; ordem: number; componenteNome: string; quantidade: number; unidade: string | null }[] }> = {}
    detalhes.forEach(item => {
      const pratoId = Number(item.pratos?.id)
      const pratoNome = item.pratos?.nome || 'Prato'
      const doses = Number(item.quantidade || 0)
      const chave = pratoNome.trim().toLowerCase()
      pratosComponentes.filter(pc => Number(pc.prato_id) === pratoId).forEach(pc => {
        tarefasFinalizacao.filter(t => Number(t.componente_id) === Number(pc.componente_id)).forEach(t => {
          const qtd = parseNum(pc.quantidade_final) * doses
          if (!pratosMap[chave]) pratosMap[chave] = { pratoNome, tarefas: [] }
          const idx = pratosMap[chave].tarefas.findIndex(x => x.tarefaId === t.id)
          if (idx >= 0) pratosMap[chave].tarefas[idx].quantidade += qtd
          else pratosMap[chave].tarefas.push({ tarefaId: t.id, tarefa: t.tarefa, observacoes: t.observacoes, ordem: Number(t.ordem), componenteNome: pc.componentes?.nome || 'Componente', quantidade: qtd, unidade: pc.unidade })
        })
      })
    })

    const pratosFiltrados = Object.values(pratosMap)
      .filter(p => p.tarefas.length > 0)
      .filter(p => p.pratoNome.toLowerCase().includes(pesquisaFinalizacao.toLowerCase()))
      .sort((a, b) => a.pratoNome.localeCompare(b.pratoNome))

    // Construir lista plana de pills concluídos (todos os pratos)
    // Só vai para "Concluídos" quando estiver feito E impresso
    const pillsConcluidos: { chave: string; tarefaId: number; label: string }[] = []
    pratosFiltrados.forEach(prato => {
      prato.tarefas.forEach(tarefa => {
        const reg = registos[`finalizacao|${tarefa.tarefaId}`]
        if (reg?.concluido && reg?.impressao_etiqueta) {
          pillsConcluidos.push({ chave: `${prato.pratoNome}|${tarefa.tarefaId}`, tarefaId: tarefa.tarefaId, label: `${prato.pratoNome} · ${tarefa.tarefa}` })
        }
      })
    })

    // Filtrar pratos para mostrar apenas os que têm tarefas ativas (não concluídas+impressas)
    const pratosAtivos = pratosFiltrados
      .map(prato => ({
        ...prato,
        tarefas: prato.tarefas.filter(tarefa => {
          const reg = registos[`finalizacao|${tarefa.tarefaId}`]
          return !(reg?.concluido && reg?.impressao_etiqueta)
        })
      }))
      .filter(prato => prato.tarefas.length > 0)

    return (
      <div>
        <div style={{ position: 'sticky', top: '97px', zIndex: 9, background: '#f9fafb', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
          <input
            type="text"
            placeholder="Pesquisar prato..."
            value={pesquisaFinalizacao}
            onChange={e => setPesquisaFinalizacao(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '20px', alignItems: 'start' }}>
          {/* Coluna principal: pratos com tarefas ativas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pratosAtivos.length === 0 && (
              <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>
                {pratosFiltrados.length === 0 ? 'Nenhum prato encontrado.' : 'Todas as tarefas foram concluídas.'}
              </p>
            )}
            {pratosAtivos.map(prato => (
              <div key={prato.pratoNome}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #e5e7eb' }}>{prato.pratoNome}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {prato.tarefas.sort((a, b) => a.ordem - b.ordem).map(tarefa => {
                    const chave = `finalizacao|${tarefa.tarefaId}`
                    const reg = registos[chave] || { concluido: false, impressao_etiqueta: false }
                    const feita = reg.concluido || false
                    const impressa = reg.impressao_etiqueta || false

                    return (
                      <div key={tarefa.tarefaId} style={{ background: feita ? '#f0fdf4' : '#fff', border: `1px solid ${feita ? '#86efac' : '#e5e7eb'}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }}>{tarefa.componenteNome}</p>
                          <p style={{ fontSize: '15px', fontWeight: '500', color: feita ? '#9ca3af' : '#111', textDecoration: feita ? 'line-through' : 'none', margin: '0 0 2px' }}>{tarefa.tarefa}</p>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{fmtQtd(tarefa.quantidade, tarefa.unidade)}{tarefa.observacoes ? ` · ${tarefa.observacoes}` : ''}</p>
                        </div>
                        {!feita && (
                          <button onClick={() => guardarRegisto('finalizacao', tarefa.tarefaId, { concluido: true })}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#80c944', color: '#fff', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
                            Feito ✓
                          </button>
                        )}
                        {feita && !impressa && (() => {
                          const chaveEtiq = `finalizacao|${tarefa.tarefaId}`
                          const qtdEtiq = numEtiquetas[chaveEtiq] || 1
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <SeletorEtiquetas
                                  valor={qtdEtiq}
                                  onChange={v => setNumEtiquetas(prev => ({ ...prev, [chaveEtiq]: v }))}
                                  altura={44}
                                />
                                <button
                                  onClick={() => {
                                    const zpl = gerarZPLFinalizacao({ componente: tarefa.componenteNome, pratoDestino: prato.pratoNome, data: dataHoje() })
                                    imprimirVarias(zpl, qtdEtiq, () => guardarRegisto('finalizacao', tarefa.tarefaId, { impressao_etiqueta: true }))
                                  }}
                                  style={{ flex: 1, height: '44px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                                  🖨 Imprimir etiqueta
                                </button>
                              </div>
                              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                                <button onClick={() => guardarRegisto('finalizacao', tarefa.tarefaId, { impressao_etiqueta: true })}
                                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                                  Concluir sem imprimir
                                </button>
                                <button onClick={() => guardarRegisto('finalizacao', tarefa.tarefaId, { concluido: false })}
                                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#f3f4f6', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                                  Desfazer
                                </button>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Coluna lateral: tarefas concluídas como pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pillsConcluidos.length > 0 && (
              <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                Concluídos ({pillsConcluidos.length})
              </p>
            )}
            {pillsConcluidos.map(pill => (
              <PillConcluido
                key={pill.chave}
                label={pill.label}
                onDesfazer={() => guardarRegisto('finalizacao', pill.tarefaId, { concluido: false, impressao_etiqueta: false })}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Embalamento ──────────────────────────────────────────────
  function renderEmbalamento() {
    const gruposNome: Record<string, { pratoNome: string; categoria: string | null; prioridade: number | null; itens: DetalheProducao[] }> = {}
    detalhes.forEach(item => {
      const nome = item.pratos?.nome || 'Prato'
      const chave = nome.trim().toLowerCase()
      if (!gruposNome[chave]) gruposNome[chave] = { pratoNome: nome, categoria: item.pratos?.categoria_prato || null, prioridade: item.pratos?.prioridade_embalamento ?? null, itens: [] }
      gruposNome[chave].itens.push(item)
    })
    Object.values(gruposNome).forEach(g => {
      g.itens.sort((a, b) => ordemTamanho(a.pratos?.tamanho || '') - ordemTamanho(b.pratos?.tamanho || ''))
    })

    // ⚠ MUDANÇA IMPORTANTE: referencia_id passa a ser o prato_id do tamanho mais pequeno
    // do grupo (NÃO o producoes_semanais_itens.id, que muda quando o gestor reordena).
    // Isto torna o registo estável: reordenar cartões já não apaga nada.
    function refIdGrupo(itens: DetalheProducao[]): number {
      const ordenados = [...itens].sort((a, b) =>
        ordemTamanho(a.pratos?.tamanho || '') - ordemTamanho(b.pratos?.tamanho || '')
      )
      return Number(ordenados[0]?.pratos?.id) || 0
    }

    const porCategoria: Record<string, typeof gruposNome[string][]> = {}
    Object.values(gruposNome).forEach(grupo => {
      const cat = grupo.categoria || 'Outros'
      if (!porCategoria[cat]) porCategoria[cat] = []
      porCategoria[cat].push(grupo)
    })

    const categorias = ORDEM_CATEGORIAS.filter(c => porCategoria[c]).concat(Object.keys(porCategoria).filter(c => !ORDEM_CATEGORIAS.includes(c)).sort())
    const catAtiva = categoriaEmbalamento || categorias[0] || ''
    const gruposDaCat = (porCategoria[catAtiva] || [])
      .filter(g => g.pratoNome.toLowerCase().includes(pesquisaEmbalamento.toLowerCase()))
      .sort((a, b) => (a.prioridade ?? 999) - (b.prioridade ?? 999) || a.pratoNome.localeCompare(b.pratoNome))

    const todosExtras: { pratoNome: string; categoria: string | null; itens: { tamanho: string; sku: string; quantidade: number }[]; etiquetasImpressas: boolean; chaveGrupo: string; referenciaId: number }[] = []
    Object.values(gruposNome).forEach(grupo => {
      const referenciaId = refIdGrupo(grupo.itens)
      const chaveGrupo = `emb|${referenciaId}`
      const reg = registosEmbalamento[chaveGrupo]
      if (reg?.extras === true) {
        todosExtras.push({
          pratoNome: grupo.pratoNome,
          categoria: grupo.categoria,
          itens: grupo.itens.map(i => ({
            tamanho: i.pratos?.tamanho?.toUpperCase() || '-',
            sku: i.pratos?.sku || '-',
            quantidade: reg.extrasPorTamanho?.[Number(i.pratos?.id)] ?? 0
          })),
          etiquetasImpressas: reg.etiquetasImpressas || false,
          chaveGrupo,
          referenciaId
        })
      }
    })

    return (
      <div style={{ position: 'relative' }}>
        {todosExtras.length > 0 && (
          <button onClick={() => setMostrarPainelExtras(true)}
            style={{ position: 'fixed', right: '20px', bottom: '24px', zIndex: 50, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            Extras ({todosExtras.length})
          </button>
        )}

        {mostrarPainelExtras && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setMostrarPainelExtras(false) }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '420px', height: '100vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>Extras registados</p>
                <button onClick={() => setMostrarPainelExtras(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>Fechar</button>
              </div>
              {todosExtras.map(item => {
                const cores = coresCategoria(item.categoria)
                return (
                  <div key={item.pratoNome} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '10px', background: cores.bg, color: cores.texto, padding: '2px 8px', borderRadius: '99px', fontWeight: '500', display: 'inline-block', marginBottom: '4px' }}>{item.categoria || 'Outros'}</span>
                        <p style={{ fontSize: '16px', fontWeight: '500', color: '#111', margin: 0 }}>{item.pratoNome}</p>
                      </div>
                      <button onClick={() => guardarRegistoEmbalamento(item.chaveGrupo, item.referenciaId, { etiquetasImpressas: !item.etiquetasImpressas })}
                        style={{ background: item.etiquetasImpressas ? '#f0fdf4' : '#f3f4f6', border: `1px solid ${item.etiquetasImpressas ? '#86efac' : '#e5e7eb'}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '500', color: item.etiquetasImpressas ? '#16a34a' : '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {item.etiquetasImpressas ? '✓ Etiquetas impressas' : 'Etiquetas impressas'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {item.itens.filter(i => i.quantidade > 0).map(i => (
                        <div key={i.sku} style={{ display: 'flex', justifyContent: 'space-between', background: '#f9fafb', borderRadius: '6px', padding: '6px 10px' }}>
                          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{i.tamanho} · {i.sku}</span>
                          <span style={{ fontSize: '13px', color: '#111827', fontWeight: '600' }}>{i.quantidade} extras</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ position: 'sticky', top: '97px', zIndex: 9, background: '#f9fafb', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
          <input
            type="text"
            placeholder="Pesquisar prato..."
            value={pesquisaEmbalamento}
            onChange={e => setPesquisaEmbalamento(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', marginBottom: '10px', outline: 'none', background: '#fff', color: '#111827', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {categorias.map(cat => {
              const cores = coresCategoria(cat)
              const ativa = cat === catAtiva
              return (
                <button key={cat} onClick={() => setCategoriaEmbalamento(cat)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${ativa ? cores.borda : '#e5e7eb'}`, background: ativa ? cores.bg : '#fff', color: ativa ? cores.texto : '#6b7280', fontSize: '14px', fontWeight: ativa ? '500' : '400', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {(() => {
          // Separar grupos: ativos vs concluídos (colapsados em pills)
          const gruposAtivos: typeof gruposDaCat = []
          const pillsConcluidos: { chaveGrupo: string; referenciaId: number; pratoNome: string; label: string }[] = []
          gruposDaCat.forEach(grupo => {
            const referenciaId = refIdGrupo(grupo.itens)
            const chaveGrupo = `emb|${referenciaId}`
            const reg = registosEmbalamento[chaveGrupo]
            const feito = reg?.concluido || false
            const extrasRespondido = reg?.extras !== null && reg?.extras !== undefined
            if (feito && extrasRespondido) {
              const label = `${grupo.pratoNome}${reg?.extras === true ? ` · Extras: ${grupo.itens.map(i => `${i.pratos?.tamanho?.toUpperCase()} ${reg.extrasPorTamanho?.[Number(i.pratos?.id)] ?? 0}`).join(' ')}` : ' · Sem extras'}`
              pillsConcluidos.push({ chaveGrupo, referenciaId, pratoNome: grupo.pratoNome, label })
            } else {
              gruposAtivos.push(grupo)
            }
          })

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 200px', gap: '20px', alignItems: 'start' }}>
              {/* Coluna principal: pratos ativos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {gruposAtivos.length === 0 && (
                  <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>
                    {gruposDaCat.length === 0 ? 'Nenhum prato encontrado.' : 'Todos os pratos foram concluídos.'}
                  </p>
                )}
                {gruposAtivos.map(grupo => {
                  const referenciaId = refIdGrupo(grupo.itens)
                  const chaveGrupo = `emb|${referenciaId}`
                  const reg = registosEmbalamento[chaveGrupo] || { concluido: false, extras: null, extrasPorTamanho: {}, etiquetasImpressas: false }
                  const feito = reg.concluido || false
                  const temExtras = reg.extras === true
                  const cores = coresCategoria(grupo.categoria)

                  return (
              <div key={grupo.pratoNome} style={{ background: feito ? '#f0fdf4' : '#fff', border: `1px solid ${feito ? '#86efac' : '#e5e7eb'}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '10px', background: cores.bg, color: cores.texto, padding: '2px 8px', borderRadius: '99px', fontWeight: '500', display: 'inline-block', marginBottom: '4px' }}>{grupo.categoria || 'Outros'}</span>
                    <p style={{ fontSize: '17px', fontWeight: '500', color: feito ? '#9ca3af' : '#111', margin: 0 }}>{grupo.pratoNome}</p>
                  </div>
                  <button onClick={() => guardarRegistoEmbalamento(chaveGrupo, referenciaId, { concluido: !feito })}
                    style={{ background: feito ? '#e5e7eb' : '#80c944', color: feito ? '#374151' : '#fff', border: 'none', borderRadius: '10px', padding: '12px 22px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    {feito ? 'Desfazer' : 'Feito ✓'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {grupo.itens.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                      <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>{item.pratos?.tamanho?.toUpperCase()} · {item.pratos?.sku}</span>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.quantidade} doses</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                  <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>Deu extras?</p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: temExtras ? '12px' : 0 }}>
                    <button onClick={() => guardarRegistoEmbalamento(chaveGrupo, referenciaId, { extras: temExtras ? null : true })}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${temExtras ? '#80c944' : '#e5e7eb'}`, background: temExtras ? '#f0fdf4' : '#fff', fontSize: '14px', fontWeight: '500', color: temExtras ? '#16a34a' : '#374151', cursor: 'pointer' }}>
                      Sim
                    </button>
                    <button onClick={() => guardarRegistoEmbalamento(chaveGrupo, referenciaId, { extras: reg.extras === false ? null : false, extrasPorTamanho: {} })}
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${reg.extras === false ? '#d1d5db' : '#e5e7eb'}`, background: reg.extras === false ? '#f9fafb' : '#fff', fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer' }}>
                      Não
                    </button>
                  </div>
                  {temExtras && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                      {grupo.itens.map(item => {
                        const tamLabel = item.pratos?.tamanho?.toUpperCase() || '-'
                        const pratoIdItem = Number(item.pratos?.id)
                        const qtdExtra = reg.extrasPorTamanho?.[pratoIdItem] ?? 0
                        return (
                          <div key={item.id}>
                            <label style={estiloLabel}>Extras {tamLabel} · {item.pratos?.sku}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input type="range" min="0" max="50" step="1" value={qtdExtra}
                                onChange={e => {
                                  const novosExtras = { ...(reg.extrasPorTamanho || {}), [pratoIdItem]: parseInt(e.target.value) }
                                  guardarRegistoEmbalamento(chaveGrupo, referenciaId, { extrasPorTamanho: novosExtras })
                                }}
                                style={{ flex: 1, accentColor: '#111827' }} />
                              <span style={{ fontSize: '14px', fontWeight: '500', minWidth: '60px', color: '#111827' }}>{qtdExtra}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
              </div>

              {/* Coluna lateral: pratos concluídos como pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pillsConcluidos.length > 0 && (
                  <p style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                    Concluídos ({pillsConcluidos.length})
                  </p>
                )}
                {pillsConcluidos.map(pill => (
                  <PillConcluido
                    key={pill.pratoNome}
                    label={pill.label}
                    onDesfazer={() => guardarRegistoEmbalamento(pill.chaveGrupo, pill.referenciaId, { concluido: false })}
                  />
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  if (aCarregar) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#6b7280', fontSize: '16px' }}>A carregar...</p>
    </div>
  )

  if (!producaoAtiva) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', gap: '16px' }}>
      <p style={{ fontSize: '18px', color: '#111' }}>Nenhum plano ativo de momento.</p>
      <p style={{ fontSize: '14px', color: '#6b7280' }}>Pede ao gestor para ativar um plano de produção.</p>
      <button onClick={() => router.push('/')} style={{ background: '#e5e7eb', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>← Voltar</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 2px', color: '#111' }}>{producaoAtiva.nome_semana}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{nomeUtilizador}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => router.push('/')} style={{ background: '#f3f4f6', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>← Início</button>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>Sair</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: '57px', zIndex: 10 }}>
        {secoesVisiveis.map(s => (
          <button key={s} onClick={() => setSecaoAtiva(s)}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: secaoAtiva === s ? '#80c944' : '#f3f4f6', color: secaoAtiva === s ? '#fff' : '#374151', fontSize: '15px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {labelSecao[s]}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
        {secaoAtiva === 'preparacao' && renderPreparacao()}
        {secaoAtiva === 'confeccao' && renderConfeccao()}
        {secaoAtiva === 'finalizacao' && renderFinalizacao()}
        {secaoAtiva === 'embalamento' && renderEmbalamento()}
      </div>
    </div>
  )
}
