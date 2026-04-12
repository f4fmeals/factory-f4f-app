'use client'

import Link from 'next/link'
import { useState } from 'react'
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
  const [categoria, setCategoria] = useState('talho')

  const [aGuardar, setAGuardar] = useState(false)
  const [mensagem, setMensagem] = useState('')

  function validarFormulario() {
    if (!nome.trim()) return 'O nome do ingrediente é obrigatório.'
    if (!unidadeBase.trim()) return 'A unidade base é obrigatória.'
    if (!categoria.trim()) return 'A categoria é obrigatória.'

    if (precoUnitario.trim() && Number(precoUnitario) < 0) {
      return 'O preço unitário não pode ser negativo.'
    }

    if (precoUnitario.trim() && !unidadePreco.trim()) {
      return 'Se existir preço, tens de indicar a unidade do preço.'
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

    const precoFinal = precoUnitario.trim() ? Number(precoUnitario) : null
    const unidadePrecoFinal = precoFinal !== null ? unidadePreco.trim() : null

    const { error } = await supabase.from('ingredientes').insert([
      {
        nome: nomeNormalizado,
        unidade_base: unidadeBase.trim(),
        categoria: categoria.trim(),
        preco: precoFinal,
        unidade_preco: unidadePrecoFinal,
        taxa_perda_padrao: null,
      },
    ])

    if (error) {
      console.log('Erro ao guardar ingrediente:', error)
      setMensagem(`Erro ao guardar o ingrediente: ${error.message}`)
      setAGuardar(false)
      return
    }

    setMensagem('Ingrediente guardado com sucesso!')

    setNome('')
    setUnidadeBase('g')
    setPrecoUnitario('')
    setUnidadePreco('kg')
    setCategoria('talho')

    setAGuardar(false)
  }

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-3xl mx-auto">
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
          </div>

          <div className="mt-4 p-4 rounded bg-white border">
            <p className="text-sm text-gray-700">
              A perda, ganho ou manutenção já não é definida no ingrediente.
              Isso agora é configurado dentro de cada componente.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={guardarIngrediente}
              disabled={aGuardar}
              className="text-white px-6 py-3 rounded font-medium"
              style={{ backgroundColor: '#80c944' }}
            >
              {aGuardar ? 'A guardar...' : 'Guardar ingrediente'}
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