<template>
  <Sidebar ref="sidebar" title="开始" width="300px">
    <div class="startSidebar" :class="{ isDark: isDark }">
      <!-- 0. 用户账号与云端项目空间 -->
      <div class="userWorkspaceCard" :class="{ notLoggedIn: !isLoggedIn }">
        <template v-if="isLoggedIn">
          <div class="userRow">
            <div class="userAvatar">{{ userInitial }}</div>
            <div class="userInfo">
              <div class="userNick">{{ userInfo.nickname || userInfo.username }}</div>
              <div class="currentProjText" :title="currentTitle">
                <i class="el-icon-document"></i> {{ currentTitle }}
              </div>
            </div>
            <el-button
              type="primary"
              size="mini"
              class="projLibBtn"
              @click="openProjectManager"
            >
              项目库
            </el-button>
          </div>
        </template>
        <template v-else>
          <div class="guestRow" @click="openAuthDialog">
            <div class="guestLeft">
              <span class="guestBadge">本地访客模式</span>
              <div class="guestTip">登录即可开通个人专属空间，保存和切换多个思维导图</div>
            </div>
            <el-button type="primary" size="mini" class="loginBtn">登录/注册</el-button>
          </div>
        </template>
      </div>

      <!-- 1. 文件与传输 -->
      <div class="sectionGroup">
        <div class="groupTitle">
          <span class="groupIcon el-icon-folder"></span>
          <span>文件与传输</span>
        </div>
        <!-- 自动保存状态指示 -->
        <div class="autoSaveNotice">
          <span class="pulseDot"></span>
          <span class="noticeText">
            {{
              isLoggedIn
                ? '已开启云端实时自动保存，随时切换导图或刷新均自动续接'
                : '本地实时自动保存已开启，刷新或重开均自动续接'
            }}
          </span>
        </div>
        <div class="btnGrid twoCols">
          <div
            class="actionCard projectLibCard fullSpanCard"
            @click="openProjectManager"
            title="查看、切换、新建或删除我的思维导图项目"
          >
            <div class="iconWrap"><span class="icon el-icon-folder-opened"></span></div>
            <div class="cardInfo">
              <span class="cardName">📂 我的项目库 (切换/新建/管理多个导图)</span>
            </div>
          </div>
          <div class="actionCard saveCard" @click="$bus.$emit('manualSave')" title="立即保存当前修改 (快捷键 Ctrl+S)">
            <div class="iconWrap"><span class="icon el-icon-circle-check"></span></div>
            <div class="cardInfo">
              <span class="cardName">立即保存</span>
              <span class="cardShortcut">Ctrl+S</span>
            </div>
          </div>
          <div class="actionCard" @click="$bus.$emit('createNewLocalFile')" title="新建空白思维导图">
            <div class="iconWrap"><span class="icon iconfont iconxinjian"></span></div>
            <div class="cardInfo"><span class="cardName">新建导图</span></div>
          </div>
          <div class="actionCard" @click="$bus.$emit('openLocalFile')" title="打开本地 .smm 文件">
            <div class="iconWrap"><span class="icon iconfont iconwenjian1"></span></div>
            <div class="cardInfo"><span class="cardName">打开本地</span></div>
          </div>
          <div class="actionCard" @click="$bus.$emit('openDirectory')" title="浏览本地文件夹工程目录">
            <div class="iconWrap"><span class="icon iconfont icondakai"></span></div>
            <div class="cardInfo"><span class="cardName">打开目录</span></div>
          </div>
          <div class="actionCard" @click="$bus.$emit('saveLocalFile')" title="另存为本地文件">
            <div class="iconWrap"><span class="icon iconfont iconlingcunwei"></span></div>
            <div class="cardInfo"><span class="cardName">另存为</span></div>
          </div>
          <div class="actionCard" @click="$bus.$emit('showImport')" title="导入 Markdown、XMind、MindManager 等文件">
            <div class="iconWrap"><span class="icon iconfont icondaoru"></span></div>
            <div class="cardInfo"><span class="cardName">导入文件</span></div>
          </div>
          <div class="actionCard primaryCard fullSpanCard" @click="$bus.$emit('showExport')" title="导出为图片、PDF、SVG、XMind等格式">
            <div class="iconWrap"><span class="icon iconfont iconexport"></span></div>
            <div class="cardInfo"><span class="cardName">导出导图 (图片 / PDF / Markdown / XMind)</span></div>
          </div>
        </div>
      </div>

      <!-- 2. 双语视图模式 -->
      <div class="sectionGroup" v-if="enableAi">
        <div class="groupTitle">
          <span class="groupIcon">🌐</span>
          <span>双语视图模式</span>
        </div>
        <div class="bilingualSelector">
          <div
            class="bilingualItem"
            :class="{ active: currentBilingualMode === 'zh' }"
            @click="switchBilingual('zh')"
          >
            <span class="flag">🇨🇳</span>
            <div class="modeText">
              <span class="modeTitle">纯中文模式</span>
              <span class="modeDesc">整张导图完全以中文呈现</span>
            </div>
            <i class="el-icon-check check" v-if="currentBilingualMode === 'zh'"></i>
          </div>
          <div
            class="bilingualItem"
            :class="{ active: currentBilingualMode === 'en' }"
            @click="switchBilingual('en')"
          >
            <span class="flag">🇬🇧</span>
            <div class="modeText">
              <span class="modeTitle">纯英文模式</span>
              <span class="modeDesc">还原无损原始英文结构</span>
            </div>
            <i class="el-icon-check check" v-if="currentBilingualMode === 'en'"></i>
          </div>
          <div
            class="bilingualItem"
            :class="{ active: currentBilingualMode === 'dual' }"
            @click="switchBilingual('dual')"
          >
            <span class="flag">📑</span>
            <div class="modeText">
              <span class="modeTitle">中英双语对照</span>
              <span class="modeDesc">主副双行对等对照，高效研读</span>
            </div>
            <i class="el-icon-check check" v-if="currentBilingualMode === 'dual'"></i>
          </div>
        </div>

        <el-button
          class="syncBtn"
          type="primary"
          plain
          size="small"
          :loading="isSyncingBilingual"
          @click="syncBilingual"
          style="width: 100%; margin-top: 10px;"
        >
          {{ isSyncingBilingual ? 'AI 正在批量互译新节点...' : '一键同步双语 (补全未翻节点)' }}
        </el-button>
      </div>

      <!-- 3. 视图与模式 -->
      <div class="sectionGroup">
        <div class="groupTitle">
          <span class="groupIcon el-icon-view"></span>
          <span>视图与模式</span>
        </div>
        <div
          class="actionCard fullWidthCard"
          @click="enterZenMode"
          title="全屏沉浸，专注笔记与思考 (按 Esc 退出)"
        >
          <div class="iconWrap"><span class="icon iconfont iconquanping"></span></div>
          <div class="cardInfo">
            <span class="cardName">专注模式 (Zen Mode)</span>
            <span class="cardShortcut">Esc 退出</span>
          </div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<script>
import Sidebar from './Sidebar.vue'
import { mapState, mapMutations } from 'vuex'
import { switchMindMapBilingualMode, syncUntranslatedNodes } from '@/utils/bilingualHelper'

export default {
  name: 'StartSidebar',
  components: {
    Sidebar
  },
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      isSyncingBilingual: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      activeSidebar: state => state.activeSidebar,
      enableAi: state => state.localConfig.enableAi,
      aiConfig: state => state.localConfig.aiConfig,
      currentBilingualMode: state => state.localConfig.bilingualMode || 'dual',
      token: state => state.token,
      userInfo: state => state.userInfo,
      currentProject: state => state.currentProject
    }),

    isLoggedIn() {
      return !!(this.token && this.userInfo)
    },

    userInitial() {
      const name = (this.userInfo && (this.userInfo.nickname || this.userInfo.username)) || 'U'
      return name.charAt(0).toUpperCase()
    },

    currentTitle() {
      return (this.currentProject && this.currentProject.title) || '未命名思维导图'
    }
  },
  mounted() {
    if (this.activeSidebar === 'start' && this.$refs.sidebar) {
      this.$refs.sidebar.show = true
    }
  },
  watch: {
    activeSidebar(val) {
      if (this.$refs.sidebar) {
        this.$refs.sidebar.show = val === 'start'
      }
    }
  },
  methods: {
    ...mapMutations([
      'setLocalConfig',
      'setAuthDialogVisible',
      'setProjectManagerVisible'
    ]),

    openAuthDialog() {
      this.$router.push('/login')
    },

    openProjectManager() {
      if (!this.isLoggedIn) {
        this.$message.info('请先登录账号，即可管理和保存多个云端思维导图项目')
        this.$router.push('/login')
        return
      }
      this.setProjectManagerVisible(true)
    },

    enterZenMode() {
      this.setLocalConfig({ isZenMode: true })
    },

    async switchBilingual(mode) {
      this.setLocalConfig({ bilingualMode: mode })
      const mindMap = this.mindMap || window.mindMap
      if (!mindMap) {
        this.$message.warning('思维导图未就绪')
        return
      }

      const fullData = mindMap.getData(true)
      const hasAnyTrans = root => {
        if (!root || !root.data) return false
        if (root.data.text_trans) return true
        if (root.children && root.children.length > 0) {
          return root.children.some(hasAnyTrans)
        }
        return false
      }

      if ((mode === 'zh' || mode === 'dual') && fullData && fullData.root && !hasAnyTrans(fullData.root)) {
        this.$message.info('检测到当前导图尚未生成翻译，正在调用 AI 快速补全双语...')
        await this.syncBilingual()
        return
      }

      switchMindMapBilingualMode(mindMap, mode)

      const labels = {
        zh: '🇨🇳 纯中文版（全图中文展示）',
        en: '🇬🇧 纯英文原版（全图英文展示）',
        dual: '📑 中英双语对照版（双行对照）'
      }
      this.$message.success(`已切换至：${labels[mode] || mode}`)
    },

    async syncBilingual() {
      if (this.isSyncingBilingual) return
      const mindMap = this.mindMap || window.mindMap
      if (!mindMap) {
        this.$message.warning('思维导图未就绪')
        return
      }
      this.isSyncingBilingual = true
      try {
        const mode = this.currentBilingualMode
        const count = await syncUntranslatedNodes(mindMap, this.aiConfig, mode)
        if (count > 0) {
          this.$message.success(`已成功完成 ${count} 个新节点的双语翻译同步！`)
        } else {
          this.$message.info('当前导图所有节点均已具备双语翻译，无需更新')
        }
      } catch (err) {
        console.error('同步双语失败:', err)
        this.$message.error('同步双语失败，请检查 AI 模型配置')
      } finally {
        this.isSyncingBilingual = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.startSidebar {
  padding: 16px 14px 40px;
  box-sizing: border-box;

  .userWorkspaceCard {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 16px;

    &.notLoggedIn {
      background: #f0f7ff;
      border-color: #d0e5ff;
    }

    .userRow {
      display: flex;
      align-items: center;
      gap: 10px;

      .userAvatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: #ffffff;
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .userInfo {
        flex: 1;
        min-width: 0;

        .userNick {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .currentProjText {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
      }

      .projLibBtn {
        padding: 5px 10px;
        font-size: 12px;
      }
    }

    .guestRow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;

      .guestLeft {
        flex: 1;
        min-width: 0;

        .guestBadge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          color: #2563eb;
          background: #e0edff;
          padding: 1px 6px;
          border-radius: 4px;
          margin-bottom: 3px;
        }

        .guestTip {
          font-size: 11px;
          color: #64748b;
          line-height: 1.3;
        }
      }

      .loginBtn {
        padding: 6px 12px;
        font-size: 12px;
        flex-shrink: 0;
      }
    }
  }

  .projectLibCard {
    background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%) !important;
    border-color: #bfdbfe !important;

    .iconWrap {
      background: #3b82f6 !important;
      color: #ffffff !important;
    }

    .cardName {
      color: #1e3a8a !important;
      font-weight: 600 !important;
    }

    &:hover {
      border-color: #3b82f6 !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
    }
  }

  .sectionGroup {
    margin-bottom: 22px;

    .groupTitle {
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 10px;
      padding-left: 2px;

      .groupIcon {
        font-size: 15px;
        margin-right: 6px;
        color: #2563eb;
      }
    }
  }

  .autoSaveNotice {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 10px;
    font-size: 11px;
    color: #166534;
    line-height: 1.4;

    .pulseDot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
    }
  }

  .btnGrid {
    display: grid;
    gap: 8px;

    &.twoCols {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .saveCard {
    background: #f0fdf4 !important;
    border-color: #86efac !important;

    .iconWrap .icon {
      color: #16a34a !important;
      font-size: 20px;
    }

    .cardName {
      color: #15803d !important;
    }

    &:hover {
      background: #dcfce7 !important;
      border-color: #4ade80 !important;
    }
  }

  .fullSpanCard {
    grid-column: span 2;
  }

  .actionCard {
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;

    &:hover {
      background: #eff6ff;
      border-color: #93c5fd;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);

      .iconWrap .icon {
        color: #2563eb;
      }

      .cardName {
        color: #1d4ed8;
      }
    }

    &.primaryCard {
      background: #f0fdf4;
      border-color: #bbf7d0;

      .iconWrap .icon {
        color: #16a34a;
      }

      .cardName {
        color: #15803d;
      }

      &:hover {
        background: #dcfce7;
        border-color: #86efac;
      }
    }

    &.fullWidthCard {
      width: 100%;
      padding: 12px 14px;
    }

    .iconWrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin-right: 8px;
      flex-shrink: 0;

      .icon {
        font-size: 18px;
        color: #475569;
        transition: color 0.2s;
      }
    }

    .cardInfo {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      overflow: hidden;

      .cardName {
        font-size: 13px;
        font-weight: 600;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cardShortcut {
        font-size: 11px;
        color: #94a3b8;
        font-family: inherit;
        margin-top: 2px;
      }
    }
  }

  // 双语选择列表
  .bilingualSelector {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .bilingualItem {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s;

      .flag {
        font-size: 20px;
        margin-right: 10px;
      }

      .modeText {
        display: flex;
        flex-direction: column;
        flex-grow: 1;

        .modeTitle {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .modeDesc {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
      }

      .check {
        color: #2563eb;
        font-size: 15px;
        font-weight: bold;
      }

      &:hover {
        border-color: #93c5fd;
        background: #eff6ff;
      }

      &.active {
        border-color: #2563eb;
        background: #eff6ff;
        box-shadow: 0 1px 4px rgba(37, 99, 235, 0.12);

        .modeTitle {
          color: #1d4ed8;
        }
      }
    }
  }

  // 暗色模式
  &.isDark {
    .autoSaveNotice {
      background: #064e3b;
      border-color: #047857;
      color: #a7f3d0;

      .pulseDot {
        background: #34d399;
        box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.2);
      }
    }

    .saveCard {
      background: #064e3b !important;
      border-color: #059669 !important;

      .iconWrap .icon {
        color: #6ee7b7 !important;
      }

      .cardName {
        color: #a7f3d0 !important;
      }

      &:hover {
        background: #065f46 !important;
        border-color: #10b981 !important;
      }
    }

    .actionCard {
      background: #1e293b;
      border-color: #334155;

      .iconWrap .icon {
        color: #94a3b8;
      }

      .cardInfo .cardName {
        color: #f1f5f9;
      }

      .cardInfo .cardShortcut {
        color: #64748b;
      }

      &:hover {
        background: #1e3a8a;
        border-color: #3b82f6;

        .iconWrap .icon {
          color: #93c5fd;
        }

        .cardInfo .cardName {
          color: #ffffff;
        }
      }

      &.primaryCard {
        background: #064e3b;
        border-color: #059669;

        .iconWrap .icon {
          color: #6ee7b7;
        }

        .cardName {
          color: #a7f3d0;
        }

        &:hover {
          background: #065f46;
          border-color: #10b981;
        }
      }
    }

    .bilingualSelector {
      .bilingualItem {
        background: #1e293b;
        border-color: #334155;

        .modeText .modeTitle {
          color: #f1f5f9;
        }

        .modeText .modeDesc {
          color: #94a3b8;
        }

        &:hover {
          background: #1e3a8a;
          border-color: #3b82f6;
        }

        &.active {
          background: #172554;
          border-color: #3b82f6;

          .modeText .modeTitle {
            color: #93c5fd;
          }
        }
      }
    }
  }
}
</style>
