// Monaco from npm, bundled into the portal's own "monaco" chunk: no CDN, so the editor also loads on a LAN without
// internet. Only the languages the judge runs are registered (cpp also registers c).
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js'
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution.js'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import { loader } from '@guolao/vue-monaco-editor'

self.MonacoEnvironment = { getWorker: () => new EditorWorker() }

// Hand the bundled instance to the Vue wrapper, so its loader never fetches one.
loader.config({ monaco })
