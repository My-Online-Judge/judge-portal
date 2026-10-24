import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Self-hosted fonts (vietnamese, latin-ext and latin ranges, font-display: swap): no Google Fonts, so text renders in
// the right face on a LAN without internet. main.css names the families in --font-display, --font-sans and --font-mono.
import '@fontsource/familjen-grotesk/600.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/400-italic.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './assets/main.css'

import App from './App.vue'
import router from './router'
import { useTheme } from './composables/useTheme'
import { installChunkReload } from './lib/chunkReload'
import { installFreshSessionOnVisible } from './api/refreshSession'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// A tab still running the previous build reloads once when its lazy chunks are gone after a redeploy.
installChunkReload(router)
// A tab coming back after 14 minutes or more refreshes its session first, so public pages still know who is asking.
installFreshSessionOnVisible()

// Start following the OS theme for everyone, signed in or not, before any menu exists.
useTheme()

app.mount('#app')
