// Monaco from npm, bundled into the portal's own "monaco" chunk: no CDN, so the editor also loads on a LAN without
// internet. Only the languages the judge runs are registered (cpp also registers c).
// monaco-editor 0.56+ exposes its ESM through an exports map (./* -> ./esm/vs/*.js): the editor API, the editor's
// features, and one register module per language.
import * as monaco from 'monaco-editor/editor'
import 'monaco-editor/features/register.all'
import 'monaco-editor/languages/definitions/cpp/register'
import 'monaco-editor/languages/definitions/java/register'
import 'monaco-editor/languages/definitions/python/register'
import 'monaco-editor/languages/definitions/go/register'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import { loader } from '@guolao/vue-monaco-editor'

self.MonacoEnvironment = { getWorker: () => new EditorWorker() }

// Hand the bundled instance to the Vue wrapper, so its loader never fetches one.
loader.config({ monaco })
