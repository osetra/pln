/**
 * Реактивный конфиг приложения с авто-сохранением в `config.json`.
 *
 * Экспортирует:
 *   - `configRef` — `Ref<Config>` — мутации `.value` или вложенных полей
 *     триггерят запись на диск. UI делает `configRef.value.tagPrefix = '#'`
 *     и оно сразу сохраняется + видно всем, кто читает реактивно.
 *
 * Изначальное значение — merge дефолтов и `config.json` (тот же мерж, что
 * в `../config.js`). На диск сохраняется полный merged-state, чтобы файл
 * был самодокументируемым.
 *
 * Watch построен на `effect` из `@vue/reactivity` (отдельного `watch`
 * в этом пакете нет — это во `@vue/runtime-core`). Первый прогон
 * пропускается, чтобы при загрузке не переписывать файл дефолтами.
 */

import { ref, effect } from '@vue/reactivity'

import { fs } from '../utils/platform.js'
import { config as legacyConfig } from '../config.js'

/** @typedef {typeof legacyConfig} Config */

/** @type {import('@vue/reactivity').Ref<Config>} */
export const configRef = ref(structuredClone(legacyConfig))

effect(() => {
  const snapshot = serialize(configRef.value)
  const path = configRef.value.configPath
  try {
    const onDisk = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''
    if (onDisk !== snapshot) fs.writeFileSync(path, snapshot)
  } catch (e) {
    console.error('❌ Ошибка сохранения config.json:', e?.message || e)
  }
})

/**
 * Сериализует конфиг для записи: исключает runtime-поля (configPath),
 * добавляет $schema-ссылку и trailing \n.
 * @param {Config} cfg
 * @returns {string}
 */
function serialize(cfg) {
  const { configPath: _drop, ...rest } = cfg
  const ordered = { $schema: './config.schema.json', ...rest }
  return JSON.stringify(ordered, null, 2) + '\n'
}
