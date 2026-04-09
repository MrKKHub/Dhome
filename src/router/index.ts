import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/userStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/detail/:id',
      name: 'detail',
      component: () => import('@/views/Detail.vue'),
    },
    {
      path: '/capsules',
      name: 'capsules',
      component: () => import('@/views/Capsules.vue'),
    },
    {
      path: '/publish',
      name: 'publish',
      component: () => import('@/views/Publish.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/Profile.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/Notifications.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.path === '/publish' && !userStore.isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }
  if (to.path === '/capsules' && !userStore.isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }
  if (to.path === '/notifications' && !userStore.isLoggedIn) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }
  return true
})

export default router
