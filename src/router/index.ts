import { ROUTE_PATH } from '@/constants/routePath'
import { createRouter, createWebHistory } from 'vue-router'
import { resolveAdminAccess } from '@/router/adminGuard'
import { useAuthStore } from '@/stores/auth'

const ADMIN_ANY = ['problem:create', 'problem:update', 'problem:delete', 'submission:read_any', 'judgeserver:read', 'role:read', 'user:read']

// Every page is a lazy chunk; vite.config.ts groups the admin pages into one "admin" chunk.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: ROUTE_PATH.HOME,
      redirect: ROUTE_PATH.PROBLEM
    },
    {
      path: ROUTE_PATH.PROBLEM,
      name: 'Problem',
      component: () => import('@/pages/user/problem/ProblemListPage.vue')
    },
    {
      path: ROUTE_PATH.PROBLEM_DETAIL,
      name: 'ProblemDetail',
      component: () => import('@/pages/user/problem/ProblemDetailPage.vue')
    },
    {
      path: ROUTE_PATH.CONTESTS,
      name: 'Contests',
      component: () => import('@/pages/user/contest/ContestListPage.vue')
    },
    {
      path: ROUTE_PATH.CONTEST_DETAIL,
      name: 'ContestDetail',
      component: () => import('@/pages/user/contest/ContestDetailPage.vue')
    },
    {
      // The problem page in contest mode: it reads the problem through the contest and submits with its slug.
      path: ROUTE_PATH.CONTEST_PROBLEM,
      name: 'ContestProblem',
      component: () => import('@/pages/user/problem/ProblemDetailPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: ROUTE_PATH.USER_PROFILE,
      name: 'UserProfile',
      component: () => import('@/pages/user/profile/UserProfilePage.vue')
    },
    {
      path: ROUTE_PATH.FORBIDDEN,
      name: 'Forbidden',
      component: () => import('@/pages/ForbiddenPage.vue')
    },
    {
      path: ROUTE_PATH.ACCOUNT_PASSWORD,
      name: 'ChangePassword',
      component: () => import('@/pages/user/account/ChangePasswordPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: ROUTE_PATH.ADMIN_LOGIN,
      name: 'AdminLogin',
      component: () => import('@/pages/admin/AdminLoginPage.vue')
    },
    {
      path: ROUTE_PATH.ADMIN,
      component: () => import('@/pages/admin/AdminLayout.vue'),
      children: [
        { path: '', name: 'AdminDashboard', component: () => import('@/pages/admin/AdminDashboardPage.vue'), meta: { permissions: ADMIN_ANY } },
        { path: 'problems', name: 'AdminProblems', component: () => import('@/pages/admin/AdminProblemsPage.vue'), meta: { permissions: ['problem:create', 'problem:update', 'problem:delete'] } },
        { path: 'problems/new', name: 'AdminProblemCreate', component: () => import('@/pages/admin/problem/ProblemCreatePage.vue'), meta: { permissions: ['problem:create'] } },
        { path: 'problems/:slug', name: 'AdminProblemDetail', component: () => import('@/pages/admin/problem/ProblemDetailPage.vue'), meta: { permissions: ['problem:create', 'problem:update', 'problem:delete'] } },
        { path: 'submissions', name: 'AdminSubmissions', component: () => import('@/pages/admin/AdminSubmissionsPage.vue'), meta: { permissions: ['submission:read_any'] } },
        { path: 'judge-servers', name: 'AdminJudgeServers', component: () => import('@/pages/admin/AdminJudgeServersPage.vue'), meta: { permissions: ['judgeserver:read'] } },
        { path: 'roles', name: 'AdminRoles', component: () => import('@/pages/admin/AdminRolesPage.vue'), meta: { permissions: ['role:read'] } },
        { path: 'permissions', name: 'AdminPermissions', component: () => import('@/pages/admin/AdminPermissionsPage.vue'), meta: { permissions: ['permission:read'] } },
        { path: 'security', name: 'AdminSecurity', component: () => import('@/pages/admin/AdminSecurityPage.vue'), meta: { permissions: ['ban:read'] } },
        { path: 'users', name: 'AdminUsers', component: () => import('@/pages/admin/AdminUsersPage.vue'), meta: { permissions: ['user:read'] } },
      ]
    }
  ],
})

router.beforeEach(async (to) => {
  const meta = (to.meta ?? {}) as { permissions?: string[]; requiresAuth?: boolean }
  if (!meta.permissions && !meta.requiresAuth) return true
  const authStore = useAuthStore()
  if (!authStore.user) await authStore.ensureLoaded()
  const access = resolveAdminAccess(meta, { isAuthenticated: authStore.isAuthenticated, hasPermission: authStore.hasPermission })
  if (access === 'allow') return true
  if (access === 'login') return { path: ROUTE_PATH.ADMIN_LOGIN, query: { redirect: to.fullPath } }
  return { path: ROUTE_PATH.FORBIDDEN }
})

export default router
