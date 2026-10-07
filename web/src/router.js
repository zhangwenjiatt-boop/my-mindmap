import Vue from 'vue'
import VueRouter from 'vue-router'
import store from './store'

Vue.use(VueRouter)

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import(`./pages/Login.vue`)
  },
  {
    path: '/',
    name: 'Edit',
    component: () => import(`./pages/Edit/Index.vue`),
    meta: { requiresAuth: true }
  },
  {
    path: '/index',
    redirect: '/'
  },
  {
    path: '/doc/zh',
    component: () => import(`./pages/Doc.vue`)
  }
]

const router = new VueRouter({
  routes
})

// 路由拦截守卫：未登录时优先进入登录页，保障系统安全性
router.beforeEach((to, from, next) => {
  const token = (store && store.state && store.state.token) || localStorage.getItem('MM_TOKEN')
  const isGuestMode = sessionStorage.getItem('MM_GUEST_MODE') === 'true' || to.query.guest === '1'

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!token && !isGuestMode) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
  } else if (to.path === '/login' && token) {
    // 已登录用户直接跳转至工作台
    next('/')
    return
  }
  next()
})

export default router
