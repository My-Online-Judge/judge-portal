import type { Language } from '@/types/language'

export const getMonacoLanguage = (language: Language): string => {
    return language.editorFormat || 'plaintext'
}
