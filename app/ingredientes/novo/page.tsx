'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const unidadesBase = ['g', 'kg', 'ml', 'l', 'un']
const categoriasBase = [
  'talho',
  'hortofrutícolas',
  'mercearia',
  'laticínios',
  'congelados',
  'peixaria',
  'padaria',
  'outros',
]

export default function NovoIngredientePage() {
  const [nome, setNome] = useState('')
  const [unidadeBase, setUnidadeBase] = useState('g')
  const [precoUnitario, setPrecoUnitario] = useState('')
  const [unidadePreco, setUnidadePreco] = useState('kg')
  const [categoria, setCategoria] = useState('')

  const [nomeFornecedor, setNomeFornecedor] = useState('')
  const [referenciaFornecedor, setReferenciaFornecedor] = useState('')
  const [quantidadeEmbalagem, setQuantidadeEmbalagem] = useState('')
  const [unidadeEmbalagem, setUnidadeEmbalagem] = useState('kg')

  const [pesquisa, setPesquisa] = useState('')
  const [ingredientesEncontrados, setIngredientesEncontrados] = useState([])
  const [aPesquisar, setAPesquisar] = useState(false)

  const [aGuardar, setAGuardar] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const texto = pesquisa.trim()

    if (!texto) {
      setIngredientesEncontrados([])
      setAPesquisar(false)
      return
    }

    const timeout = setTimeout(() => {
      pesquisarIngredientes(texto)
    }, 300)

    return () => clearTimeout(timeout)
  }, [pesquisa])

  async function pesquisarIngredientes(textoPesquisa) {
    setAPesquisar(true)

    const { data, error } = await supabase
      .from('ingredientes')
      .select(
        `
        id,
        nome,
        unidade_base,
        categoria,
        preco,
        unidade_preco,
        nome_fornecedor,
        referencia_fornecedor,
        quantidade_embalagem,
        unidade_embalagem
      `
      )
      .ilike('nome', `%${textoPesquisa}%`)
      .order('nome', { ascending: true })
      .limit(20)

    if (error) {
      console.log('Erro ao pesquisar ingredientes:', error)
      setIngredientesEncontrados([])
      setAPesquisar(false)
      return
    }

    setIngredientesEncontrados(data || [])
    setAPesquisar(false)
  }

  function preencherComBaseNoIngrediente(ingrediente) {
    setNome('')
    setUnidadeBase(ingrediente.unidade_base || 'g')
    setCategoria(ingrediente.categoria || '')
    setPrecoUnitario(
      ingrediente.preco !== null && ingrediente.preco !== undefined
        ? String(ingrediente.preco)
        : ''
    )
    setUnidadePreco(ingrediente.unidade_preco || 'kg')
    setNomeFornecedor(ingrediente.nome_fornecedor || '')
    setReferenciaFornecedor(ingrediente.referencia_fornecedor || '')
    setQuantidadeEmbalagem(
      ingrediente.quantidade_embalagem !== null &&
        ingrediente.quantidade_embalagem !== undefined
        ? String(ingrediente.quantidade_embalagem)
        : ''
    )
    setUnidadeEmbalagem(ingrediente.unidade_embalagem || 'kg')

    setMensagem(
      `Dados de "${ingrediente.nome}" carregados no formulário. Indica agora o nome do novo ingrediente.`
    )

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function limparFormulario() {
    setNome('')
    setUnidadeBase('g')
    setPrecoUnitario('')
    setUnidadePreco('kg')
    setCategoria('')
    setNomeFornecedor('')
    setReferenciaFornecedor('')
    setQuantidadeEmbalagem('')
    setUnidadeEmbalagem('kg')
  }

  function validarFormulario() {
    if (!nome.trim()) return 'O nome do ingrediente é obrigatório.'
    if (!unidadeBase.trim()) return 'A unidade base é obrigatória.'
    if (!categoria.trim()) return 'A categoria é obrigatória.'

    if (precoUnitario.trim()) {
      const precoNumero = Number(precoUnitario)

      if (Number.isNaN(precoNumero)) {
        return 'O preço unitário tem de ser um número válido.'
      }

      if (precoNumero < 0) {
        return 'O preço unitário não pode ser negativo.'
      }

      if (!unidadePreco.trim()) {
        return 'Se existir preço, tens de indicar a unidade do preço.'
      }
    }

    if (quantidadeEmbalagem.trim()) {
      const quantidadeNumero = Number(quantidadeEmbalagem)

      if (Number.isNaN(quantidadeNumero)) {
        return 'A quantidade da embalagem tem de ser um número válido.'
      }

      if (quantidadeNumero <= 0) {
        return 'A quantidade da embalagem tem de ser maior que zero.'
      }

      if (!unidadeEmbalagem.trim()) {
        return 'Se existir quantidade de embalagem, tens de indicar a unidade da embalagem.'
      }
    }

    return ''
  }

  async function guardarIngrediente() {
    setMensagem('')

    const erroValidacao = validarFormulario()
    if (erroValidacao) {
      setMensagem(erroValidacao)
      return
    }

    setAGuardar(true)

    const nomeNormalizado = nome.trim()
    const nomeFornecedorFinal = nomeFornecedor.trim() || null
    const referenciaFornecedorFinal = referenciaFornecedor.trim() || null
    const precoFinal = precoUnitario.trim() ? Number(precoUnitario) : null
    const unidadePrecoFinal = precoFinal !== null ? unidadePreco.trim() : null
    const quantidadeEmbalagemFinal = quantidadeEmbalagem.trim()
      ? Number(quantidadeEmbalagem)
      : null
    const unidadeEmbalagemFinal =
      quantidadeEmbalagemFinal !== null ? unidadeEmbalagem.trim() : null

    const { data: existente, error: erroExistente } = await supabase
      .from('ingredientes')
      .select('id, nome')
      .ilike('nome', nomeNormalizado)
      .maybeSingle()

    if (erroExistente) {
      console.log('Erro ao verificar ingrediente existente:', erroExistente)
      setMensagem(
        `Erro ao verificar se o ingrediente já existe: ${erroExistente.message}`
      )
      setAGuardar(false)
      return
    }

    if (existente) {
      setMensagem('Já existe um ingrediente com esse nome.')
      setAGuardar(false)
      return
    }

    const { error } = await supabase.from('ingredientes').insert([
      {
        nome: nomeNormalizado,
        unidade_base: unidadeBase.trim(),
        categoria: categoria.trim(),
        preco: precoFinal,
        unidade_preco: unidadePrecoFinal,
        taxa_perda_padrao: null,
        nome_fornecedor: nomeFornecedorFinal,
        referencia_fornecedor: referenciaFornecedorFinal,
        quantidade_embalagem: quantidadeEmbalagemFinal,
        unidade_embalagem: unidadeEmbalagemFinal,
      },
    ])

    if (error) {
      console.log('Erro ao guardar ingrediente:', error)
      setMensagem(`Erro ao guardar o ingrediente: ${error.message}`)
      setAGuardar(false)
      return
    }

    setMensagem('Ingrediente guardado com sucesso!')
    limparFormulario()
    setPesquisa('')
    setIngredientesEncontrados([])
    setAGuardar(false)
  }

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Novo ingrediente</h1>

          <Link
            href="/"
            className="px-4 py-2 rounded bg-gray-200 text-black font-medium"
          >
            Voltar
          </Link>
        </div>

        {mensagem && (
          <div className="border rounded p-4 bg-white mb-6">
            <p>{mensagem}</p>
          </div>
        )}

        <section className="border rounded p-6 bg-gray-50 mb-8">
          <h2 className="text-2xl font-bold mb-4">Pesquisar ingredientes existentes</h2>

          <div>
            <label className="block mb-2 font-medium">Pesquisar por nome</label>
            <input
              type="text"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="w-full border px-3 py-2 rounded bg-white"
              placeholder="Ex: frango"
            />
          </div>

          <div className="mt-4 p-4 rounded bg-white border">
            <p className="text-sm text-gray-700">
              Escreve o nome de um ingrediente para confirmar se já existe ou para
              duplicar um ingrediente existente como base.
            </p>
          </div>

          {pesquisa.trim() && (
            <div className="mt-6 space-y-3">
              {aPesquisar ? (
                <div className="border rounded p-4 bg-white">
                  <p>A pesquisar ingredientes...</p>
                </div>
              ) : ingredientesEncontrados.length === 0 ? (
                <div className="border rounded p-4 bg-white">
                  <p>Nenhum ingrediente encontrado.</p>
                </div>
              ) : (
                ingredientesEncontrados.map((ingrediente) => (
                  <div
                    key={ingrediente.id}
                    className="border rounded p-4 bg-white flex items-center justify-between gap-4"
                  >
                    <p className="font-semibold text-lg">{ingrediente.nome}</p>

                    <button
                      type="button"
                      onClick={() => preencherComBaseNoIngrediente(ingrediente)}
                      className="px-4 py-2 rounded font-medium text-white"
                      style={{ backgroundColor: '#80c944' }}
                    >
                      Duplicar
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <section className="border rounded p-6 bg-gray-50">
          <h2 className="text-2xl font-bold mb-4">Dados do ingrediente</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 font-medium">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
                placeholder="Ex: Peito de frango"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Unidade base</label>
              <select
                value={unidadeBase}
                onChange={(e) => setUnidadeBase(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
              >
                {unidadesBase.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {unidade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
              >
                <option value="">Seleciona uma categoria</option>
                {categoriasBase.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Preço unitário (€)</label>
              <input
                type="number"
                step="0.0001"
                value={precoUnitario}
                onChange={(e) => setPrecoUnitario(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
                placeholder="Ex: 6.50"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Unidade do preço</label>
              <select
                value={unidadePreco}
                onChange={(e) => setUnidadePreco(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
              >
                {unidadesBase.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {unidade}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 pt-2">
              <h3 className="text-lg font-semibold">Dados do fornecedor</h3>
            </div>

            <div>
              <label className="block mb-2 font-medium">Nome do fornecedor</label>
              <input
                type="text"
                value={nomeFornecedor}
                onChange={(e) => setNomeFornecedor(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
                placeholder="Ex: Recheio"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Referência do fornecedor</label>
              <input
                type="text"
                value={referenciaFornecedor}
                onChange={(e) => setReferenciaFornecedor(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
                placeholder="Ex: FRG-001"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Quantidade da embalagem</label>
              <input
                type="number"
                step="0.0001"
                value={quantidadeEmbalagem}
                onChange={(e) => setQuantidadeEmbalagem(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
                placeholder="Ex: 2"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Unidade da embalagem</label>
              <select
                value={unidadeEmbalagem}
                onChange={(e) => setUnidadeEmbalagem(e.target.value)}
                className="w-full border px-3 py-2 rounded bg-white"
              >
                {unidadesBase.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {unidade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 p-4 rounded bg-white border">
            <p className="text-sm text-gray-700">
              A perda, ganho ou manutenção já não é definida no ingrediente.
              Isso agora é configurado dentro de cada componente.
            </p>
          </div>

          <div className="flex gap-3 mt-6 flex-wrap">
            <button
              type="button"
              onClick={guardarIngrediente}
              disabled={aGuardar}
              className="text-white px-6 py-3 rounded font-medium"
              style={{ backgroundColor: '#80c944' }}
            >
              {aGuardar ? 'A guardar...' : 'Guardar ingrediente'}
            </button>

            <button
              type="button"
              onClick={limparFormulario}
              className="px-6 py-3 rounded bg-gray-200 text-black font-medium"
            >
              Limpar formulário
            </button>

            <Link
              href="/"
              className="px-6 py-3 rounded bg-gray-200 text-black font-medium"
            >
              Cancelar
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}