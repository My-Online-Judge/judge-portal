import { defineStore } from 'pinia'
import languageService from '@/services/languageService'
import { useFetch } from '@/composables/useFetch'

export const useLanguageStore = defineStore('language', () => {

    const { data: languages, isLoading, error, execute } = useFetch(languageService.getLanguages, {
        immediate: false,
        transform: (res) => res.data
    })

    async function fetchLanguages() {
        if (languages.value && languages.value.length > 0) return

        await execute()
    }

    return {
        languages,
        isLoading,
        error,
        fetchLanguages
    }
})
