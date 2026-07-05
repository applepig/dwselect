// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import SearchInput from '../app/components/search/search-input.vue'

function readSource(relative_path: string) {
  return readFileSync(new URL(relative_path, import.meta.url), 'utf8')
}

const UInputStub = defineComponent({
  name: 'UInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, slots }) {
    return () => h('div', { class: attrs.class }, [
      h('input', {
        ...attrs,
        class: undefined,
        value: props.modelValue,
        disabled: props.disabled,
        onInput: (event: Event) => {
          const input = event.target instanceof HTMLInputElement ? event.target.value : ''

          emit('update:modelValue', input)
        },
      }),
      slots.trailing?.(),
    ])
  },
})

const UButtonStub = defineComponent({
  name: 'UButton',
  props: {
    type: {
      type: String,
      default: 'button',
    },
    icon: {
      type: String,
      default: '',
    },
  },
  setup(props, { attrs, slots }) {
    return () => h('button', {
      ...attrs,
      type: props.type,
      'data-icon': props.icon,
    }, slots.default?.())
  },
})

async function mountSearchInput(query: string) {
  const wrapper = mount(SearchInput, {
    props: { query },
    global: {
      components: {
        UButton: UButtonStub,
        UInput: UInputStub,
      },
    },
  })

  await nextTick()

  return wrapper
}

describe('search input component contract', () => {
  it('should emit update:query when the UInput model value changes', async () => {
    const wrapper = await mountSearchInput('')

    await wrapper.find('input').setValue('Sharp')

    expect(wrapper.emitted('update:query')).toEqual([['Sharp']])
  })

  it('should emit submit with the current query when the submit button is clicked', async () => {
    const wrapper = await mountSearchInput('Sharp')

    await wrapper.get('[aria-label="送出搜尋"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['Sharp']])
  })

  it('should emit clear and reset the query when the clear button is clicked', async () => {
    const wrapper = await mountSearchInput('Sharp')

    await wrapper.get('[aria-label="清除搜尋"]').trigger('click')

    expect(wrapper.emitted('update:query')).toEqual([['']])
    expect(wrapper.emitted('clear')).toEqual([[]])
  })

  it('should only show the clear button when the query has non-whitespace content', async () => {
    expect((await mountSearchInput('Sharp')).find('[aria-label="清除搜尋"]').exists()).toBe(true)
    expect((await mountSearchInput('')).find('[aria-label="清除搜尋"]').exists()).toBe(false)
    expect((await mountSearchInput('   ')).find('[aria-label="清除搜尋"]').exists()).toBe(false)
  })

  it('should forward mobile keyboard and autofill attributes to the underlying input', async () => {
    const input = (await mountSearchInput('')).find('input')

    expect(input.attributes('enterkeyhint')).toBe('search')
    expect(input.attributes('autocomplete')).toBe('off')
    expect(input.attributes('autocapitalize')).toBe('off')
    expect(input.attributes('autocorrect')).toBe('off')
    expect(input.attributes('spellcheck')).toBe('false')
  })

  it('should not emit submit when Enter is pressed during IME composition', async () => {
    const wrapper = await mountSearchInput('鍵')

    await wrapper.find('input').trigger('keydown.enter', { isComposing: true })

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('should guard the IME composition keyCode through a named constant instead of a bare 229', () => {
    const input_source = readSource('../app/components/search/search-input.vue')

    expect(input_source).toContain('IME_COMPOSITION_KEYCODE = 229')
    expect(input_source).toContain('event.keyCode === IME_COMPOSITION_KEYCODE')
    expect(input_source).not.toContain('event.keyCode === 229')
  })

  it('should defer input updates during composition and sync when composition ends', async () => {
    const wrapper = await mountSearchInput('')
    const input = wrapper.find('input')

    await input.trigger('compositionstart')
    await input.setValue('ㄐ')
    input.element.value = '鍵'
    await input.trigger('compositionend')

    expect(wrapper.emitted('update:query')).toEqual([['鍵']])
  })
})
