export default async function getTasksTest() {
    const { useTasks } = await import('../../packages/web/src/composables/useTasks.js')
    const { tasks } = useTasks()

    if (!('value' in tasks))
        throw new Error('tasks должен быть Vue ref')

    if (!Array.isArray(tasks.value))
        throw new Error('tasks.value должен быть массивом')

    dg.addTestResult({tasks})
}
