<script setup>
/**
 * Сохранение/загрузка пользовательских фильтров в localStorage.
 */
import { ref } from 'vue'
import { useUiState } from '../composables/useUiState.js'

const STORAGE_KEY = 'pln-saved-filters'

const { uiState, loadFilter } = useUiState()
const savedFilters = ref(load())
const newName = ref('')
const showInput = ref(false)
const dragIndex = ref(null)
const dropIndex = ref(null)

/** Читает массив сохранённых фильтров из localStorage */
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch { return [] }
}

/** Синхронизирует массив в localStorage */
function sync() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedFilters.value))
}

/** Сохраняет текущий mainFilter под именем из newName */
function saveCurrentFilter() {
  const name = newName.value.trim()
  if (!name) return
  const filter = uiState.value.mainFilter
  const serialized = filter
    ? { conditions: filter.conditions, childrensLevel: filter.childrensLevel, parentsLevel: filter.parentsLevel }
    : { conditions: [], childrensLevel: 0, parentsLevel: 0 }
  savedFilters.value.push({ name, filter: serialized })
  try { sync() } catch { console.warn('localStorage full, filter not saved') }
  newName.value = ''
  showInput.value = false
}

/**
 * Применяет сохранённый фильтр к UI.
 * @param {{ name: string, filter: object }} saved
 */
function applySavedFilter(saved) {
  loadFilter(saved.filter)
}

/**
 * Удаляет фильтр по индексу.
 * @param {number} index
 */
function removeFilter(index) {
  savedFilters.value.splice(index, 1)
  sync()
}

/** @param {number} i */
function onDragStart(i) { dragIndex.value = i }
function onDragEnd() { dragIndex.value = null; dropIndex.value = null }

/**
 * Переупорядочивает фильтры при drop
 * @param {number} targetIndex
 */
function onDrop(targetIndex) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const [moved] = savedFilters.value.splice(dragIndex.value, 1)
  savedFilters.value.splice(targetIndex, 0, moved)
  sync()
  dragIndex.value = null
  dropIndex.value = null
}
</script>
<template>
  <q-expansion-item label="Filters" header-class="text-muted" dense default-opened>
    <div class="q-px-md q-pb-sm">
      <q-list dense>
        <q-item
          v-for="(sf, i) in savedFilters" :key="i"
          clickable dense
          draggable="true"
          @click="applySavedFilter(sf)"
          @dragstart="onDragStart(i)"
          @dragend="onDragEnd"
          @dragover.prevent="dropIndex = i"
          @drop.prevent="onDrop(i)"
          :class="{ 'drop-target': dropIndex === i && dragIndex !== i }"
        >
          <q-item-section>{{ sf.name }}</q-item-section>
          <q-item-section side>
            <q-btn flat round dense size="xs" icon="close" @click.stop="removeFilter(i)" />
          </q-item-section>
        </q-item>
      </q-list>
      <div v-show="showInput" class="flex items-center q-gutter-xs q-mt-xs">
        <q-input v-model="newName" dense outlined placeholder="Filter name" class="col" @keyup.enter="saveCurrentFilter()" />
        <q-btn flat dense icon="check" size="sm" @click="saveCurrentFilter()" />
        <q-btn flat dense icon="close" size="sm" @click="showInput = false; newName = ''" />
      </div>
      <div v-show="!showInput" class="row q-mt-xs q-gutter-x-xs">
        <q-btn flat dense no-caps icon="save" label="Save" class="col" @click="showInput = true" />
        <q-btn flat dense no-caps icon="filter_alt_off" label="Reset" class="col" @click="loadFilter({ conditions: [], childrensLevel: 0, parentsLevel: 0 })" />
      </div>
    </div>
  </q-expansion-item>
</template>

<style scoped>
.drop-target {
  border-top: 2px solid var(--q-primary);
}
</style>
