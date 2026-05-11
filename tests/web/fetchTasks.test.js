import { useTasks } from '../../packages/web/src/composables/useTasks.js'


export default async function fetchTasksTest() {
    const tasks = useTasks()

    if (tasks.value.length === 0)
        throw new Error('задач должно быть больше 0')

    const task = tasks.value[0]
    if (!task.uid)
        throw new Error('задача должна иметь uid')
    if (!task.summary)
        throw new Error('задача должна иметь summary')
    dg.addTestResult({tasks})
}
