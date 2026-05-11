<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useTasks } from '../composables/useTasks.js'
import Task from '@pln/core/dto/task.js'

const props = defineProps({
    modelValue: Boolean,
    task: { type: Object, default: null },
    parentUid: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved', 'deleted'])

const $q = useQuasar()
const { tasks, createTask, updateTask, deleteTask } = useTasks()

const isEdit = computed(() => !!props.task)
const isMobile = computed(() => $q.screen.lt.sm)
const detailsOpen = ref(false)

const parentLabel = computed(() => {
    const uid = isEdit.value ? form.value.parent : props.parentUid
    if (!uid) return ''
    const parent = tasks.value.find(t => t.uid === uid)
    return parent?.summary || uid
})

const subtasks = computed(() => {
    if (!props.task?.uid) return []
    return tasks.value.filter(t => t.parent === props.task.uid)
})

const completedSubtasks = computed(() => subtasks.value.filter(t => t.status === 'COMPLETED'))
const progressPercent = computed(() => {
    if (!subtasks.value.length) return 0
    return Math.round((completedSubtasks.value.length / subtasks.value.length) * 100)
})

const saving = ref(false)
const deleting = ref(false)

const statusOptions = [
    { label: 'To Do', value: 'NEEDS-ACTION', icon: 'radio_button_unchecked', color: 'grey' },
    { label: 'In Progress', value: 'IN-PROCESS', icon: 'timelapse', color: 'blue' },
    { label: 'Done', value: 'COMPLETED', icon: 'check_circle', color: 'green' },
]

const priorityOptions = [
    { label: 'None', value: 0 },
    { label: 'High', value: 1 },
    { label: 'Medium', value: 5 },
    { label: 'Low', value: 9 },
]

const priorityColor = computed(() => {
    const map = { 1: 'red', 5: 'orange', 9: 'blue', 0: 'grey' }
    return map[form.value.priority] || 'grey'
})

const priorityLabel = computed(() =>
    priorityOptions.find(p => p.value === form.value.priority)?.label || 'None'
)

const statusObj = computed(() =>
    statusOptions.find(s => s.value === form.value.status) || statusOptions[0]
)

const form = ref(emptyForm())
const categoriesStr = computed({
    get: () => form.value.categories.join(', '),
    set: (val) => { form.value.categories = val.split(',').map(s => s.trim()).filter(Boolean) },
})

function emptyForm() {
    return {
        summary: '',
        status: 'NEEDS-ACTION',
        categories: [],
        priority: 0,
        start: '',
        due: '',
        description: '',
        parent: '',
    }
}

function formatDateForInput(date) {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 16)
}

function formatDateShort(date) {
    if (!date) return '—'
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** datetime-local → q-date format: '2025-04-15T09:00' → '2025/04/15' */
function toQDate(dtLocal) {
    if (!dtLocal) return null
    return dtLocal.slice(0, 10).replace(/-/g, '/')
}
/** q-date format → datetime-local: '2025/04/15' → '2025-04-15T...' */
function fromQDate(qVal, defaultTime) {
    if (!qVal) return ''
    return qVal.replace(/\//g, '-') + 'T' + defaultTime
}

watch(() => props.modelValue, (open) => {
    if (!open) return
    detailsOpen.value = false
    if (props.task) {
        form.value = {
            summary: props.task.summary || '',
            status: props.task.status || 'NEEDS-ACTION',
            categories: [...(props.task.categories || [])],
            priority: props.task.priority || 0,
            start: formatDateForInput(props.task.start),
            due: formatDateForInput(props.task.due),
            description: props.task.description || '',
            parent: props.task.parent || '',
        }
    } else {
        form.value = emptyForm()
    }
})

function close() { emit('update:modelValue', false) }

async function save() {
    if (!form.value.summary.trim()) return
    saving.value = true
    try {
        const startDate = form.value.start ? new Date(form.value.start) : undefined
        const dueDate = form.value.due ? new Date(form.value.due) : undefined

        if (isEdit.value) {
            await updateTask(props.task, {
                uid: props.task.uid,
                summary: form.value.summary,
                status: form.value.status,
                categories: form.value.categories,
                priority: form.value.priority,
                start: startDate,
                due: dueDate,
                description: form.value.description,
                parent: form.value.parent || undefined,
            })
            $q.notify({ message: 'Task updated', color: 'positive', icon: 'check', position: 'bottom-right' })
        } else {
            const task = new Task({
                summary: form.value.summary,
                status: form.value.status,
                categories: form.value.categories,
                priority: form.value.priority,
                start: startDate,
                due: dueDate,
                description: form.value.description,
                parent: props.parentUid || undefined,
            })
            await createTask(task)
            $q.notify({ message: 'Task created', color: 'positive', icon: 'add', position: 'bottom-right' })
        }
        emit('saved')
        close()
    } catch (e) {
        $q.notify({ message: 'Error: ' + e.message, color: 'negative', icon: 'error', position: 'bottom-right' })
    } finally {
        saving.value = false
    }
}

async function confirmDelete() {
    $q.dialog({
        title: 'Delete task',
        message: `Delete "${props.task.summary}"?`,
        cancel: true,
        persistent: true,
    }).onOk(async () => {
        deleting.value = true
        try {
            await deleteTask([props.task.href])
            $q.notify({ message: 'Task deleted', color: 'positive', icon: 'delete', position: 'bottom-right' })
            emit('deleted')
            close()
        } catch (e) {
            $q.notify({ message: 'Error: ' + e.message, color: 'negative', icon: 'error', position: 'bottom-right' })
        } finally {
            deleting.value = false
        }
    })
}
</script>

<template>
    <q-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        @keydown.ctrl.enter="save"
    >
        <q-card class="task-dialog">
            <!-- ═══ HEADER (fixed, no scroll) ═══ -->
            <q-card-section class="task-header">
                <div class="row items-center no-wrap q-gutter-x-sm">
                    <q-icon
                        :name="statusObj.icon"
                        :color="statusObj.color"
                        size="24px"
                        class="cursor-pointer"
                    >
                        <q-popup-proxy>
                            <q-list dense style="min-width: 150px">
                                <q-item
                                    v-for="opt in statusOptions" :key="opt.value"
                                    clickable v-close-popup
                                    @click="form.status = opt.value"
                                >
                                    <q-item-section avatar>
                                        <q-icon :name="opt.icon" :color="opt.color" size="18px" />
                                    </q-item-section>
                                    <q-item-section>{{ opt.label }}</q-item-section>
                                </q-item>
                            </q-list>
                        </q-popup-proxy>
                    </q-icon>

                    <q-input
                        v-model="form.summary"
                        :placeholder="isEdit ? 'Task name' : 'New task name'"
                        borderless
                        dense
                        autofocus
                        input-class="text-h6 text-weight-medium"
                        class="col"
                    />

                    <q-btn flat round dense icon="close" @click="close" />
                </div>

                <!-- sub-header: priority chip + inline categories edit -->
                <div class="row items-center q-mt-xs q-ml-lg q-gutter-x-sm">
                    <q-chip
                        v-if="form.priority"
                        :color="priorityColor"
                        text-color="white"
                        dense
                        size="sm"
                        icon="flag"
                    >
                        {{ priorityLabel }}
                    </q-chip>

                    <q-input
                        v-model="categoriesStr"
                        placeholder="Categories (comma-separated)"
                        borderless
                        dense
                        input-class="text-caption"
                        class="col categories-input"
                    />

                    <span v-if="!isEdit && parentUid" class="text-caption text-grey-6">
                        <q-icon name="subdirectory_arrow_right" size="14px" />
                        {{ parentLabel }}
                    </span>
                </div>
            </q-card-section>

            <q-separator />

            <!-- ═══ BODY: the ONLY scroll region ═══ -->
            <div class="task-body">
                <!-- LEFT: main content (flows naturally, no own scroll) -->
                <div class="task-main">
                    <!-- Description -->
                    <div class="section">
                        <div class="section-label">
                            <q-icon name="subject" size="16px" class="q-mr-xs" />
                            Description
                        </div>
                        <q-input
                            v-model="form.description"
                            type="textarea"
                            borderless
                            dense
                            autogrow
                            placeholder="Add a description..."
                            class="desc-input"
                        />
                    </div>

                    <!-- Subtasks -->
                    <div v-if="isEdit && subtasks.length" class="section">
                        <div class="section-label">
                            <q-icon name="checklist" size="16px" class="q-mr-xs" />
                            Subtasks
                            <span class="text-grey-5 q-ml-xs">
                                {{ completedSubtasks.length }}/{{ subtasks.length }}
                            </span>
                        </div>

                        <q-linear-progress
                            :value="progressPercent / 100"
                            color="green"
                            track-color="grey-3"
                            rounded
                            size="4px"
                            class="q-mb-sm"
                        />

                        <div
                            v-for="st in subtasks" :key="st.uid"
                            class="subtask-row"
                        >
                            <q-icon
                                :name="st.status === 'COMPLETED' ? 'check_circle' : 'radio_button_unchecked'"
                                :color="st.status === 'COMPLETED' ? 'green' : 'grey-5'"
                                size="18px"
                            />
                            <span :class="{ 'text-strike text-grey-5': st.status === 'COMPLETED' }">
                                {{ st.summary }}
                            </span>
                        </div>
                    </div>

                    <!-- Advanced (edit mode) -->
                    <q-expansion-item
                        v-if="isEdit"
                        dense
                        header-class="text-caption text-grey-7"
                        label="Advanced"
                        icon="settings"
                        class="q-mt-sm"
                    >
                        <div class="q-pa-sm q-gutter-sm">
                            <q-input
                                v-model="form.parent"
                                label="Parent UID"
                                dense outlined
                                :hint="parentLabel ? `→ ${parentLabel}` : ''"
                            />
                        </div>
                    </q-expansion-item>
                </div>

                <!-- RIGHT: sidebar (desktop only) -->
                <div v-if="!isMobile" class="task-sidebar">
                    <!-- Status -->
                    <div class="prop-row">
                        <q-icon :name="statusObj.icon" :color="statusObj.color" size="16px" />
                        <span class="prop-value" :style="{ color: `var(--q-${statusObj.color})` }">
                            {{ statusObj.label }}
                        </span>
                        <q-popup-proxy anchor="bottom left" self="top left">
                            <q-list dense style="min-width: 140px">
                                <q-item
                                    v-for="opt in statusOptions" :key="opt.value"
                                    clickable v-close-popup
                                    @click="form.status = opt.value"
                                    :active="form.status === opt.value"
                                >
                                    <q-item-section avatar style="min-width: 28px">
                                        <q-icon :name="opt.icon" :color="opt.color" size="16px" />
                                    </q-item-section>
                                    <q-item-section class="text-body2">{{ opt.label }}</q-item-section>
                                </q-item>
                            </q-list>
                        </q-popup-proxy>
                    </div>

                    <!-- Priority -->
                    <div class="prop-row">
                        <q-icon name="flag" :color="priorityColor" size="16px" />
                        <span class="prop-value">{{ priorityLabel }}</span>
                        <q-popup-proxy anchor="bottom left" self="top left">
                            <q-list dense style="min-width: 130px">
                                <q-item
                                    v-for="opt in priorityOptions" :key="opt.value"
                                    clickable v-close-popup
                                    @click="form.priority = opt.value"
                                    :active="form.priority === opt.value"
                                >
                                    <q-item-section class="text-body2">{{ opt.label }}</q-item-section>
                                </q-item>
                            </q-list>
                        </q-popup-proxy>
                    </div>

                    <!-- Start -->
                    <div class="prop-row">
                        <q-icon name="play_arrow" size="16px" color="grey-5" />
                        <span class="prop-value" :class="{ 'text-grey-4': !form.start }">
                            {{ form.start ? formatDateShort(form.start) : 'No start' }}
                        </span>
                        <q-popup-proxy anchor="bottom left" self="top left">
                            <q-date
                                :model-value="toQDate(form.start)"
                                @update:model-value="v => form.start = fromQDate(v, '09:00')"
                                minimal flat
                                today-btn
                            />
                        </q-popup-proxy>
                    </div>

                    <!-- Due -->
                    <div class="prop-row">
                        <q-icon name="event" size="16px" color="grey-5" />
                        <span class="prop-value" :class="{ 'text-grey-4': !form.due }">
                            {{ form.due ? formatDateShort(form.due) : 'No due date' }}
                        </span>
                        <q-popup-proxy anchor="bottom left" self="top left">
                            <q-date
                                :model-value="toQDate(form.due)"
                                @update:model-value="v => form.due = fromQDate(v, '18:00')"
                                minimal flat
                                today-btn
                            />
                        </q-popup-proxy>
                    </div>

                    <!-- Meta badges (edit mode) -->
                    <template v-if="isEdit">
                        <div class="meta-row">
                            <span class="meta-badge">
                                <q-icon name="schedule" size="12px" class="q-mr-xs" />
                                {{ formatDateShort(task.created) }}
                            </span>
                            <span class="meta-badge">
                                <q-icon name="edit" size="12px" class="q-mr-xs" />
                                {{ formatDateShort(task.modified) }}
                            </span>
                            <span v-if="subtasks.length" class="meta-badge">
                                {{ progressPercent }}%
                            </span>
                        </div>
                    </template>
                </div>
            </div>

            <!-- ═══ MOBILE DETAILS PANEL (slides up from footer, inside card) ═══ -->
            <transition name="slide-up">
                <div v-if="isMobile && detailsOpen" class="mobile-details">
                    <div class="mobile-details-header">
                        <span class="text-subtitle2">Details</span>
                        <q-btn flat round dense icon="close" size="sm" @click="detailsOpen = false" />
                    </div>
                    <div class="mobile-details-body">
                        <div class="row q-col-gutter-sm">
                            <q-select
                                v-model="form.status"
                                :options="statusOptions"
                                label="Status"
                                dense outlined
                                emit-value map-options
                                options-dense
                                class="col-6"
                            />
                            <q-select
                                v-model="form.priority"
                                :options="priorityOptions"
                                label="Priority"
                                dense outlined
                                emit-value map-options
                                options-dense
                                class="col-6"
                            />
                        </div>
                        <div class="row q-col-gutter-sm q-mt-xs">
                            <q-input
                                v-model="form.start"
                                label="Start"
                                type="datetime-local"
                                dense outlined
                                class="col-6"
                            />
                            <q-input
                                v-model="form.due"
                                label="Due"
                                type="datetime-local"
                                dense outlined
                                class="col-6"
                            />
                        </div>
                        <template v-if="isEdit">
                            <div class="meta-row q-mt-sm">
                                <span class="meta-badge">
                                    <q-icon name="schedule" size="12px" class="q-mr-xs" />
                                    {{ formatDateShort(task.created) }}
                                </span>
                                <span class="meta-badge">
                                    <q-icon name="edit" size="12px" class="q-mr-xs" />
                                    {{ formatDateShort(task.modified) }}
                                </span>
                                <span v-if="subtasks.length" class="meta-badge">
                                    <q-icon name="checklist" size="12px" class="q-mr-xs" />
                                    {{ progressPercent }}%
                                </span>
                            </div>
                        </template>
                    </div>
                </div>
            </transition>

            <q-separator />

            <!-- ═══ FOOTER (fixed, no scroll) ═══ -->
            <q-card-actions class="task-footer">
                <q-btn
                    v-if="isEdit"
                    flat dense
                    icon="delete_outline"
                    color="red"
                    @click="confirmDelete"
                    :label="isMobile ? void 0 : 'Delete'"
                    :loading="deleting"
                    no-caps
                />
                <q-btn
                    v-if="isMobile"
                    flat dense
                    :icon="detailsOpen ? 'expand_more' : 'tune'"
                    :label="detailsOpen ? 'Hide' : 'Details'"
                    @click="detailsOpen = !detailsOpen"
                    no-caps
                    class="text-grey-7"
                />
                <q-space />
                <q-btn flat dense label="Cancel" @click="close" no-caps />
                <q-btn
                    unelevated dense
                    color="primary"
                    :label="isEdit ? 'Save' : 'Create'"
                    :icon="isEdit ? 'check' : 'add'"
                    @click="save"
                    :loading="saving"
                    no-caps
                    class="q-px-md"
                />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<style scoped>
.task-dialog {
    width: 760px;
    max-width: 90vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

.task-header {
    padding: 16px 20px 12px;
    flex-shrink: 0;
}

.categories-input {
    min-width: 120px;
}

/* ── body: THE ONLY scrollable region ── */
.task-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

/* main content flows naturally — NO overflow/scroll */
.task-main {
    flex: 1;
    padding: 16px 20px;
}

/* description textarea grows with content, no inner scroll */
.desc-input {
    font-size: 14px;
    line-height: 1.6;
}
.desc-input :deep(.q-field__native) {
    overflow: visible !important;
    max-height: none !important;
}

/* ── desktop sidebar: compact property rows ── */
.task-sidebar {
    width: 200px;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    align-self: flex-start;
    padding: 8px 0;
}

.prop-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    cursor: pointer;
    transition: background 0.12s;
    font-size: 13px;
}
.prop-row:hover {
    background: rgba(0, 0, 0, 0.035);
}

.prop-value {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ── mobile details panel: inside the card, above footer ── */
.mobile-details {
    flex-shrink: 0;
    background: var(--q-dark-page, #f5f5f5);
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

.mobile-details-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 0;
}

.mobile-details-body {
    padding: 8px 16px 12px;
}

/* slide-up animation */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: max-height 0.25s ease, opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
    max-height: 0 !important;
    opacity: 0;
}
.slide-up-enter-to,
.slide-up-leave-from {
    max-height: 300px;
}

/* ── meta badges ── */
.meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 0 4px;
}

.meta-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    color: #757575;
    background: rgba(0, 0, 0, 0.04);
    padding: 3px 8px;
    border-radius: 10px;
    white-space: nowrap;
}

/* ── sections ── */
.section {
    margin-bottom: 20px;
}

.section-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #9e9e9e;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
}

.subtask-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    border-radius: 6px;
    font-size: 14px;
    transition: background 0.15s;
}
.subtask-row:hover {
    background: rgba(0, 0, 0, 0.03);
}

.task-footer {
    padding: 8px 16px;
    flex-shrink: 0;
}

/* ── scrollbar ── */
.task-body::-webkit-scrollbar {
    width: 4px;
}
.task-body::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.2);
    border-radius: 4px;
}

/* ── dark mode ── */
.body--dark .task-sidebar {
    border-left-color: rgba(255, 255, 255, 0.08);
}
.body--dark .prop-row:hover {
    background: rgba(255, 255, 255, 0.05);
}
.body--dark .mobile-details {
    background: var(--q-dark, #1d1d1d);
    border-top-color: rgba(255, 255, 255, 0.08);
}
.body--dark .meta-badge {
    background: rgba(255, 255, 255, 0.07);
    color: #aaa;
}
.body--dark .subtask-row:hover {
    background: rgba(255, 255, 255, 0.05);
}
</style>
