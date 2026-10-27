import type { Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'

// The editor's schema: anything it does not list is dropped when a statement is loaded, and lost
// for good once the admin form saves editor.getHTML(). Statements write bounds as 10<sup>9</sup>
// and a<sub>i</sub>, so superscript and subscript must be here.
// StarterKit 3 brings Link (and Underline) itself, so Link is configured through it rather than added twice.
export const richTextExtensions = (placeholder = ''): Extensions => [
    StarterKit.configure({ link: { openOnClick: false } }),
    Placeholder.configure({ placeholder }),
    Superscript,
    Subscript,
]
