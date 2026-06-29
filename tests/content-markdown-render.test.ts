// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ContentMarkdown from '../app/components/content-markdown.vue'

const sample_markdown = `## 快速判斷

第一段內文 [官方頁面](https://example.com/info) 結尾。

- 第一項
- 第二項 [參考連結](https://example.com/ref)`

describe('ContentMarkdown', () => {
  it('should render a markdown heading as its text', () => {
    const wrapper = mount(ContentMarkdown, { props: { source: sample_markdown } })
    const heading = wrapper.find('.detail-llm-heading')

    expect(heading.exists()).toBe(true)
    expect(heading.text()).toContain('快速判斷')
  })

  it('should render markdown list items', () => {
    const wrapper = mount(ContentMarkdown, { props: { source: sample_markdown } })
    const items = wrapper.findAll('.detail-llm-list li')

    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('第一項')
    expect(items[1]!.text()).toContain('第二項')
  })

  it('should render markdown links as anchors with the original href', () => {
    const wrapper = mount(ContentMarkdown, { props: { source: sample_markdown } })
    const links = wrapper.findAll('.detail-llm-link')
    const hrefs = links.map((link) => link.attributes('href'))

    expect(hrefs).toContain('https://example.com/info')
    expect(hrefs).toContain('https://example.com/ref')
  })

  it('should open markdown links in a new tab with safe rel', () => {
    const wrapper = mount(ContentMarkdown, { props: { source: sample_markdown } })
    const link = wrapper.find('.detail-llm-link')

    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('should render a plain paragraph for non-heading non-list text', () => {
    const wrapper = mount(ContentMarkdown, { props: { source: '只有一段純文字。' } })
    const paragraph = wrapper.find('.detail-llm-paragraph')

    expect(paragraph.exists()).toBe(true)
    expect(paragraph.text()).toBe('只有一段純文字。')
  })

  it('should render nothing when the source is empty', () => {
    const wrapper = mount(ContentMarkdown, { props: { source: '' } })

    expect(wrapper.find('.detail-llm-heading').exists()).toBe(false)
    expect(wrapper.find('.detail-llm-list').exists()).toBe(false)
    expect(wrapper.find('.detail-llm-paragraph').exists()).toBe(false)
  })
})
