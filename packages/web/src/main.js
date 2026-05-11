import { createApp } from 'vue'
import { Quasar, Dialog, Notify } from 'quasar'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import 'quasar/src/css/index.sass'
import '@quasar/extras/material-icons/material-icons.css'

import App from './App.vue'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: true,
            retry: false,
        },
    },
})

const app = createApp(App)
app.use(Quasar, { plugins: { Dialog, Notify } })
app.use(VueQueryPlugin, { queryClient })
app.mount('#app')

if (import.meta.env.DEV) {
    import('../../../tests/web/index.js')
}
