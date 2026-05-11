<script setup>
import { computed, ref, watch } from 'vue'
import { Timeline } from 'vue-timeline-chart'
import 'vue-timeline-chart/style.css'
import { useTasks } from '../composables/useTasks.js'
import { tasksToTimeline } from '../adapters/timelineAdapter.js'

const { filteredTasks, updateTask } = useTasks()

const now = new Date()
const dayStart = ref(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
const dayEnd = ref(dayStart.value + 86400000)

const groups = computed(() => tasksToTimeline(filteredTasks.value, dayStart.value, dayEnd.value).groups)
const items = ref([])

watch(() => tasksToTimeline(filteredTasks.value, dayStart.value, dayEnd.value).items, (v) => {
  items.value = v
}, { immediate: true })

const markers = computed(() => [{ type: 'marker', start: Date.now() }])

// drag-resize
let previousDragTimePos = 0
let currentDragAction
let currentDragItemId = null

/**
 * Обрабатывает перетаскивание краёв range-элементов
 * @param {{ time: number, event: PointerEvent, item: Object }} params
 */
function handleItemDrag({ time, event, item }) {
  if (event.type === 'pointerdown') {
    if (!event.target.dataset.action) return
    currentDragAction = event.target.dataset.action
    currentDragItemId = item.id
    previousDragTimePos = time
  } else if (event.type === 'pointermove') {
    if (!currentDragAction) return

    const found = items.value.find(i => i.id === currentDragItemId)
    if (!found) return
    const delta = time - previousDragTimePos

    if (currentDragAction === 'resize-start' || currentDragAction === 'resize-both') {
      found.start += delta
    }
    if (currentDragAction === 'resize-end' || currentDragAction === 'resize-both') {
      found.end += delta
    }

    previousDragTimePos = time
  }
}

window.addEventListener('pointerup', async () => {
  if (!currentDragAction || !currentDragItemId) {
    currentDragAction = undefined
    return
  }

  const found = items.value.find(i => i.id === currentDragItemId)
  const task = filteredTasks.value.find(t => t.uid === currentDragItemId)

  if (found && task) {
    await updateTask(task, {
      uid: task.uid,
      start: new Date(found.start),
      due: new Date(found.end),
    })
  }

  currentDragAction = undefined
  currentDragItemId = null
}, { capture: true })
</script>

<template>
  <Timeline
    :groups="groups"
    :items="items"
    :markers="markers"
    :initialViewportStart="dayStart"
    :initialViewportEnd="dayEnd"
    @pointerdown="handleItemDrag"
    @pointermove="handleItemDrag"
  >
    <template #item="{ item }">
      <div class="draggable" data-action="resize-both">
        <div class="draggable-handle" data-action="resize-start"></div>
        <span class="draggable-label">{{ item.title }}</span>
        <div class="draggable-handle" data-action="resize-end"></div>
      </div>
    </template>
  </Timeline>
</template>

<style scoped>
.draggable {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  cursor: move;
}
.draggable-handle {
  position: relative;
  width: 1.2rem;
  height: 100%;
  cursor: ew-resize;
  opacity: .6;
}
.draggable-handle::before {
  content: '';
  border-inline: 1px solid white;
  width: 4px;
  height: 40%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  position: absolute;
}
.draggable-handle:hover {
  opacity: 1;
}
.draggable-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  align-self: center;
  pointer-events: none;
}
</style>
