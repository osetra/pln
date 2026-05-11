<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import MainLayout from './layouts/MainLayout.vue'
import TaskList from './components/TaskList.vue'
import TaskForm from './components/TaskForm.vue'
import { useTasks } from './composables/useTasks.js'
import { useTheme } from './composables/useTheme.js'
import Task from '@pln/core/dto/task.js'

const $q = useQuasar()
const { initTheme } = useTheme()
initTheme($q)
const { tasks, createTask } = useTasks()

const isShowForm = ref(false)
const editingTask = ref(null)
const parentUid = ref(null)

async function openCreate(searchText) {
    if (searchText) {
        const task = new Task({ summary: searchText })
        await createTask(task)
        $q.notify({ message: `Task created: ${searchText}`, color: 'positive', icon: 'add', position: 'bottom-right' })
        await nextTick()
        const el = document.querySelector(`[data-uid="${task.uid}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
    }
    editingTask.value = null
    parentUid.value = null
    isShowForm.value = true
}

function openEdit(task) {
    editingTask.value = task
    parentUid.value = null
    isShowForm.value = true
}

/**
 * Открывает TaskForm для создания подзадачи
 * @param {Object} parent — родительская задача
 */
function openAddSubtask(parent) {
    editingTask.value = null
    parentUid.value = parent.uid
    isShowForm.value = true
}
</script>

<template>
    <MainLayout @add="openCreate" @edit="openEdit">
        <TaskList @edit="openEdit" @add-subtask="openAddSubtask" />
    </MainLayout>
    <TaskForm
        v-model="isShowForm"
        :task="editingTask"
        :parent-uid="parentUid"
        @saved="editingTask = null; parentUid = null"
        @deleted="editingTask = null"
    />
</template>

<style>
.text-muted { opacity: 0.55; }
body { overflow: hidden; }
</style>
