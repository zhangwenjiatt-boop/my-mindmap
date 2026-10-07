import Vue from 'vue'
import Vuex from 'vuex'
import { storeLocalConfig } from '@/api'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    isHandleLocalFile: false, // 是否操作的是本地文件
    localConfig: {
      // 本地配置
      isZenMode: false, // 是否是禅模式
      // 是否开启节点富文本
      openNodeRichText: true,
      // 鼠标行为
      useLeftKeySelectionRightKeyDrag: false,
      // 是否显示滚动条
      isShowScrollbar: false,
      // 是否是暗黑模式
      isDark: false,
      // 是否开启AI功能
      enableAi: true,
      // 是否开启AI备注框
      enableAiNoteBox: true,
      // AI备注框记录模式：auto(自动记录) / manual(手动记录)
      aiNoteRecordMode: 'auto',
      // AI续写预设与自定义prompt
      aiContinuationPromptPreset: 'expand',
      aiContinuationCustomPrompt: '',
      // AI解释预设与自定义prompt
      aiExplanationPromptPreset: 'plain',
      aiExplanationCustomPrompt: '',
      // 双语思维导图显示模式：'dual'(双语对照) / 'zh'(中文纯享) / 'en'(英文原版)
      bilingualMode: 'dual'
    },
    activeSidebar: '', // 当前显示的侧边栏
    isOutlineEdit: false, // 是否是大纲编辑模式
    isReadonly: false, // 是否只读
    isSourceCodeEdit: false, // 是否是源码编辑模式
    extraTextOnExport: '', // 导出时底部添加的文字
    isDragOutlineTreeNode: false, // 当前是否正在拖拽大纲树的节点
    aiConfig: {
      provider: 'deepseek',
      api: 'https://api.deepseek.com/v1/chat/completions',
      key: '',
      model: 'deepseek-chat',
      method: 'POST'
    },
    aiStatus: {
      status: 'unconfigured',
      message: '',
      latency: 0,
      lastTested: ''
    },
    // 扩展主题列表
    extendThemeGroupList: [],
    // 内置背景图片
    bgList: [],
    // 用户认证与账号状态
    token: localStorage.getItem('MM_TOKEN') || '',
    userInfo: (() => {
      try {
        const u = localStorage.getItem('MM_USER')
        return u ? JSON.parse(u) : null
      } catch (e) {
        return null
      }
    })(),
    // 当前激活的项目元信息
    currentProject: (() => {
      try {
        const p = localStorage.getItem('MM_CURRENT_PROJECT')
        return p ? JSON.parse(p) : null
      } catch (e) {
        return null
      }
    })(),
    // 用户项目列表
    projectList: [],
    // 是否正在向云端保存
    isSavingProject: false,
    // 最近保存时间戳
    lastSavedTime: null,
    // 弹窗可见性
    isAuthDialogVisible: false,
    isProjectManagerVisible: false
  },
  mutations: {
    // 设置操作本地文件标志位
    setIsHandleLocalFile(state, data) {
      state.isHandleLocalFile = data
    },

    // 设置本地配置
    setLocalConfig(state, data) {
      const aiConfigKeys = Object.keys(state.aiConfig)
      Object.keys(data).forEach(key => {
        if (aiConfigKeys.includes(key)) {
          state.aiConfig[key] = data[key]
        } else {
          state.localConfig[key] = data[key]
        }
      })
      storeLocalConfig({
        ...state.localConfig,
        ...state.aiConfig
      })
    },

    // 设置 AI 模型接入状态
    setAiStatus(state, data) {
      state.aiStatus = {
        ...state.aiStatus,
        ...data
      }
    },

    // 设置当前显示的侧边栏
    setActiveSidebar(state, data) {
      state.activeSidebar = data
    },

    // 设置大纲编辑模式
    setIsOutlineEdit(state, data) {
      state.isOutlineEdit = data
    },

    // 设置是否只读
    setIsReadonly(state, data) {
      state.isReadonly = data
    },

    // 设置源码编辑模式
    setIsSourceCodeEdit(state, data) {
      state.isSourceCodeEdit = data
    },

    // 设置导出时底部添加的文字
    setExtraTextOnExport(state, data) {
      state.extraTextOnExport = data
    },

    // 设置树节点拖拽
    setIsDragOutlineTreeNode(state, data) {
      state.isDragOutlineTreeNode = data
    },

    // 扩展主题列表
    setExtendThemeGroupList(state, data) {
      state.extendThemeGroupList = data
    },

    // 设置背景图片列表
    setBgList(state, data) {
      state.bgList = data
    },

    // 设置登录 Token
    setToken(state, token) {
      state.token = token || ''
      if (token) {
        localStorage.setItem('MM_TOKEN', token)
      } else {
        localStorage.removeItem('MM_TOKEN')
      }
    },

    // 设置用户信息
    setUserInfo(state, user) {
      state.userInfo = user
      if (user) {
        localStorage.setItem('MM_USER', JSON.stringify(user))
      } else {
        localStorage.removeItem('MM_USER')
      }
    },

    // 设置当前激活项目
    setCurrentProject(state, project) {
      state.currentProject = project
      if (project) {
        localStorage.setItem('MM_CURRENT_PROJECT', JSON.stringify(project))
      } else {
        localStorage.removeItem('MM_CURRENT_PROJECT')
      }
    },

    // 设置项目列表
    setProjectList(state, list) {
      state.projectList = list || []
    },

    // 设置保存状态
    setIsSavingProject(state, bool) {
      state.isSavingProject = !!bool
    },

    // 设置最近保存时间
    setLastSavedTime(state, time) {
      state.lastSavedTime = time
    },

    // 控制登录/注册弹窗
    setAuthDialogVisible(state, bool) {
      state.isAuthDialogVisible = !!bool
    },

    // 控制项目库管理弹窗
    setProjectManagerVisible(state, bool) {
      state.isProjectManagerVisible = !!bool
    }
  },
  actions: {}
})

export default store
