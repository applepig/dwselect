/**
 * ESLint Plugin: nuxt-ui-v4-compat
 *
 * 偵測 Nuxt UI v3 殘留 API，防止 AI 模型的舊訓練知識污染 codebase。
 *
 * 規則清單：
 * - no-deprecated-options-prop:  USelect/USelectMenu/UInputMenu 的 :options → :items
 * - no-deprecated-option-attribute: option-attribute → label-key
 * - no-deprecated-value-attribute: value-attribute → value-key
 * - no-renamed-components: UFormGroup → UFormField, ButtonGroup → FieldGroup
 * - no-nullify-modifier: v-model.nullify → v-model.nullable
 * - no-deprecated-color-prop: 偵測 U* 元件上已移除的舊版色彩值（white, gray, black, red, green, blue, yellow）
 * - no-deprecated-wrapper-ui-slot: UDashboardSidebar 的 :ui="{ wrapper }" → root
 * - no-deprecated-click-in-items: items 陣列中的 click → onClick
 *
 * @see docs/2026-refactor-nuxt/references/nuxt_ui_changes.md
 */

// ── Helper ──────────────────────────────────────────────

function toKebab(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 將 PascalCase 名稱陣列預計算為包含 PascalCase + kebab-case 的 Set。
 */
function buildNameSet(names) {
  const set = new Set()
  for (const name of names) {
    set.add(name)
    set.add(toKebab(name))
  }
  return set
}

/**
 * 將 { OldName: 'NewName' } 預計算為 Map，key 包含 PascalCase + kebab-case。
 */
function buildRenameMap(mapping) {
  const map = new Map()
  for (const [old_name, new_name] of Object.entries(mapping)) {
    map.set(old_name, new_name)
    map.set(toKebab(old_name), new_name)
  }
  return map
}

/**
 * 檢查 VElement 是否為指定的元件名稱（透過預計算 Set 的 O(1) 查詢）。
 */
function isComponent(node, name_set) {
  return name_set.has(node.rawName)
}

/**
 * 在 VStartTag 的 attributes 中找指定名稱的 v-bind directive（:xxx）。
 */
function findBindDirective(node, propName) {
  return node.startTag.attributes.find(
    (attr) =>
      attr.directive
      && attr.key.name.name === 'bind'
      && attr.key.argument
      && attr.key.argument.name === propName,
  )
}

/**
 * 在 VStartTag 的 attributes 中找指定名稱的普通 attribute（xxx="yyy"）。
 */
function findAttribute(node, attrName) {
  return node.startTag.attributes.find((attr) => !attr.directive && attr.key.name === attrName)
}

/**
 * 在 VStartTag 的 attributes 中找 v-model 的指定 modifier。
 */
function findVModelModifier(node, modifierName) {
  for (const attr of node.startTag.attributes) {
    if (
      attr.directive
      && attr.key.name.name === 'model'
      && attr.key.modifiers
      && attr.key.modifiers.some((m) => m.name === modifierName)
    ) {
      return attr
    }
  }
  return null
}

// ── 目標元件清單 ──────────────────────────────────────────

const SELECT_COMPONENTS = buildNameSet(['USelect', 'USelectMenu', 'UInputMenu'])
const RENAMED_COMPONENTS = buildRenameMap({
  UFormGroup: 'UFormField',
  ButtonGroup: 'FieldGroup',
})

// ── 廢棄色彩值對照表 ──────────────────────────────────────
const DEPRECATED_COLORS = {
  white: 'color="neutral" variant="outline"',
  gray: 'color="neutral" variant="subtle"',
  black: 'color="neutral"',
  red: 'color="error"',
  green: 'color="success"',
  blue: 'color="info"',
  yellow: 'color="warning"',
}

const DASHBOARD_SIDEBAR_NAMES = buildNameSet(['UDashboardSidebar'])

// ── Rules ──────────────────────────────────────────────

const rules = {
  /**
   * :options → :items
   * v4 的 USelect、USelectMenu、UInputMenu 全部使用 :items。
   */
  'no-deprecated-options-prop': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: USelect/USelectMenu/UInputMenu use :items, not :options',
      },
      fixable: 'code',
      messages: {
        deprecated:
          '❌ Nuxt UI v4: <{{ component }}> 使用 :items 而非 :options。\n'
          + '   修正：將 :options 改為 :items。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}
      return services.defineTemplateBodyVisitor({
        VElement(node) {
          if (!isComponent(node, SELECT_COMPONENTS)) return
          const attr = findBindDirective(node, 'options')
          if (attr) {
            context.report({
              node: attr,
              messageId: 'deprecated',
              data: { component: node.rawName },
              fix(fixer) {
                // :options → :items
                const key_range = attr.key.argument.range
                return fixer.replaceTextRange(key_range, 'items')
              },
            })
          }
        },
      })
    },
  },

  /**
   * option-attribute → label-key
   */
  'no-deprecated-option-attribute': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: option-attribute is removed, use label-key instead',
      },
      fixable: 'code',
      messages: {
        deprecated:
          '❌ Nuxt UI v4: option-attribute 已移除。\n'
          + '   修正：改用 label-key（預設為 "label"，若值為 "label" 可直接刪除）。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}
      return services.defineTemplateBodyVisitor({
        VElement(node) {
          if (!isComponent(node, SELECT_COMPONENTS)) return
          const attr = findAttribute(node, 'option-attribute')
          if (attr) {
            context.report({
              node: attr,
              messageId: 'deprecated',
              fix(fixer) {
                // 如果值是 "label"（預設值），直接刪除整個 attribute
                const value = attr.value?.value
                if (value === 'label') {
                  // 刪除 attribute 及前面的空白
                  const source = context.getSourceCode().getText()
                  let start = attr.range[0]
                  // 往前吃掉空白
                  while (start > 0 && (source[start - 1] === ' ' || source[start - 1] === '\n')) {
                    start--
                  }
                  // 但至少保留一個空白（避免 tag 粘在一起）
                  start++
                  return fixer.removeRange([start, attr.range[1]])
                }
                // 否則替換 attribute name
                return fixer.replaceTextRange(attr.key.range, 'label-key')
              },
            })
          }
        },
      })
    },
  },

  /**
   * value-attribute → value-key
   */
  'no-deprecated-value-attribute': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: value-attribute is renamed to value-key',
      },
      fixable: 'code',
      messages: {
        deprecated:
          '❌ Nuxt UI v4: value-attribute 已改名為 value-key。\n'
          + '   修正：將 value-attribute 改為 value-key。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}
      return services.defineTemplateBodyVisitor({
        VElement(node) {
          if (!isComponent(node, SELECT_COMPONENTS)) return
          const attr = findAttribute(node, 'value-attribute')
          if (attr) {
            context.report({
              node: attr,
              messageId: 'deprecated',
              fix(fixer) {
                return fixer.replaceTextRange(attr.key.range, 'value-key')
              },
            })
          }
        },
      })
    },
  },

  /**
   * UFormGroup → UFormField, ButtonGroup → FieldGroup
   */
  'no-renamed-components': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: some components have been renamed',
      },
      fixable: 'code',
      messages: {
        renamed: '❌ Nuxt UI v4: <{{ old }}> 已改名為 <{{ new }}>。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}
      return services.defineTemplateBodyVisitor({
        VElement(node) {
          const raw = node.rawName
          const replacement = RENAMED_COMPONENTS.get(raw)
          if (!replacement) return
          context.report({
            node: node.startTag,
            messageId: 'renamed',
            data: { old: raw, new: replacement },
            // 不自動修復 component rename（影響範圍大，需要手動確認 import）
          })
        },
      })
    },
  },

  /**
   * v-model.nullify → v-model.nullable
   */
  'no-nullify-modifier': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: v-model.nullify is renamed to v-model.nullable',
      },
      messages: {
        deprecated: '❌ Nuxt UI v4: v-model.nullify 已改名為 v-model.nullable。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}
      return services.defineTemplateBodyVisitor({
        VElement(node) {
          const attr = findVModelModifier(node, 'nullify')
          if (attr) {
            context.report({
              node: attr,
              messageId: 'deprecated',
            })
          }
        },
      })
    },
  },

  /**
   * 偵測 U* 元件上使用已移除的舊版色彩值。
   * 支援靜態 color="white" 和動態 :color="'white'" 兩種寫法。
   * 只報告，不 autofix（因為有些需要同時加 variant）。
   */
  'no-deprecated-color-prop': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: detect deprecated color values on U* components',
      },
      messages: {
        deprecated:
          '❌ Nuxt UI v4: color="{{ old }}" 已移除。\n' + '   修正：改用 {{ suggestion }}。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}
      return services.defineTemplateBodyVisitor({
        VElement(node) {
          const raw = node.rawName
          // 只偵測 U 開頭的元件（PascalCase 或 kebab-case）
          if (!raw.startsWith('U') && !raw.startsWith('u-')) return

          // 1. 靜態 attribute: color="white"
          const static_attr = findAttribute(node, 'color')
          if (static_attr && static_attr.value) {
            const color_value = static_attr.value.value
            if (DEPRECATED_COLORS[color_value]) {
              context.report({
                node: static_attr,
                messageId: 'deprecated',
                data: {
                  old: color_value,
                  suggestion: DEPRECATED_COLORS[color_value],
                },
              })
              return
            }
          }

          // 2. 動態 bind: :color="'white'"
          const bind_attr = findBindDirective(node, 'color')
          if (bind_attr && bind_attr.value?.expression) {
            const expr = bind_attr.value.expression
            // 只處理字串字面值 :color="'white'"
            if (expr.type === 'Literal' && typeof expr.value === 'string') {
              const color_value = expr.value
              if (DEPRECATED_COLORS[color_value]) {
                context.report({
                  node: bind_attr,
                  messageId: 'deprecated',
                  data: {
                    old: color_value,
                    suggestion: DEPRECATED_COLORS[color_value],
                  },
                })
              }
            }
          }
        },
      })
    },
  },

  /**
   * 偵測 UDashboardSidebar 的 :ui="{ wrapper: '...' }" 用法。
   * v4 中 wrapper theme slot 已改名為 root。
   * 提供 autofix：把 property key wrapper 替換為 root。
   */
  'no-deprecated-wrapper-ui-slot': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: UDashboardSidebar :ui wrapper slot is renamed to root',
      },
      fixable: 'code',
      messages: {
        deprecated:
          '❌ Nuxt UI v4: <UDashboardSidebar> 的 :ui slot 不支援 "wrapper"。\n'
          + '   修正：改用 "root"。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}
      return services.defineTemplateBodyVisitor({
        VElement(node) {
          if (!isComponent(node, DASHBOARD_SIDEBAR_NAMES)) return

          const ui_attr = findBindDirective(node, 'ui')
          if (!ui_attr || !ui_attr.value?.expression) return

          const expr = ui_attr.value.expression
          if (expr.type !== 'ObjectExpression') return

          for (const prop of expr.properties) {
            if (prop.type !== 'Property') continue
            const key_name
              = prop.key.type === 'Identifier'
                ? prop.key.name
                : prop.key.type === 'Literal'
                  ? prop.key.value
                  : null
            if (key_name === 'wrapper') {
              context.report({
                node: prop,
                messageId: 'deprecated',
                fix(fixer) {
                  return fixer.replaceTextRange(prop.key.range, 'root')
                },
              })
            }
          }
        },
      })
    },
  },

  /**
   * 偵測 items 陣列中使用 click 而非 onClick 的情況。
   * v4 中 item 物件的 click callback 已改名為 onClick。
   * 簡化方案：只掃描明確 items/actions context 內的物件字面值，
   * 若物件同時有 label（或 icon）和 click property，就報告。
   * 同時檢查 <script setup> 和 <template> 中的內嵌物件。
   * 提供 autofix：把 property key click 替換為 onClick。
   */
  'no-deprecated-click-in-items': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Nuxt UI v4: click in items is renamed to onClick',
      },
      fixable: 'code',
      messages: {
        deprecated:
          '❌ Nuxt UI v4: items 中的 "click" 已改名為 "onClick"。\n'
          + '   修正：將 click 改為 onClick。',
      },
      schema: [],
    },
    create(context) {
      const services = context.sourceCode.parserServices
      if (!services?.defineTemplateBodyVisitor) return {}

      const item_context_names = new Set(['items', 'actions'])

      function getPropertyKeyName(prop) {
        if (prop.key.type === 'Identifier') return prop.key.name
        if (prop.key.type === 'Literal') return prop.key.value
        return null
      }

      function isNamedItemsOrActionsContext(node) {
        if (!node) return false

        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
          return item_context_names.has(node.id.name)
        }

        if (node.type === 'Property') {
          return item_context_names.has(getPropertyKeyName(node))
        }

        if (node.type === 'AssignmentExpression') {
          if (node.left.type === 'Identifier') return item_context_names.has(node.left.name)
          if (node.left.type !== 'MemberExpression') return false
          if (node.left.property.type === 'Identifier') return item_context_names.has(node.left.property.name)
          if (node.left.property.type === 'Literal') return item_context_names.has(node.left.property.value)
        }

        return false
      }

      function isBoundItemsOrActionsAttribute(node) {
        return node?.type === 'VAttribute'
          && node.directive
          && node.key.name.name === 'bind'
          && node.key.argument
          && item_context_names.has(node.key.argument.name)
      }

      function isInItemsOrActionsContext(node) {
        let current = node.parent
        while (current) {
          if (current.type === 'ArrayExpression' && isNamedItemsOrActionsContext(current.parent)) {
            return true
          }

          if (isBoundItemsOrActionsAttribute(current)) return true
          current = current.parent
        }

        return false
      }

      /**
       * 檢查 ObjectExpression 是否為 items/actions 物件（有 label/icon + click）。
       * 共用於 template visitor 和 script visitor。
       */
      function checkObjectExpression(node) {
        if (!isInItemsOrActionsContext(node)) return

        const prop_names = new Set()
        let click_prop = null

        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue
          const key_name = getPropertyKeyName(prop)
          if (key_name) prop_names.add(key_name)
          if (key_name === 'click') click_prop = prop
        }

        if (!click_prop) return
        // 只有當物件同時有 label 或 icon 時才報告（判斷為 item 物件）
        if (!prop_names.has('label') && !prop_names.has('icon')) return

        context.report({
          node: click_prop,
          messageId: 'deprecated',
          fix(fixer) {
            return fixer.replaceTextRange(click_prop.key.range, 'onClick')
          },
        })
      }

      // template visitor：偵測 :actions="[{ click: ... }]" 等內嵌寫法
      const template_visitor = {
        'VAttribute ObjectExpression'(node) {
          checkObjectExpression(node)
        },
      }

      // script visitor：掃描 <script setup> 中的物件字面值
      const script_visitor = {
        ObjectExpression(node) {
          checkObjectExpression(node)
        },
      }

      return services.defineTemplateBodyVisitor(template_visitor, script_visitor)
    },
  },
}

// ── Plugin Export ──────────────────────────────────────────

export default {
  meta: {
    name: 'eslint-plugin-nuxt-ui-v4-compat',
    version: '1.0.0',
  },
  rules,
}
