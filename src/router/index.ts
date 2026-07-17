import { ROUTE_PATH } from '@/constants/routePath'
import ProblemDetailPage from '@/pages/user/problem/ProblemDetailPage.vue'
import ProblemListPage from '@/pages/user/problem/ProblemListPage.vue'
import { createRouter, createWebHistory } from 'vue-router'
import ForbiddenPage from '@/pages/ForbiddenPage.vue'
import AdminLoginPage from '@/pages/admin/AdminLoginPage.vue'
import AdminLayout from '@/pages/admin/AdminLayout.vue'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage.vue'
import AdminProblemsPage from '@/pages/admin/AdminProblemsPage.vue'
import AdminProblemCreatePage from '@/pages/admin/problem/ProblemCreatePage.vue'
import AdminProblemDetailPage from '@/pages/admin/problem/ProblemDetailPage.vue'
import AdminJudgeServersPage from '@/pages/admin/AdminJudgeServersPage.vue'
import AdminRolesPage from '@/pages/admin/AdminRolesPage.vue'
import AdminUsersPage from '@/pages/admin/AdminUsersPage.vue'
import { resolveAdminAccess } from '@/router/adminGuard'
import { useAuthStore } from '@/stores/auth'

const ADMIN_ANY = ['problem:create', 'problem:update', 'problem:delete', 'judgeserver:read', 'role:read', 'user:read']

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
      path: ROUTE_PATH.FORBIDDEN,
      name: 'Forbidden',
      component: ForbiddenPage
    },
    {
      path: ROUTE_PATH.ADMIN_LOGIN,
      name: 'AdminLogin',
      component: AdminLoginPage
    },
    {
      path: ROUTE_PATH.ADMIN,
      component: AdminLayout,
      children: [
        { path: '', name: 'AdminDashboard', component: AdminDashboardPage, meta: { permissions: ADMIN_ANY } },
        { path: 'problems', name: 'AdminProblems', component: AdminProblemsPage, meta: { permissions: ['problem:create', 'problem:update', 'problem:delete'] } },
        { path: 'problems/new', name: 'AdminProblemCreate', component: AdminProblemCreatePage, meta: { permissions: ['problem:create'] } },
        { path: 'problems/:slug', name: 'AdminProblemDetail', component: AdminProblemDetailPage, meta: { permissions: ['problem:create', 'problem:update', 'problem:delete'] } },
        { path: 'judge-servers', name: 'AdminJudgeServers', component: AdminJudgeServersPage, meta: { permissions: ['judgeserver:read'] } },
        { path: 'roles', name: 'AdminRoles', component: AdminRolesPage, meta: { permissions: ['role:read'] } },
        { path: 'users', name: 'AdminUsers', component: AdminUsersPage, meta: { permissions: ['user:read'] } },
      ]
    }
  ],
})

router.beforeEach(async (to) => {
  const meta = (to.meta ?? {}) as { permissions?: string[] }
  if (!meta.permissions) return true
  const authStore = useAuthStore()
  if (!authStore.user) await authStore.ensureLoaded()
  const access = resolveAdminAccess(meta, { isAuthenticated: authStore.isAuthenticated, hasPermission: authStore.hasPermission })
  if (access === 'allow') return true
  if (access === 'login') return { path: ROUTE_PATH.ADMIN_LOGIN, query: { redirect: to.fullPath } }
  return { path: ROUTE_PATH.FORBIDDEN }
})

export default router
