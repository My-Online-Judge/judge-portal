import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import { API_ROUTES } from '@/constants/apiPath'
import type { Language } from '@/types/language'

class LanguageService {

    getLanguages(signal?: AbortSignal): Promise<AxiosResponse<ApiResponse<Language[]>>> {
        return axiosClient.get<ApiResponse<Language[]>>(API_ROUTES.LANGUAGES.ROOT, { signal })
    }
}

export default new LanguageService()
