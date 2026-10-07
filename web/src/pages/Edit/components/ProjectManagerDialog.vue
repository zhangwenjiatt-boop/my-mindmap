<template>
  <el-dialog
    :visible="visible"
    title="我的思维导图项目库"
    width="860px"
    custom-class="projectManagerDialog"
    :close-on-click-modal="false"
    :append-to-body="true"
    @close="handleClose"
  >
    <div class="projectManagerBox">
      <!-- 顶部操作栏：搜索与新建 -->
      <div class="topActionBar">
        <div class="searchWrap">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索导图名称..."
            prefix-icon="el-icon-search"
            clearable
            size="small"
          ></el-input>
        </div>
        <div class="actionButtons">
          <el-button
            type="primary"
            icon="el-icon-plus"
            size="small"
            @click="handleCreateNewProject"
          >
            新建导图
          </el-button>
          <el-button
            icon="el-icon-refresh"
            size="small"
            :loading="refreshing"
            @click="loadProjectList"
            title="刷新项目列表"
          >
            刷新
          </el-button>
        </div>
      </div>

      <!-- 项目卡片网格列表 -->
      <div class="projectGrid customScrollbar" v-loading="loading">
        <div
          v-for="item in filteredProjects"
          :key="item.id"
          class="projectCard"
          :class="{ isActive: currentProject && currentProject.id === item.id }"
        >
          <!-- 激活标签 -->
          <div
            class="activeBadge"
            v-if="currentProject && currentProject.id === item.id"
          >
            <i class="el-icon-check"></i> 正在编辑
          </div>

          <!-- 卡片主要内容 -->
          <div class="cardMain" @click="handleSwitchProject(item)">
            <div class="cardIconWrap">
              <span class="mindIcon">🗺️</span>
            </div>
            <div class="cardDetails">
              <div class="cardTitle" :title="cleanTitle(item.title)">
                {{ cleanTitle(item.title) || '未命名思维导图' }}
              </div>
              <div class="cardMeta">
                <span class="metaItem">
                  <i class="el-icon-s-operation"></i>
                  {{ item.nodeCount || 1 }} 个节点
                </span>
                <span class="metaItem time" :title="'创建于 ' + formatTime(item.createdAt)">
                  <i class="el-icon-time"></i>
                  {{ formatTime(item.updatedAt || item.createdAt) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 卡片底栏操作 -->
          <div class="cardFooter">
            <el-button
              type="text"
              size="mini"
              class="footerBtn"
              :class="{ openActive: currentProject && currentProject.id === item.id }"
              @click.stop="handleSwitchProject(item)"
            >
              {{ currentProject && currentProject.id === item.id ? '继续编辑' : '打开' }}
            </el-button>
            <span class="divider">|</span>
            <el-button
              type="text"
              size="mini"
              class="footerBtn"
              @click.stop="handleRenameProject(item)"
            >
              重命名
            </el-button>
            <span class="divider">|</span>
            <el-button
              type="text"
              size="mini"
              class="footerBtn"
              @click.stop="handleDuplicateProject(item)"
            >
              复制
            </el-button>
            <span class="divider">|</span>
            <el-button
              type="text"
              size="mini"
              class="footerBtn dangerBtn"
              @click.stop="handleDeleteProject(item)"
            >
              删除
            </el-button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && filteredProjects.length === 0" class="emptyBox">
          <div class="emptyIcon">📂</div>
          <div class="emptyText">
            {{ searchKeyword ? '没有找到包含该关键词的思维导图' : '暂无导图项目，立即创建一个吧！' }}
          </div>
          <el-button
            type="primary"
            size="small"
            icon="el-icon-plus"
            @click="handleCreateNewProject"
            style="margin-top: 12px;"
          >
            新建导图
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import {
  fetchProjectList,
  createNewProject,
  fetchProjectDetail,
  saveProjectData,
  deleteProjectItem,
  duplicateProjectItem
} from '@/api/auth'

export default {
  name: 'ProjectManagerDialog',
  data() {
    return {
      searchKeyword: '',
      loading: false,
      refreshing: false
    }
  },
  computed: {
    ...mapState({
      visible: state => state.isProjectManagerVisible,
      currentProject: state => state.currentProject,
      projectList: state => state.projectList,
      token: state => state.token
    }),

    filteredProjects() {
      if (!this.searchKeyword) {
        return this.projectList
      }
      const kw = this.searchKeyword.toLowerCase().trim()
      return this.projectList.filter(
        item => item.title && item.title.toLowerCase().includes(kw)
      )
    }
  },
  watch: {
    visible(val) {
      if (val && this.token) {
        this.loadProjectList()
      }
    }
  },
  methods: {
    ...mapMutations([
      'setProjectManagerVisible',
      'setProjectList',
      'setCurrentProject'
    ]),

    handleClose() {
      this.setProjectManagerVisible(false)
    },

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

    formatTime(timestamp) {
      if (!timestamp) return ''
      const d = new Date(timestamp)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${y}/${m}/${day} ${h}:${min}`
    },

    // 加载项目列表
    async loadProjectList() {
      if (!this.token) return
      this.refreshing = true
      try {
        const res = await fetchProjectList()
        if (res && res.code === 0) {
          this.setProjectList(res.data || [])
        }
      } catch (err) {
        this.$message.error('加载项目列表失败：' + (err.message || '网络错误'))
      } finally {
        this.refreshing = false
      }
    },

    // 新建项目
    handleCreateNewProject() {
      this.$prompt('请输入新建思维导图的名称：', '新建导图项目', {
        confirmButtonText: '确定创建',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：2026战略规划、产品架构图',
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
            const res = await createNewProject(title)
            if (res && res.code === 0 && res.data) {
              this.$message.success(`思维导图《${title}》创建成功！`)
              await this.loadProjectList()
              // 自动切换到新创建的项目
              this.handleSwitchProject(res.data)
            } else {
              this.$message.error(res.msg || '创建失败')
            }
          } catch (err) {
            this.$message.error(err.message || '创建项目失败')
          }
        })
        .catch(() => {})
    },

    // 切换/打开项目
    async handleSwitchProject(project) {
      if (this.currentProject && this.currentProject.id === project.id) {
        this.setProjectManagerVisible(false)
        return
      }

      // 切换前先确保当前编辑内容保存
      this.$bus.$emit('flushSaveCurrentProject')

      this.loading = true
      try {
        const res = await fetchProjectDetail(project.id)
        if (res && res.code === 0 && res.data) {
          const detail = res.data
          this.setCurrentProject({
            id: detail.id,
            title: detail.title,
            nodeCount: detail.nodeCount,
            updatedAt: detail.updatedAt,
            createdAt: detail.createdAt
          })

          // 触发编辑画布重新装载新导图数据
          if (detail.data) {
            this.$bus.$emit('loadProjectData', detail.data)
          }

          this.$message.success(`已切换至思维导图：《${detail.title}》`)
          this.setProjectManagerVisible(false)
        } else {
          this.$message.error(res.msg || '读取导图内容失败')
        }
      } catch (err) {
        this.$message.error('切换导图失败：' + (err.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },

    // 重命名项目
    handleRenameProject(project) {
      this.$prompt('请输入新的导图名称：', '重命名导图', {
        confirmButtonText: '确定修改',
        cancelButtonText: '取消',
        inputValue: project.title,
        inputValidator: val => {
          if (!val || !val.trim()) {
            return '导图名称不能为空'
          }
          return true
        }
      })
        .then(async ({ value }) => {
          const newTitle = value.trim()
          try {
            const res = await saveProjectData(project.id, { title: newTitle })
            if (res && res.code === 0) {
              this.$message.success('重命名成功')
              project.title = newTitle
              if (this.currentProject && this.currentProject.id === project.id) {
                this.setCurrentProject({
                  ...this.currentProject,
                  title: newTitle
                })
              }
              await this.loadProjectList()
            }
          } catch (err) {
            this.$message.error(err.message || '重命名失败')
          }
        })
        .catch(() => {})
    },

    // 复制项目副本
    async handleDuplicateProject(project) {
      try {
        const res = await duplicateProjectItem(project.id)
        if (res && res.code === 0) {
          this.$message.success(`已成功创建副本：《${res.data.title}》`)
          await this.loadProjectList()
        }
      } catch (err) {
        this.$message.error('创建副本失败：' + (err.message || '网络错误'))
      }
    },

    // 删除项目
    handleDeleteProject(project) {
      this.$confirm(
        `确定要删除思维导图《${project.title}》吗？删除后项目内容将无法恢复。`,
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
        .then(async () => {
          try {
            const res = await deleteProjectItem(project.id)
            if (res && res.code === 0) {
              this.$message.success('已成功删除思维导图')
              await this.loadProjectList()

              // 如果删除的是当前正在编辑的项目，自动切至剩余列表第一项
              if (this.currentProject && this.currentProject.id === project.id) {
                if (this.projectList.length > 0) {
                  this.handleSwitchProject(this.projectList[0])
                }
              }
            }
          } catch (err) {
            this.$message.error('删除项目失败：' + (err.message || '网络错误'))
          }
        })
        .catch(() => {})
    }
  }
}
</script>

<style lang="less" scoped>
.projectManagerDialog {
  border-radius: 14px;
}

.projectManagerBox {
  min-height: 420px;
  display: flex;
  flex-direction: column;
}

.topActionBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;

  .searchWrap {
    width: 260px;
  }

  .actionButtons {
    display: flex;
    gap: 8px;
  }
}

.projectGrid {
  max-height: 520px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  padding: 4px;
}

.projectCard {
  position: relative;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 4px 14px rgba(64, 158, 255, 0.16);
    transform: translateY(-2px);
  }

  &.isActive {
    border-color: #409eff;
    background: #f7faff;
    box-shadow: 0 4px 14px rgba(64, 158, 255, 0.18);
  }

  .activeBadge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #409eff;
    color: #fff;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .cardMain {
    padding: 16px;
    cursor: pointer;
    flex: 1;
    display: flex;
    gap: 12px;
    align-items: flex-start;

    .cardIconWrap {
      width: 40px;
      height: 40px;
      background: #eef5ff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .mindIcon {
        font-size: 22px;
      }
    }

    .cardDetails {
      flex: 1;
      min-width: 0;

      .cardTitle {
        font-size: 15px;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cardMeta {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 12px;
        color: #909399;

        .metaItem {
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          i {
            font-size: 13px;
          }
        }
      }
    }
  }

  .cardFooter {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 8px 12px;
    border-top: 1px solid #f2f6fc;
    background: #fafafa;

    .divider {
      color: #e4e7ed;
      font-size: 12px;
    }

    .footerBtn {
      padding: 0 4px;
      font-size: 12px;
      color: #606266;

      &:hover {
        color: #409eff;
      }

      &.openActive {
        color: #409eff;
        font-weight: 600;
      }

      &.dangerBtn {
        &:hover {
          color: #f56c6c;
        }
      }
    }
  }
}

.emptyBox {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 0;

  .emptyIcon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .emptyText {
    font-size: 14px;
    color: #909399;
  }
}
</style>
