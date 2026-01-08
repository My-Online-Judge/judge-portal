import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/problems',
      name: 'Problem',
      component: () => import('@/pages/user/problem/ProblemListPage.vue')
    },
    {
      path: '/problems/:id',
      name: 'ProblemDetail',
      component: () => import('@/pages/user/problem/ProblemDetailPage.vue')
    }
  ],
})

export default router
