<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useTasks } from '../composables/useTasks.js'
import { useTheme } from '../composables/useTheme.js'
import { useUiState } from '../composables/useUiState.js'
import SavedFilters from '../components/SavedFilters.vue'
import DayView from '../components/DayView.vue'
import WeekView from '../components/WeekView.vue'
import MonthView from '../components/MonthView.vue'
import KanbanView from '../components/KanbanView.vue'

const $q = useQuasar()
const { isDark, accentColor, toggleDark, setAccent } = useTheme()
const { uiState, selectedCategories, selectedStatuses, excludedCategories, excludedStatuses, childrenLevel, parentsLevel, toggleCategory, toggleStatusFilter, toggleCategoryExclude, toggleStatusExclude } = useUiState()

const showColorPicker = ref(false)
const pickedColor = ref(accentColor.value)
const { tasks } = useTasks()

const leftDrawerOpen = ref(true)
const splitterModel = ref(20)
//const splitterModel = ref(50)

const allCategories = computed(() => {
  const cats = new Set()
  for (const t of tasks.value) {
    if (t.categories) t.categories.forEach(c => cats.add(c))
  }
  return [...cats].sort()
})

const defaultStatuses = ['NEEDS-ACTION', 'IN-PROCESS', 'COMPLETED', 'CANCELLED']

const allStatuses = computed(() => {
  const statuses = new Set(defaultStatuses)
  for (const t of tasks.value) {
    if (t.status) statuses.add(t.status)
  }
  return [...statuses]
})

function statusIcon(status) {
  switch (status) {
    case 'COMPLETED': return 'check_circle'
    case 'IN-PROCESS': return 'pending'
    case 'CANCELLED': return 'cancel'
    default: return 'radio_button_unchecked'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'NEEDS-ACTION': return 'To Do'
    case 'IN-PROCESS': return 'In Progress'
    case 'COMPLETED': return 'Done'
    case 'CANCELLED': return 'Cancelled'
    default: return status
  }
}

const emit = defineEmits(['add', 'edit'])

function onAdd() {
  const text = uiState.value.searchQuery.trim()
  uiState.value.searchQuery = ''
  emit('add', text)
}

/** @description По Enter в find-режиме переходит к следующему совпадению */
function onSearchEnter() {
  if (uiState.value.searchType === 'find') {
    uiState.value.findNextTrigger++
  }
}

</script>
<template>
  <q-layout view="hHh Lpr lff">
    <q-drawer v-model="leftDrawerOpen" side="left" :width="220" :breakpoint="500">
      <div class="q-pa-md flex items-center q-gutter-sm">
        <div class="bg-primary text-white" style="width:26px;height:26px;border-radius:7px;display:grid;place-items:center;font-size:14px;">P</div>
        <span class="text-h6">PLN</span>
      </div>
      <q-scroll-area style="height:calc(100vh - 150px);">
        <SavedFilters />
        <q-expansion-item label="Categories" header-class="text-muted" dense>
          <div class="q-px-md q-pb-sm flex q-gutter-xs" style="flex-wrap:wrap;">
            <q-chip v-for="cat in allCategories" :key="cat"
              clickable dense v-touch-hold.mouse="() => toggleCategoryExclude(cat)"
              :color="selectedCategories.includes(cat) ? 'primary' : undefined"
              :text-color="selectedCategories.includes(cat) ? 'white' : undefined"
              :class="{ 'chip-excluded': excludedCategories.includes(cat) }"
              @click="toggleCategory(cat)"
            >
              <span :class="{ 'text-strike': excludedCategories.includes(cat) }">{{ cat }}</span>
            </q-chip>
          </div>
        </q-expansion-item>

        <q-expansion-item label="Statuses" header-class="text-muted" default-opened dense>
          <div class="q-px-md q-pb-sm flex q-gutter-xs" style="flex-wrap:wrap;">
            <q-chip v-for="s in allStatuses" :key="s" clickable dense
              v-touch-hold.mouse="() => toggleStatusExclude(s)"
              :color="selectedStatuses.includes(s) ? 'primary' : undefined"
              :text-color="selectedStatuses.includes(s) ? 'white' : undefined"
              :class="{ 'chip-excluded': excludedStatuses.includes(s) }"
              @click="toggleStatusFilter(s)"
            >
              <q-icon :name="statusIcon(s)" size="16px" class="q-mr-xs" />
              <span :class="{ 'text-strike': excludedStatuses.includes(s) }">{{ statusLabel(s) }}</span>
            </q-chip>
          </div>
        </q-expansion-item>

        <q-expansion-item label="Level" header-class="text-muted" dense>
          <div class="q-px-md q-pb-sm">
            <q-toggle v-model="childrenLevel" :true-value="-1" :false-value="0" label="Children" dense />
            <q-toggle v-model="parentsLevel" :true-value="-1" :false-value="0" label="Parents" dense />
          </div>
        </q-expansion-item>
      </q-scroll-area>
      <div class="absolute-bottom q-pa-sm">
        <q-btn flat align="left" :icon="isDark ? 'light_mode' : 'dark_mode'" :label="isDark ? 'Light' : 'Dark'" class="full-width" @click="toggleDark($q)" />
        <q-btn flat align="left" icon="palette" label="Accent color" class="full-width" @click="showColorPicker = true" />
      </div>

      <q-dialog v-model="showColorPicker">
        <q-color v-model="pickedColor" default-view="palette" no-header @update:model-value="setAccent($event)" />
      </q-dialog>
    </q-drawer>

    <q-page-container>
      <q-page class="column">
        <q-splitter v-if="uiState.topViewMode" v-model="splitterModel" horizontal style="flex:1 1 0; min-height:0">
          <template #before>
            <q-scroll-area class="fit">
              <div>
                <DayView v-if="uiState.topViewMode === 'day'" />
                <WeekView v-else-if="uiState.topViewMode === 'week'" />
                <MonthView v-else-if="uiState.topViewMode === 'month'" />
              </div>
            </q-scroll-area>
          </template>
          <template #after>
            <q-scroll-area class="fit">
              <div class="q-pa-md">
                <KanbanView v-if="uiState.bottomViewMode === 'kanban'" @edit="emit('edit', $event)" />
                <slot v-else />
              </div>
            </q-scroll-area>
          </template>
        </q-splitter>
        <q-scroll-area v-else style="flex:1 1 0; min-height:0">
          <div class="q-pa-md">
            <KanbanView v-if="uiState.bottomViewMode === 'kanban'" @edit="emit('edit', $event)" />
            <slot v-else />
          </div>
        </q-scroll-area>
      </q-page>
    </q-page-container>

    <q-footer elevated>
      <q-toolbar>
        <q-btn flat round dense :icon="leftDrawerOpen ? 'menu_open' : 'menu'" @click="leftDrawerOpen = !leftDrawerOpen" />
        
        <q-btn-dropdown flat dense no-caps icon="visibility">
          <q-list dense style="min-width: 160px" class="q-pb-sm">
            <q-item-label header>Timeline</q-item-label>
            <q-item clickable v-close-popup @click="uiState.topViewMode = 'day'">
              <q-item-section avatar><q-icon name="today" /></q-item-section>
              <q-item-section>Day</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="uiState.topViewMode = 'week'">
              <q-item-section avatar><q-icon name="view_week" /></q-item-section>
              <q-item-section>Week</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="uiState.topViewMode = 'month'">
              <q-item-section avatar><q-icon name="calendar_month" /></q-item-section>
              <q-item-section>Month</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="uiState.topViewMode = false">
              <q-item-section avatar><q-icon name="visibility_off" /></q-item-section>
              <q-item-section>None</q-item-section>
            </q-item>
            <q-separator />
            <q-item-label header>Bot</q-item-label>
            <q-item clickable v-close-popup @click="uiState.bottomViewMode = 'list'">
              <q-item-section avatar><q-icon name="list" /></q-item-section>
              <q-item-section>List</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="uiState.bottomViewMode = 'kanban'">
              <q-item-section avatar><q-icon name="view_kanban" /></q-item-section>
              <q-item-section>Kanban</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-input v-model="uiState.searchQuery" :placeholder="uiState.searchType === 'filter' ? 'Filter tasks...' : 'Find task...'" dense outlined class="q-mx-sm col" :style="{ background: $q.dark.isActive ? '#121212' : '#fff', borderRadius: '4px' }" @keyup.enter="onSearchEnter" />
        <q-btn-dropdown flat dense no-caps :icon="uiState.searchType === 'filter' ? 'filter_list' : 'search'" class="q-ml-xs">
          <q-list dense>
            <q-item clickable v-close-popup @click="uiState.searchType = 'filter'">
              <q-item-section avatar><q-icon name="filter_list" /></q-item-section>
              <q-item-section>Filter</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="uiState.searchType = 'find'">
              <q-item-section avatar><q-icon name="search" /></q-item-section>
              <q-item-section>Find</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-btn icon="add" label="Add" color="primary" no-caps @click="onAdd" />
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<style scoped>
.chip-excluded {
  opacity: 0.55;
}
</style>
