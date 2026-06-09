import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'

const project_root_url = new URL('../', import.meta.url)

async function lintVue(source: string, file_name = 'fixture.vue') {
  const eslint = new ESLint({
    cwd: project_root_url.pathname,
  })
  const [result] = await eslint.lintText(source, {
    filePath: new URL(`../tests/fixtures/${file_name}`, import.meta.url).pathname,
  })

  return result.messages
}

describe('nuxt-ui-v4-compat eslint plugin', () => {
  const deprecated_fixtures = [
    {
      rule_id: 'nuxt-ui-v4-compat/no-deprecated-options-prop',
      source: '<template><USelect :options="items" /></template>',
    },
    {
      rule_id: 'nuxt-ui-v4-compat/no-deprecated-option-attribute',
      source: '<template><USelect :items="items" option-attribute="name" /></template>',
    },
    {
      rule_id: 'nuxt-ui-v4-compat/no-deprecated-value-attribute',
      source: '<template><USelect :items="items" value-attribute="id" /></template>',
    },
    {
      rule_id: 'nuxt-ui-v4-compat/no-renamed-components',
      source: '<template><UFormGroup label="Name" /></template>',
    },
    {
      rule_id: 'nuxt-ui-v4-compat/no-nullify-modifier',
      source: '<template><UInput v-model.nullify="value" /></template>',
    },
    {
      rule_id: 'nuxt-ui-v4-compat/no-deprecated-color-prop',
      source: '<template><UButton color="gray" /></template>',
    },
    {
      rule_id: 'nuxt-ui-v4-compat/no-deprecated-wrapper-ui-slot',
      source: '<template><UDashboardSidebar :ui="{ wrapper: \'p-2\' }" /></template>',
    },
    {
      rule_id: 'nuxt-ui-v4-compat/no-deprecated-click-in-items',
      source: `
        <script setup lang="ts">
        const items = [{ label: 'Open', click: () => {} }]
        </script>
      `,
    },
  ]

  it.each(deprecated_fixtures)('reports $rule_id for deprecated fixture', async ({ rule_id, source }) => {
    const messages = await lintVue(source)

    expect(messages.some((message) => message.ruleId === rule_id)).toBe(true)
  }, 15000)

  it('does not report compat errors for Nuxt UI v4 fixtures', async () => {
    const messages = await lintVue(`
      <script setup lang="ts">
      const items = [{ label: 'Open', onClick: () => {} }]
      const value = ref('')
      </script>

      <template>
        <UFormField label="Name">
          <USelect
            v-model.nullable="value"
            :items="items"
            label-key="label"
            value-key="id"
            color="neutral"
          />
          <UDashboardSidebar :ui="{ root: 'p-2' }" />
        </UFormField>
      </template>
    `, 'valid-fixture.vue')

    expect(messages.filter((message) => message.ruleId?.startsWith('nuxt-ui-v4-compat/'))).toEqual([])
  })

  it('does not report deprecated click for non-items data objects', async () => {
    const messages = await lintVue(`
      <script setup lang="ts">
      const analytics_event = { label: 'hero cta', click: 1 }
      </script>
    `, 'valid-non-items-click-fixture.vue')

    expect(messages.some((message) => message.ruleId === 'nuxt-ui-v4-compat/no-deprecated-click-in-items'))
      .toBe(false)
  })

  it('has zero compat baseline findings in the real app tree', async () => {
    const eslint = new ESLint({
      cwd: project_root_url.pathname,
    })
    const results = await eslint.lintFiles(['app/**/*.{vue,ts}'])
    const compat_messages = results.flatMap((result) =>
      result.messages.filter((message) => message.ruleId?.startsWith('nuxt-ui-v4-compat/')),
    )

    expect(compat_messages).toEqual([])
  }, 15000)
})
