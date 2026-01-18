import { ROUTE_PATH } from '@/constants/routePath'
import ProblemDetailPage from '@/pages/user/problem/ProblemDetailPage.vue'
import ProblemListPage from '@/pages/user/problem/ProblemListPage.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: ROUTE_PATH.PROBLEM,
      name: 'Problem',
      component: ProblemListPage
    },
    {
      path: ROUTE_PATH.PROBLEM_DETAIL,
      name: 'ProblemDetail',
      component: ProblemDetailPage
    },
    {
      path: ROUTE_PATH.GOOGLE_CALLBACK,
      name: 'GoogleCallback',
      component: () => import('@/components/auth/GoogleCallback.vue')
    }
  ],
})

export default router
