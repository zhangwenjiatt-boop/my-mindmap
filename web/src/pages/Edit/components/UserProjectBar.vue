<template>
  <div class="userProjectBarWrap" :class="{ isDark: isDark }">
    <!-- 1. 左上角：项目卡片与【新建项目】快捷按钮 -->
    <div class="leftActionGroup">
      <div
        class="barPill projectPill"
        @click="handleOpenProjectManager"
        :title="isLoggedIn ? '点击打开我的项目库，切换或管理导图' : '点击登录后可将导图保存至云端个人空间'"
      >
        <div class="pillIcon projectIcon">
          <i class="el-icon-folder-opened"></i>
        </div>
        <div class="pillContent">
          <div class="projectTitle">
            {{ currentTitle }}
          </div>
          <div class="saveStatus">
            <template v-if="isLoggedIn">
              <span v-if="isSavingProject" class="statusItem saving">
                <i class="el-icon-loading"></i> 云端保存中...
              </span>
              <span v-else class="statusItem synced">
                <span class="syncedDot"></span> 云端已同步
              </span>
            </template>
            <template v-else>
              <span class="statusItem local">
                <span class="localDot"></span> 本地实时保存
              </span>
            </template>
          </div>
        </div>
        <i class="el-icon-arrow-down arrowIcon"></i>
      </div>

      <!-- 新建项目快捷胶囊 -->
      <div
        class="barPill newProjectPill"
        @click="handleQuickCreateProject"
        title="新建思维导图项目（命名并开启干净工作区）"
      >
        <i class="el-icon-plus newProjectIcon"></i>
        <span class="newProjectText">新建项目</span>
      </div>
    </div>

    <!-- 2. 右上角：用户账号与登录状态胶囊 -->
    <div class="barPill userPill">
      <template v-if="isLoggedIn">
        <el-dropdown trigger="click" @command="handleUserCommand">
          <div class="userDropdownTrigger">
            <div class="avatarCircle">
              {{ userInitial }}
            </div>
            <span class="userName">{{ userName }}</span>
            <i class="el-icon-caret-bottom"></i>
          </div>
          <el-dropdown-menu slot="dropdown" class="userDropdownMenu">
            <div class="dropdownUserHeader">
              <div class="headerAvatar">{{ userInitial }}</div>
              <div class="headerInfo">
                <div class="headerName">{{ userName }}</div>
                <div class="headerAccount">账号: {{ userInfo.username }}</div>
              </div>
            </div>
            <el-dropdown-item divided command="newProject" icon="el-icon-plus">
              新建思维导图
            </el-dropdown-item>
            <el-dropdown-item command="projects" icon="el-icon-folder">
              我的项目库 (导图管理)
            </el-dropdown-item>
            <el-dropdown-item command="syncSave" icon="el-icon-upload2">
              立即同步保存 (Ctrl+S)
            </el-dropdown-item>
            <el-dropdown-item divided command="logout" icon="el-icon-switch-button" class="logoutItem">
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </template>

      <template v-else>
        <div class="guestBox" @click="handleOpenAuth">
          <i class="el-icon-user guestIcon"></i>
          <span class="guestText">登录 / 注册</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { logoutUser, createNewProject } from '@/api/auth'

export default {
  name: 'UserProjectBar',
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      token: state => state.token,
      userInfo: state => state.userInfo,
      currentProject: state => state.currentProject,
      isSavingProject: state => state.isSavingProject
    }),

    isLoggedIn() {
      return !!(this.token && this.userInfo)
    },

    userName() {
      if (!this.userInfo) return '未登录'
      return this.userInfo.nickname || this.userInfo.username || '我的账号'
    },

    userInitial() {
      const name = this.userName
      return name.charAt(0).toUpperCase()
    },

    currentTitle() {
      if (this.currentProject && this.currentProject.title) {
        return this.cleanTitle(this.currentProject.title) || '未命名思维导图'
      }
      return '未命名思维导图'
    }
  },
  methods: {
    ...mapMutations([
      'setAuthDialogVisible',
      'setProjectManagerVisible',
      'setToken',
      'setUserInfo',
      'setCurrentProject'
    ]),

    cleanTitle(text) {
      if (!text) return ''
      return String(text)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
    },

    handleOpenAuth() {
      this.$router.push('/login')
    },

    handleOpenProjectManager() {
      if (!this.isLoggedIn) {
        this.$message.info('请先登录账号，即可管理和保存多个云端思维导图项目')
        this.$router.push('/login')
        return
      }
      this.setProjectManagerVisible(true)
    },

    // 快捷新建项目全流程：命名 -> 存入项目库 -> 载入干净工作区
    handleQuickCreateProject() {
      if (!this.isLoggedIn) {
        this.$confirm('登录后即可将导图保存到您的专属云端空间，随时随地打开。是否立即前往登录？', '新建项目提示', {
          confirmButtonText: '去登录 / 注册',
          cancelButtonText: '暂不登录（使用临时新画布）',
          type: 'info'
        })
          .then(() => {
            this.$router.push('/login')
          })
          .catch(() => {
            // 访客直接重置干净新画布
            this.$prompt('请输入新建导图的名称：', '新建临时思维导图', {
              confirmButtonText: '确定创建',
              cancelButtonText: '取消',
              inputPlaceholder: '例如：战略规划、学习笔记',
              inputValue: '未命名思维导图',
              inputValidator: val => (!val || !val.trim() ? '导图名称不能为空' : true)
            })
              .then(({ value }) => {
                const title = value.trim()
                const blankData = {
                  root: { data: { text: title }, children: [] },
                  theme: { template: 'classic4', config: {} },
                  layout: 'logicalStructure',
                  view: null
                }
                this.$bus.$emit('setData', blankData)
                this.$message.success(`已创建新画布《${title}》`)
              })
              .catch(() => {})
          })
        return
      }

      this.$prompt('请输入新建思维导图的项目名称：', '新建导图项目', {
        confirmButtonText: '确定创建',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：2026战略规划、产品架构设计',
        inputValue: '未命名思维导图',
        inputValidator: val => {
          if (!val || !val.trim()) {
            return '导图名称不能为空'
          }
          return true
        }
      })
        .then(async ({ value }) => {
          const title = value.trim()
          try {
            // 切换前先确保当前编辑内容保存
            this.$bus.$emit('flushSaveCurrentProject')
            const res = await createNewProject(title)
            if (res && res.code === 0 && res.data) {
              this.setCurrentProject(res.data)
              // 组装纯净单中心主题的新导图数据，主题名为项目名
              const newMapData = {
                root: {
                  data: {
                    text: title
                  },
                  children: []
                },
                theme: {
                  template: 'classic4',
                  config: {}
                },
                layout: 'logicalStructure',
                view: null
              }
              this.$bus.$emit('setData', newMapData)
              this.$message.success(`思维导图《${title}》创建成功，已进入新工作区！`)
            } else {
              this.$message.error(res.msg || '创建项目失败')
            }
          } catch (err) {
            this.$message.error('创建项目异常：' + (err.message || '网络错误'))
          }
        })
        .catch(() => {})
    },

    async handleUserCommand(command) {
      if (command === 'projects') {
        this.setProjectManagerVisible(true)
      } else if (command === 'newProject') {
        this.handleQuickCreateProject()
      } else if (command === 'syncSave') {
        this.$bus.$emit('manualSave')
      } else if (command === 'logout') {
        try {
          await logoutUser()
        } catch (e) {}
        this.setToken('')
        this.setUserInfo(null)
        this.setCurrentProject(null)
        sessionStorage.removeItem('MM_GUEST_MODE')
        this.$message.success('已安全退出登录')
        this.$router.push('/login')
      }
    }
  }
}
</script>

<style lang="less" scoped>
.userProjectBarWrap {
  user-select: none;
}

.leftActionGroup {
  position: fixed;
  top: 14px;
  left: 16px;
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: 8px;
}

.barPill {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  padding: 3px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  transition: all 0.25s ease;
  height: 34px;
  box-sizing: border-box;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 3px 12px rgba(64, 158, 255, 0.16);
  }
}

.projectPill {
  cursor: pointer;
  max-width: 230px;
  gap: 8px;

  .projectIcon {
    font-size: 16px;
    color: #409eff;
    display: flex;
    align-items: center;
  }

  .pillContent {
    flex: 1;
    min-width: 0;

    .projectTitle {
      font-size: 12px;
      font-weight: 600;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .saveStatus {
      font-size: 10px;
      line-height: 1.1;
      margin-top: 1px;

      .statusItem {
        display: flex;
        align-items: center;
        gap: 3px;

        &.synced {
          color: #67c23a;
          .syncedDot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #67c23a;
          }
        }

        &.saving {
          color: #e6a23c;
        }

        &.local {
          color: #909399;
          .localDot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #909399;
          }
        }
      }
    }
  }

  .arrowIcon {
    font-size: 12px;
    color: #909399;
    margin-left: 2px;
  }
}

.newProjectPill {
  cursor: pointer;
  background: #f0f7ff;
  border-color: #b3d8ff;
  color: #409eff;
  font-size: 12px;
  font-weight: 500;
  gap: 5px;
  padding: 3px 12px;

  &:hover {
    background: #409eff;
    color: #fff;
    border-color: #409eff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);

    .newProjectIcon {
      color: #fff;
    }
  }

  .newProjectIcon {
    font-size: 13px;
    font-weight: bold;
    color: #409eff;
    transition: color 0.2s;
  }
}

.userPill {
  position: fixed;
  top: 14px;
  right: 20px;
  z-index: 1001;
  padding: 3px 10px;

  .guestBox {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #409eff;
    padding: 3px 4px;

    .guestIcon {
      font-size: 15px;
    }

    &:hover {
      opacity: 0.85;
    }
  }

  .userDropdownTrigger {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;

    .avatarCircle {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #409eff, #3a8ee6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
    }

    .userName {
      font-size: 13px;
      font-weight: 500;
      color: #303133;
      max-width: 90px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    i {
      font-size: 11px;
      color: #909399;
    }
  }
}

/* 暗黑模式适配 */
.userProjectBarWrap.isDark {
  .barPill {
    background: rgba(38, 41, 46, 0.92);
    border-color: rgba(255, 255, 255, 0.1);

    &:hover {
      border-color: #409eff;
    }

    .projectTitle {
      color: #e5eaf3;
    }

    .userName {
      color: #e5eaf3;
    }
  }
}
</style>

<style lang="less">
.dropdownUserHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 12px;
  border-bottom: 1px solid #ebeef5;

  .headerAvatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #409eff, #3a8ee6);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
  }

  .headerInfo {
    .headerName {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .headerAccount {
      font-size: 11px;
      color: #909399;
    }
  }
}

.logoutItem {
  color: #f56c6c !important;
}
</style>
