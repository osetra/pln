/**
 * Реактивное состояние UI — фильтры, поиск, настройки отображения.
 * Синглтон: один ref на всё приложение, импортируется напрямую без provide/inject.
 */
import { ref, watch } from 'vue'
import { Filter, Condition } from '@pln/core/dto/filter.js'

const selectedCategories = ref([])
const selectedStatuses = ref([])
const excludedCategories = ref([])
const excludedStatuses = ref([])
const childrenLevel = ref(0)
const parentsLevel = ref(0)

const uiState = ref({
  searchQuery: '',
  searchType: 'filter',
  findNextTrigger: 0,
  topViewMode: 'day',
  bottomViewMode: false,
  mainFilter: null,
})

/**
 * Пересобирает mainFilter из текущих selectedCategories, selectedStatuses и searchQuery
 */
function rebuildFilter() {
  const f = new Filter()
  for (const cat of selectedCategories.value) {
    f.addCondition(new Condition({ field: 'categories', value: cat, combineType: 'add' }))
  }
  for (const s of selectedStatuses.value) {
    f.addCondition(new Condition({ field: 'status', value: s, combineType: 'add' }))
  }
  for (const cat of excludedCategories.value) {
    f.addCondition(new Condition({ field: 'categories', value: cat, combineType: 'del' }))
  }
  for (const s of excludedStatuses.value) {
    f.addCondition(new Condition({ field: 'status', value: s, combineType: 'del' }))
  }
  const q = uiState.value.searchQuery?.trim()
  if (q && uiState.value.searchType === 'filter') {
    f.addCondition(new Condition({ field: 'summary', value: q, combineType: 'add' }))
  }
  f.childrensLevel = childrenLevel.value
  f.parentsLevel = parentsLevel.value
  const hasLevels = f.childrensLevel !== 0 || f.parentsLevel !== 0
  uiState.value.mainFilter = f.conditions.length || hasLevels ? f : null
}

/**
 * Переключает категорию в фильтре (добавляет/убирает)
 * @param {string} cat
 */
function toggleCategory(cat) {
  const exIdx = excludedCategories.value.indexOf(cat)
  if (exIdx >= 0) excludedCategories.value.splice(exIdx, 1)
  const idx = selectedCategories.value.indexOf(cat)
  if (idx >= 0) selectedCategories.value.splice(idx, 1)
  else selectedCategories.value.push(cat)
  rebuildFilter()
}

/**
 * Переключает статус в фильтре (добавляет/убирает)
 * @param {string} status
 */
function toggleStatusFilter(status) {
  const exIdx = excludedStatuses.value.indexOf(status)
  if (exIdx >= 0) excludedStatuses.value.splice(exIdx, 1)
  const idx = selectedStatuses.value.indexOf(status)
  if (idx >= 0) selectedStatuses.value.splice(idx, 1)
  else selectedStatuses.value.push(status)
  rebuildFilter()
}

/**
 * Переключает исключение категории из фильтра (long-press)
 * @param {string} cat
 */
function toggleCategoryExclude(cat) {
  const selIdx = selectedCategories.value.indexOf(cat)
  if (selIdx >= 0) selectedCategories.value.splice(selIdx, 1)
  const idx = excludedCategories.value.indexOf(cat)
  if (idx >= 0) excludedCategories.value.splice(idx, 1)
  else excludedCategories.value.push(cat)
  rebuildFilter()
}

/**
 * Переключает исключение статуса из фильтра (long-press)
 * @param {string} status
 */
function toggleStatusExclude(status) {
  const selIdx = selectedStatuses.value.indexOf(status)
  if (selIdx >= 0) selectedStatuses.value.splice(selIdx, 1)
  const idx = excludedStatuses.value.indexOf(status)
  if (idx >= 0) excludedStatuses.value.splice(idx, 1)
  else excludedStatuses.value.push(status)
  rebuildFilter()
}

watch(() => uiState.value.searchQuery, () => rebuildFilter())
watch(() => uiState.value.searchType, () => rebuildFilter())
watch(childrenLevel, () => rebuildFilter())
watch(parentsLevel, () => rebuildFilter())

/**
 * Восстанавливает UI-стейт из сохранённого объекта Filter и пересобирает mainFilter.
 * @param {object} filter — сериализованный Filter (conditions, childrensLevel, parentsLevel)
 */
function loadFilter(filter) {
  selectedCategories.value = filter.conditions
    .filter(c => c.field === 'categories' && c.combineType !== 'del')
    .map(c => c.value)
  excludedCategories.value = filter.conditions
    .filter(c => c.field === 'categories' && c.combineType === 'del')
    .map(c => c.value)
  selectedStatuses.value = filter.conditions
    .filter(c => c.field === 'status' && c.combineType !== 'del')
    .map(c => c.value)
  excludedStatuses.value = filter.conditions
    .filter(c => c.field === 'status' && c.combineType === 'del')
    .map(c => c.value)
  const summaryCondition = filter.conditions.find(c => c.field === 'summary')
  uiState.value.searchQuery = summaryCondition ? summaryCondition.value : ''
  childrenLevel.value = filter.childrensLevel ?? 0
  parentsLevel.value = filter.parentsLevel ?? 0
  rebuildFilter()
}

export function useUiState() {
  return {
    uiState, selectedCategories, selectedStatuses,
    excludedCategories, excludedStatuses,
    childrenLevel, parentsLevel,
    toggleCategory, toggleStatusFilter,
    toggleCategoryExclude, toggleStatusExclude,
    loadFilter,
  }
}
