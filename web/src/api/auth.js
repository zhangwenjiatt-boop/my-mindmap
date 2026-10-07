import axios from 'axios'
import store from '@/store'

const apiClient = axios.create({
  baseURL: '', // 同源请求
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器注入 Authorization Token
apiClient.interceptors.request.use(
  config => {
    const token = (store && store.state && store.state.token) || localStorage.getItem('MM_TOKEN')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器统一处理
apiClient.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response && error.response.status === 401) {
      if (store) {
        store.commit('setToken', '')
        store.commit('setUserInfo', null)
        store.commit('setCurrentProject', null)
      }
      localStorage.removeItem('MM_TOKEN')
      localStorage.removeItem('MM_USER')
      localStorage.removeItem('MM_CURRENT_PROJECT')
    }
    const msg = error.response && error.response.data && error.response.data.msg
      ? error.response.data.msg
      : (error.message || '网络请求异常')
    return Promise.reject(new Error(msg))
  }
)

// 用户注册
export const registerUser = (username, password, nickname) => {
  return apiClient.post('/api/auth/register', { username, password, nickname })
}

// 用户登录
export const loginUser = (username, password) => {
  return apiClient.post('/api/auth/login', { username, password })
}

// 用户登出
export const logoutUser = () => {
  return apiClient.post('/api/auth/logout')
}

// 获取当前用户信息
export const getCurrentUser = () => {
  return apiClient.get('/api/auth/me')
}

// 获取项目列表
export const fetchProjectList = () => {
  return apiClient.get('/api/projects')
}

// 创建新项目
export const createNewProject = (title, data, desc) => {
  return apiClient.post('/api/projects', { title, data, desc })
}

// 读取单个项目数据
export const fetchProjectDetail = projectId => {
  return apiClient.get(`/api/projects/${projectId}`)
}

// 保存更新项目
export const saveProjectData = (projectId, payload) => {
  return apiClient.put(`/api/projects/${projectId}`, payload)
}

// 删除项目
export const deleteProjectItem = projectId => {
  return apiClient.delete(`/api/projects/${projectId}`)
}

// 复制项目副本
export const duplicateProjectItem = projectId => {
  return apiClient.post(`/api/projects/${projectId}/duplicate`)
}
