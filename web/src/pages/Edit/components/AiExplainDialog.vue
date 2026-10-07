<template>
  <el-dialog
    class="aiExplainDialog"
    :custom-class="'aiExplainDialogInner' + (isDark ? ' isDark' : '')"
    :title="$t('aiExplain.title') || '✨ AI 概念释义与知识助手'"
    :visible.sync="dialogVisible"
    :width="isMobile ? '94%' : '720px'"
    :top="isMobile ? '12px' : '7vh'"
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="aiExplainContainer" :class="{ isDark: isDark }">
      <el-tabs v-model="activeTab" class="aiTabs">
        <!-- Tab 1: AI 智能释义 -->
        <el-tab-pane label="AI 智能释义" name="explain">
          <div class="explainContainer customScrollbar">
            <!-- 英雄词条卡片 (Hero Spotlight Card) -->
            <div class="explainHeroCard">
              <div class="heroHeaderRow">
                <div class="badgeAndBreadcrumb">
                  <span class="aiPillBadge">
                    <i class="el-icon-magic-stick"></i> 划词释义
                  </span>
                  <span class="nodeBreadcrumb" v-if="targetNode" :title="nodeTextSummary">
                    <i class="el-icon-folder"></i> 节点：{{ nodeTextSummary }}
                  </span>
                </div>
                <div class="heroActions">
                  <el-button
                    type="text"
                    size="mini"
                    class="editTermBtn"
                    :icon="showEditTerm ? 'el-icon-check' : 'el-icon-edit-outline'"
                    @click="showEditTerm = !showEditTerm"
                  >
                    {{ showEditTerm ? '完成修改' : '修改词条' }}
                  </el-button>
                </div>
              </div>

              <!-- 词条展示 / 编辑 -->
              <div class="termDisplayWrap" v-if="!showEditTerm">
                <div class="termTitle" :title="currentTerm">
                  {{ currentTerm || '（请选择或输入要释义的词条）' }}
                </div>
              </div>
              <div class="termEditWrap" v-else>
                <el-input
                  size="small"
                  v-model="currentTerm"
                  placeholder="请输入要释义的词条或短语..."
                  clearable
                  @change="onTermChange"
                  @keyup.enter.native="showEditTerm = false"
                ></el-input>
              </div>
            </div>

            <!-- 控制与配置工具栏 (Control Bar) -->
            <div class="controlToolbar">
              <div class="toolbarLeft">
                <span class="toolLabel">释义风格：</span>
                <el-select
                  v-model="selectedPreset"
                  size="small"
                  class="presetSelect"
                  @change="onPresetChange"
                >
                  <el-option
                    v-for="item in explanationPresets"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  ></el-option>
                </el-select>
                <el-button
                  type="text"
                  size="small"
                  class="customPromptToggleBtn"
                  :icon="showCustomPromptEditor ? 'el-icon-arrow-up' : 'el-icon-setting'"
                  @click="showCustomPromptEditor = !showCustomPromptEditor"
                >
                  {{ showCustomPromptEditor ? '收起模版' : '自定义模版' }}
                </el-button>
              </div>

              <div class="toolbarRight">
                <!-- 自动同步徽标 -->
                <el-tooltip
                  :content="localConfig.enableAiNoteBox ? (localConfig.aiNoteRecordMode === 'auto' ? '自动记录开启：释义生成完成后将自动保存到该节点的备注中' : '手动记录模式：释义生成后由您确认并点击保存') : 'AI备注框未开启（可在系统设置中开启）'"
                  placement="top"
                >
                  <span
                    class="syncStatusChip"
                    :class="{
                      auto: localConfig.enableAiNoteBox && localConfig.aiNoteRecordMode === 'auto',
                      manual: localConfig.enableAiNoteBox && localConfig.aiNoteRecordMode === 'manual',
                      disabled: !localConfig.enableAiNoteBox
                    }"
                  >
                    <i :class="localConfig.enableAiNoteBox && localConfig.aiNoteRecordMode === 'auto' ? 'el-icon-circle-check' : 'el-icon-info'"></i>
                    {{ localConfig.enableAiNoteBox && localConfig.aiNoteRecordMode === 'auto' ? '自动同步备注' : '手动保存模式' }}
                  </span>
                </el-tooltip>

                <!-- 生成按钮 -->
                <el-button
                  v-if="!isGenerating"
                  type="primary"
                  size="small"
                  class="generateActionBtn"
                  icon="el-icon-refresh-right"
                  @click="startExplain"
                  :disabled="!currentTerm"
                >
                  {{ hasGenerated ? '重新释义' : '开始 AI 释义' }}
                </el-button>
                <el-button
                  v-else
                  type="danger"
                  size="small"
                  class="stopActionBtn"
                  icon="el-icon-video-pause"
                  @click="stopExplain"
                >
                  停止生成
                </el-button>
              </div>
            </div>

            <!-- 可折叠的自定义 Prompt 编辑面板 -->
            <el-collapse-transition>
              <div v-show="showCustomPromptEditor || selectedPreset === 'custom'" class="promptEditorBox">
                <el-input
                  type="textarea"
                  :rows="3"
                  v-model="activePromptTemplate"
                  placeholder="可使用变量：{text}词条, {nodeText}所属节点, {topic}导图中心主题"
                ></el-input>
                <div class="promptTips">
                  <span>支持变量：<code>{text}</code>(释义词条)、<code>{nodeText}</code>(所属节点)、<code>{topic}</code>(导图中心主题)</span>
                  <el-button size="mini" type="text" @click="resetToDefaultPrompt">恢复当前预设模版</el-button>
                </div>
              </div>
            </el-collapse-transition>

            <!-- 核心释义工作台卡片 (Response Workspace Card) -->
            <div class="resultCard" v-if="isGenerating || explanationResult">
              <div class="resultCardHeader">
                <div class="resultHeaderLeft">
                  <i class="el-icon-reading headerIcon"></i>
                  <span class="headerTitle">释义内容</span>
                  <span class="statusTag generating" v-if="isGenerating">
                    <i class="el-icon-loading"></i> AI 正在深度思考生成...
                  </span>
                  <span class="statusTag saved" v-else-if="isSavedToNote">
                    <i class="el-icon-circle-check"></i> 已保存至节点备注
                  </span>
                </div>
                <div class="resultHeaderRight">
                  <el-button
                    type="text"
                    size="mini"
                    class="actionGhostBtn"
                    :icon="isEditResult ? 'el-icon-view' : 'el-icon-edit-outline'"
                    @click="isEditResult = !isEditResult"
                    v-if="!isGenerating && explanationResult"
                  >
                    {{ isEditResult ? '预览排版' : '编辑文本' }}
                  </el-button>
                  <el-button
                    type="text"
                    size="mini"
                    class="actionGhostBtn"
                    icon="el-icon-document-copy"
                    @click="copyResult"
                    v-if="explanationResult"
                  >
                    复制内容
                  </el-button>
                </div>
              </div>

              <div class="resultCardBody">
                <!-- Markdown 渲染视图 -->
                <div
                  v-if="!isEditResult"
                  class="markdownContent customScrollbar"
                  v-html="renderedMarkdown"
                ></div>
                <!-- 文本编辑视图 -->
                <div v-else class="editResultWrap">
                  <el-input
                    type="textarea"
                    :rows="9"
                    v-model="explanationResult"
                    placeholder="可在此直接修改微调释义内容..."
                  ></el-input>
                </div>
              </div>

              <!-- 底部操作与提示栏 -->
              <div class="resultCardFooter" v-if="!isGenerating && explanationResult">
                <div class="footerHintText">
                  <span v-if="isSavedToNote">
                    <i class="el-icon-check"></i> 释义已同步至当前节点备注，可在思维导图悬停该节点查看卡片
                  </span>
                  <span v-else-if="localConfig.enableAiNoteBox">
                    <i class="el-icon-info"></i> 满意本次释义？可点击右侧按钮保存至当前节点的备注框
                  </span>
                  <span v-else>
                    <i class="el-icon-warning-outline"></i> 系统设置中未开启 AI 备注框功能
                  </span>
                </div>
                <div class="footerActionGroup">
                  <el-button
                    type="primary"
                    size="small"
                    class="saveNoteCtaBtn"
                    icon="el-icon-notebook-2"
                    @click="manualSaveToNote"
                    :disabled="!localConfig.enableAiNoteBox"
                  >
                    {{ isSavedToNote ? '更新节点备注内容' : '保存至当前节点备注' }}
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 空态引导 (未生成时) -->
            <div class="explainEmptyState" v-else-if="!isGenerating">
              <div class="emptyIconWrap">
                <i class="el-icon-magic-stick"></i>
              </div>
              <div class="emptyTitle">准备就绪，即刻开始智能概念拆解</div>
              <div class="emptyDesc">点击上方「开始 AI 释义」，AI 将结合所属节点与中心主题为您输出生动精准的释义</div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 该节点的释义备注历史记录 -->
        <el-tab-pane :label="`本节点释义备注 (${nodeAiNotes.length})`" name="history">
          <div class="historyContainer customScrollbar">
            <div class="historyHeader">
              <div class="summary">
                当前节点包含 <b>{{ nodeAiNotes.length }}</b> 条 AI 释义卡片
              </div>
              <div class="btns">
                <el-button
                  size="mini"
                  type="primary"
                  plain
                  icon="el-icon-plus"
                  @click="showAddCustomNoteDialog = true"
                >
                  手动新增记录
                </el-button>
                <el-button
                  size="mini"
                  type="danger"
                  plain
                  icon="el-icon-delete"
                  :disabled="nodeAiNotes.length === 0"
                  @click="handleClearAllNotes"
                >
                  清空全部
                </el-button>
              </div>
            </div>

            <!-- 历史列表 -->
            <div v-if="nodeAiNotes.length > 0" class="historyList">
              <div
                v-for="item in nodeAiNotes"
                :key="item.id"
                class="historyItemCard"
              >
                <div class="itemCardHeader">
                  <div class="itemTermGroup">
                    <span class="termTitle">📌 {{ item.term }}</span>
                    <span class="itemTime">{{ item.time }}</span>
                    <el-tag size="mini" effect="plain" type="info" v-if="item.presetName" class="presetTag">
                      {{ item.presetName }}
                    </el-tag>
                  </div>
                  <div class="itemActions">
                    <el-button
                      type="text"
                      size="mini"
                      icon="el-icon-edit"
                      @click="startEditHistoryItem(item)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      type="text"
                      size="mini"
                      icon="el-icon-document-copy"
                      @click="copyText(item.content)"
                    >
                      复制
                    </el-button>
                    <el-button
                      type="text"
                      size="mini"
                      icon="el-icon-delete"
                      class="deleteBtn"
                      @click="handleDeleteNote(item.id)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>

                <!-- 编辑态 -->
                <div v-if="editingNoteId === item.id" class="itemEditBox">
                  <el-input
                    size="small"
                    v-model="editingTerm"
                    placeholder="词条名称"
                    style="margin-bottom: 8px;"
                  ></el-input>
                  <el-input
                    type="textarea"
                    :rows="4"
                    v-model="editingContent"
                    placeholder="释义内容"
                    style="margin-bottom: 8px;"
                  ></el-input>
                  <div class="editActions">
                    <el-button size="mini" @click="editingNoteId = ''">取消</el-button>
                    <el-button size="mini" type="primary" @click="saveEditHistoryItem">保存修改</el-button>
                  </div>
                </div>

                <!-- 展示态 -->
                <div v-else class="itemContent customScrollbar" v-html="renderNoteMarkdown(item.content)"></div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="emptyNotes">
              <i class="el-icon-document emptyDocIcon"></i>
              <p class="emptyTitle">该节点暂无任何 AI 释义备注记录</p>
              <el-button size="small" type="primary" plain @click="activeTab = 'explain'">立即进行 AI 释义</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 手动新增释义弹窗 -->
    <el-dialog
      title="手动新增节点释义备注"
      :visible.sync="showAddCustomNoteDialog"
      :width="isMobile ? '92%' : '500px'"
      append-to-body
      :custom-class="isDark ? 'isDark' : ''"
    >
      <el-form label-width="80px" size="small">
        <el-form-item label="释义词条">
          <el-input v-model="newCustomTerm" placeholder="例如：经纬度、OKR、光合作用"></el-input>
        </el-form-item>
        <el-form-item label="释义内容">
          <el-input
            type="textarea"
            :rows="6"
            v-model="newCustomContent"
            placeholder="支持输入 Markdown 格式内容..."
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button size="small" @click="showAddCustomNoteDialog = false">取消</el-button>
        <el-button size="small" type="primary" @click="confirmAddCustomNote">保存记录</el-button>
      </span>
    </el-dialog>

    <div slot="footer" class="dialog-footer">
      <el-button size="small" @click="dialogVisible = false">{{ $t('ai.cancel') || '关闭' }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState } from 'vuex'
import MarkdownIt from 'markdown-it'
import Ai from '@/utils/ai'
import {
  AI_EXPLANATION_PRESETS,
  formatPrompt
} from '@/utils/aiPrompts'
import {
  getAiNotes,
  addAiNote,
  updateAiNote,
  deleteAiNote,
  clearAllAiNotes
} from '@/utils/aiNoteHelper'
import { isMobile } from 'simple-mind-map/src/utils/index'

let md = new MarkdownIt()

export default {
  name: 'AiExplainDialog',
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      isMobile: isMobile(),
      dialogVisible: false,
      activeTab: 'explain',
      targetNode: null,
      currentTerm: '',
      showEditTerm: false,

      explanationPresets: AI_EXPLANATION_PRESETS,
      selectedPreset: 'plain',
      showCustomPromptEditor: false,
      activePromptTemplate: '',

      isGenerating: false,
      hasGenerated: false,
      explanationResult: '',
      isEditResult: false,
      isSavedToNote: false,
      aiInstance: null,

      nodeAiNotes: [],

      // 历史记录编辑
      editingNoteId: '',
      editingTerm: '',
      editingContent: '',

      // 手动新增记录
      showAddCustomNoteDialog: false,
      newCustomTerm: '',
      newCustomContent: ''
    }
  },
  computed: {
    ...mapState({
      aiConfig: state => state.aiConfig,
      localConfig: state => state.localConfig,
      isDark: state => state.localConfig.isDark
    }),

    nodeTextSummary() {
      if (!this.targetNode) return '无'
      const text = this.targetNode.getData('text') || ''
      return text.replace(/<[^>]+>/g, '').trim() || '（空文本节点）'
    },

    mindMapTopic() {
      if (!this.mindMap) return ''
      const data = this.mindMap.getData()
      if (data && data.data && data.data.text) {
        return data.data.text.replace(/<[^>]+>/g, '').trim()
      }
      return ''
    },

    renderedMarkdown() {
      if (!this.explanationResult) return ''
      return md.render(this.explanationResult)
    }
  },
  watch: {
    dialogVisible(val) {
      if (!val) {
        this.stopExplain()
      }
    }
  },
  created() {
    this.$bus.$on('ai_explain', this.handleAiExplainEvent)
    this.$bus.$on('open_ai_note_box', this.handleOpenAiNoteBoxEvent)
    this.initDefaultPreset()
  },
  beforeDestroy() {
    this.$bus.$off('ai_explain', this.handleAiExplainEvent)
    this.$bus.$off('open_ai_note_box', this.handleOpenAiNoteBoxEvent)
    this.stopExplain()
  },
  methods: {
    initDefaultPreset() {
      const presetId = this.localConfig.aiExplanationPromptPreset || 'plain'
      this.selectedPreset = presetId
      const customPrompt = this.localConfig.aiExplanationCustomPrompt
      if (customPrompt) {
        this.activePromptTemplate = customPrompt
      } else {
        const p = this.explanationPresets.find(item => item.id === presetId)
        this.activePromptTemplate = p ? p.template : ''
      }
    },

    handleAiExplainEvent({ text, node }) {
      this.activeTab = 'explain'
      this.currentTerm = text ? text.trim() : ''
      this.targetNode = node || null
      this.showEditTerm = false
      this.isEditResult = false
      this.isSavedToNote = false
      this.explanationResult = ''
      this.hasGenerated = false
      this.loadNodeAiNotes()
      this.dialogVisible = true

      // 打开后自动触发一次生成
      this.$nextTick(() => {
        if (this.currentTerm) {
          this.startExplain()
        }
      })
    },

    handleOpenAiNoteBoxEvent(payload) {
      const node = payload && payload.node ? payload.node : payload
      this.targetNode = node || null
      this.loadNodeAiNotes()
      this.activeTab = 'history'
      this.dialogVisible = true
    },

    loadNodeAiNotes() {
      if (!this.targetNode) {
        this.nodeAiNotes = []
        return
      }
      this.nodeAiNotes = getAiNotes(this.targetNode)
    },

    onTermChange() {
      this.hasGenerated = false
      this.isSavedToNote = false
    },

    onPresetChange(id) {
      const p = this.explanationPresets.find(item => item.id === id)
      if (p) {
        this.activePromptTemplate = p.template
      }
    },

    resetToDefaultPrompt() {
      const p = this.explanationPresets.find(item => item.id === this.selectedPreset)
      if (p) {
        this.activePromptTemplate = p.template
        this.$message.success('已恢复为当前预设的标准模版')
      }
    },

    renderNoteMarkdown(content) {
      if (!content) return ''
      return md.render(content)
    },

    // 组装最终发往模型的 Prompt
    buildPrompt() {
      let template = this.activePromptTemplate
      if (!template) {
        const preset = this.explanationPresets.find(p => p.id === this.selectedPreset)
        template = preset ? preset.template : ''
      }
      return formatPrompt(template, {
        text: this.currentTerm,
        nodeText: this.nodeTextSummary,
        topic: this.mindMapTopic
      })
    },

    async startExplain() {
      if (!this.currentTerm.trim()) {
        this.$message.warning('请输入或划选要释义的词条内容')
        return
      }

      this.isGenerating = true
      this.hasGenerated = false
      this.explanationResult = ''
      this.isSavedToNote = false

      const prompt = this.buildPrompt()

      this.aiInstance = new Ai()
      this.aiInstance.init('huoshan', this.aiConfig)

      try {
        await this.aiInstance.request(
          {
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          content => {
            this.explanationResult = content
          },
          content => {
            this.explanationResult = content
            this.isGenerating = false
            this.hasGenerated = true
            this.onExplainFinished()
          },
          err => {
            console.error('AI 解释出错:', err)
            this.isGenerating = false
            this.$message.error('AI 解释请求失败，请检查模型接入配置')
          }
        )
      } catch (e) {
        console.error(e)
        this.isGenerating = false
      }
    },

    stopExplain() {
      if (this.aiInstance && this.isGenerating) {
        this.aiInstance.stop()
        this.isGenerating = false
        this.$message.info('已停止生成')
      }
    },

    // 释义生成结束回调
    onExplainFinished() {
      // 检查系统设置中关于 AI 备注框与记录模式
      if (this.localConfig.enableAiNoteBox) {
        if (this.localConfig.aiNoteRecordMode === 'auto') {
          // 自动记录模式：立即保存至节点备注
          this.saveToNodeNote(false)
          this.$message.success(`已自动将“${this.currentTerm}”释义记录至节点备注`)
        } else {
          // 手动记录模式：提示用户可手动保存
          this.$message.success('AI 释义完成，您可以编辑或点击下方按钮保存至节点备注')
        }
      }
    },

    // 手动点击保存到备注
    manualSaveToNote() {
      this.saveToNodeNote(true)
    },

    saveToNodeNote(isManual = true) {
      if (!this.targetNode) {
        this.$message.warning('未找到关联的节点')
        return
      }
      if (!this.explanationResult.trim()) {
        this.$message.warning('释义内容为空')
        return
      }

      const presetItem = this.explanationPresets.find(p => p.id === this.selectedPreset)
      const presetName = presetItem ? presetItem.name.split('（')[0] : '自定义'

      const updatedList = addAiNote(this.targetNode, {
        term: this.currentTerm,
        content: this.explanationResult,
        preset: this.selectedPreset,
        presetName
      })

      this.nodeAiNotes = updatedList
      this.isSavedToNote = true
      if (isManual) {
        this.$message.success(`已成功保存“${this.currentTerm}”释义至节点备注框！`)
      }
    },

    copyResult() {
      this.copyText(this.explanationResult)
    },

    copyText(text) {
      if (!text) return
      navigator.clipboard
        ? navigator.clipboard.writeText(text).then(() => this.$message.success('已复制到剪贴板'))
        : this.$message.info('内容已选定，请按 Ctrl+C 复制')
    },

    // 历史记录相关方法
    startEditHistoryItem(item) {
      this.editingNoteId = item.id
      this.editingTerm = item.term
      this.editingContent = item.content
    },

    saveEditHistoryItem() {
      if (!this.editingTerm.trim()) {
        this.$message.warning('词条名称不能为空')
        return
      }
      const updatedList = updateAiNote(this.targetNode, this.editingNoteId, {
        term: this.editingTerm,
        content: this.editingContent
      })
      this.nodeAiNotes = updatedList
      this.editingNoteId = ''
      this.$message.success('备注已更新保存')
    },

    handleDeleteNote(noteId) {
      this.$confirm('确定要删除这条释义记录吗？', '提示', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const updatedList = deleteAiNote(this.targetNode, noteId)
        this.nodeAiNotes = updatedList
        this.$message.success('已删除该释义记录')
      }).catch(() => {})
    },

    handleClearAllNotes() {
      this.$confirm('确定要清空该节点的全部 AI 释义记录吗？（普通手动备注将被保留）', '清空确认', {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'danger'
      }).then(() => {
        clearAllAiNotes(this.targetNode)
        this.nodeAiNotes = []
        this.$message.success('已清空该节点全部释义记录')
      }).catch(() => {})
    },

    confirmAddCustomNote() {
      if (!this.newCustomTerm.trim() || !this.newCustomContent.trim()) {
        this.$message.warning('请填写完整的词条和释义内容')
        return
      }
      const updatedList = addAiNote(this.targetNode, {
        term: this.newCustomTerm,
        content: this.newCustomContent,
        preset: 'manual',
        presetName: '手动录入'
      })
      this.nodeAiNotes = updatedList
      this.newCustomTerm = ''
      this.newCustomContent = ''
      this.showAddCustomNoteDialog = false
      this.$message.success('已添加释义记录')
    }
  }
}
</script>

<style lang="less" scoped>
.aiExplainDialog {
  /deep/ .el-dialog__body {
    padding: 12px 24px 20px;
  }

  /deep/ .aiExplainDialogInner.isDark {
    background-color: #22262c !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);

    .el-dialog__title {
      color: #f1f5f9;
    }

    .el-dialog__headerbtn .el-dialog__close {
      color: #94a3b8;

      &:hover {
        color: #fff;
      }
    }
  }

  .aiTabs {
    /deep/ .el-tabs__header {
      margin-bottom: 16px;
    }

    /deep/ .el-tabs__item {
      font-size: 14px;
      font-weight: 500;
    }
  }

  .explainContainer {
    max-height: 560px;
    overflow-y: auto;
    padding-right: 4px;
  }

  /* 英雄词条卡片 */
  .explainHeroCard {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 18px;
    margin-bottom: 14px;
    transition: all 0.25s ease;

    .heroHeaderRow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .badgeAndBreadcrumb {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        overflow: hidden;

        .aiPillBadge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
          padding: 2px 8px;
          border-radius: 12px;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }

        .nodeBreadcrumb {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          i {
            margin-right: 2px;
          }
        }
      }

      .heroActions {
        flex-shrink: 0;
        margin-left: 10px;

        .editTermBtn {
          font-size: 12px;
          color: #3b82f6;
          padding: 0;

          &:hover {
            color: #1d4ed8;
          }
        }
      }
    }

    .termDisplayWrap {
      .termTitle {
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
        line-height: 1.5;
        word-break: break-word;
      }
    }

    .termEditWrap {
      margin-top: 4px;
    }
  }

  /* 统一控制栏 */
  .controlToolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f1f5f9;
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 14px;
    gap: 12px;

    .toolbarLeft {
      display: flex;
      align-items: center;
      gap: 8px;

      .toolLabel {
        font-size: 13px;
        font-weight: 500;
        color: #475569;
        flex-shrink: 0;
      }

      .presetSelect {
        width: 175px;

        /deep/ .el-input__inner {
          border-radius: 6px;
          height: 32px;
          line-height: 32px;
        }
      }

      .customPromptToggleBtn {
        font-size: 12px;
        color: #64748b;

        &:hover {
          color: #2563eb;
        }
      }
    }

    .toolbarRight {
      display: flex;
      align-items: center;
      gap: 10px;

      .syncStatusChip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 12px;
        cursor: default;
        transition: all 0.2s;

        &.auto {
          color: #16a34a;
          background: #dcfce7;
          border: 1px solid #bbf7d0;
        }

        &.manual {
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        &.disabled {
          color: #94a3b8;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
      }

      .generateActionBtn {
        border-radius: 6px;
        font-weight: 500;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);

        &:hover {
          opacity: 0.92;
        }
      }

      .stopActionBtn {
        border-radius: 6px;
        font-weight: 500;
      }
    }
  }

  /* 自定义 Prompt 编辑区 */
  .promptEditorBox {
    margin-bottom: 14px;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;

    .promptTips {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      font-size: 11px;
      color: #94a3b8;

      code {
        background: #e2e8f0;
        padding: 1px 4px;
        border-radius: 3px;
        color: #2563eb;
      }
    }
  }

  /* 核心释义工作台卡片 */
  .resultCard {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    transition: all 0.25s ease;

    .resultCardHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      background: rgba(0, 0, 0, 0.015);

      .resultHeaderLeft {
        display: flex;
        align-items: center;
        gap: 8px;

        .headerIcon {
          font-size: 15px;
          color: #3b82f6;
        }

        .headerTitle {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .statusTag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;

          &.generating {
            color: #d97706;
            background: #fef3c7;
            border: 1px solid #fde68a;
          }

          &.saved {
            color: #15803d;
            background: #dcfce7;
            border: 1px solid #bbf7d0;
          }
        }
      }

      .resultHeaderRight {
        display: flex;
        gap: 8px;

        .actionGhostBtn {
          font-size: 12px;
          color: #64748b;
          padding: 4px 8px;
          border-radius: 4px;

          &:hover {
            color: #2563eb;
            background: #eff6ff;
          }
        }
      }
    }

    .resultCardBody {
      padding: 16px 20px;

      .markdownContent {
        line-height: 1.75;
        font-size: 14px;
        color: #1e293b;

        /deep/ p {
          margin-bottom: 12px;

          &:last-child {
            margin-bottom: 0;
          }
        }

        /deep/ strong,
        /deep/ b {
          color: #2563eb;
          font-weight: 600;
        }

        /deep/ h1,
        /deep/ h2,
        /deep/ h3 {
          margin: 14px 0 8px;
          font-weight: 600;
          color: #0f172a;
        }

        /deep/ h2 {
          font-size: 15px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 4px;
        }

        /deep/ h3 {
          font-size: 14px;
        }

        /deep/ ul,
        /deep/ ol {
          padding-left: 20px;
          margin-bottom: 12px;

          li {
            margin-bottom: 4px;
          }
        }

        /deep/ blockquote {
          margin: 12px 0;
          padding: 8px 14px;
          border-left: 3px solid #3b82f6;
          background: #f8fafc;
          border-radius: 0 6px 6px 0;
          color: #475569;
          font-size: 13px;
        }

        /deep/ code {
          background: #f1f5f9;
          color: #2563eb;
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 12px;
        }
      }

      .editResultWrap {
        /deep/ .el-textarea__inner {
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
          border-radius: 6px;
        }
      }
    }

    .resultCardFooter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;

      .footerHintText {
        font-size: 12px;
        color: #64748b;

        i {
          color: #10b981;
          margin-right: 3px;
        }
      }

      .footerActionGroup {
        .saveNoteCtaBtn {
          border-radius: 6px;
          font-weight: 500;
          background: #10b981;
          border-color: #10b981;

          &:hover {
            background: #059669;
            border-color: #059669;
          }
        }
      }
    }
  }

  /* 空态引导 */
  .explainEmptyState {
    text-align: center;
    padding: 48px 20px;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    background: #f8fafc;

    .emptyIconWrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #e0e7ff;
      color: #4f46e5;
      font-size: 26px;
      margin-bottom: 12px;
    }

    .emptyTitle {
      font-size: 15px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }

    .emptyDesc {
      font-size: 13px;
      color: #94a3b8;
      max-width: 360px;
      margin: 0 auto;
      line-height: 1.5;
    }
  }

  /* 历史记录 Tab 样式 */
  .historyContainer {
    max-height: 560px;
    overflow-y: auto;
    padding-right: 4px;

    .historyHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;

      .summary {
        font-size: 13px;
        color: #64748b;

        b {
          color: #2563eb;
        }
      }
    }

    .historyList {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .historyItemCard {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 16px;
        transition: all 0.2s ease;

        &:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .itemCardHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .itemTermGroup {
            display: flex;
            align-items: center;
            gap: 8px;

            .termTitle {
              font-size: 14px;
              font-weight: 600;
              color: #1e293b;
            }

            .itemTime {
              font-size: 11px;
              color: #94a3b8;
            }

            .presetTag {
              font-size: 11px;
              height: 20px;
              line-height: 18px;
              padding: 0 6px;
            }
          }

          .itemActions {
            .deleteBtn {
              color: #ef4444;

              &:hover {
                color: #dc2626;
              }
            }
          }
        }

        .itemContent {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
          max-height: 140px;
          overflow-y: auto;
          background: #ffffff;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #f1f5f9;

          /deep/ p {
            margin-bottom: 6px;
            &:last-child {
              margin-bottom: 0;
            }
          }

          /deep/ strong,
          /deep/ b {
            color: #2563eb;
          }
        }

        .itemEditBox {
          margin-top: 8px;

          .editActions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }
        }
      }
    }

    .emptyNotes {
      text-align: center;
      padding: 60px 20px;

      .emptyDocIcon {
        font-size: 42px;
        color: #cbd5e1;
        margin-bottom: 12px;
      }

      .emptyTitle {
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 14px;
      }
    }
  }

  /* ========================================================
     深色模式适配 (Dark Mode Cohesive Styling)
     ======================================================== */
  .aiExplainContainer.isDark {
    /* 英雄词条卡片 */
    .explainHeroCard {
      background: #282c34;
      border-color: rgba(255, 255, 255, 0.08);

      .heroHeaderRow {
        .badgeAndBreadcrumb {
          .nodeBreadcrumb {
            color: #94a3b8;
          }
        }
      }

      .termDisplayWrap {
        .termTitle {
          color: #f8fafc;
        }
      }

      .termEditWrap {
        /deep/ .el-input__inner {
          background-color: #1e2227;
          border-color: rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
        }
      }
    }

    /* 统一控制栏 */
    .controlToolbar {
      background: rgba(255, 255, 255, 0.04);

      .toolbarLeft {
        .toolLabel {
          color: #cbd5e1;
        }

        .presetSelect {
          /deep/ .el-input__inner {
            background-color: #1e2227;
            border-color: rgba(255, 255, 255, 0.12);
            color: #f1f5f9;
          }
        }

        .customPromptToggleBtn {
          color: #94a3b8;

          &:hover {
            color: #60a5fa;
          }
        }
      }

      .toolbarRight {
        .syncStatusChip {
          &.auto {
            color: #4ade80;
            background: rgba(34, 197, 94, 0.15);
            border-color: rgba(34, 197, 94, 0.3);
          }

          &.manual {
            color: #60a5fa;
            background: rgba(59, 130, 246, 0.15);
            border-color: rgba(59, 130, 246, 0.3);
          }

          &.disabled {
            color: #64748b;
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.08);
          }
        }
      }
    }

    /* 自定义 Prompt 编辑区 */
    .promptEditorBox {
      background: #282c34;
      border-color: rgba(255, 255, 255, 0.08);

      /deep/ .el-textarea__inner {
        background-color: #1e2227;
        border-color: rgba(255, 255, 255, 0.12);
        color: #f1f5f9;
      }

      .promptTips {
        color: #64748b;

        code {
          background: #1e2227;
          color: #60a5fa;
        }
      }
    }

    /* 核心释义卡片 */
    .resultCard {
      background: #1e2227;
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

      .resultCardHeader {
        background: rgba(255, 255, 255, 0.02);
        border-bottom-color: rgba(255, 255, 255, 0.06);

        .resultHeaderLeft {
          .headerIcon {
            color: #60a5fa;
          }

          .headerTitle {
            color: #f1f5f9;
          }

          .statusTag {
            &.generating {
              color: #fbbf24;
              background: rgba(245, 158, 11, 0.15);
              border-color: rgba(245, 158, 11, 0.3);
            }

            &.saved {
              color: #4ade80;
              background: rgba(34, 197, 94, 0.15);
              border-color: rgba(34, 197, 94, 0.3);
            }
          }
        }

        .resultHeaderRight {
          .actionGhostBtn {
            color: #94a3b8;

            &:hover {
              color: #60a5fa;
              background: rgba(59, 130, 246, 0.12);
            }
          }
        }
      }

      .resultCardBody {
        .markdownContent {
          color: #e2e8f0;

          /deep/ strong,
          /deep/ b {
            color: #60a5fa;
          }

          /deep/ h1,
          /deep/ h2,
          /deep/ h3 {
            color: #f8fafc;
          }

          /deep/ h2 {
            border-bottom-color: rgba(255, 255, 255, 0.08);
          }

          /deep/ blockquote {
            background: rgba(59, 130, 246, 0.08);
            border-left-color: #3b82f6;
            color: #cbd5e1;
          }

          /deep/ code {
            background: rgba(255, 255, 255, 0.08);
            color: #93c5fd;
          }
        }

        .editResultWrap {
          /deep/ .el-textarea__inner {
            background-color: #17191d;
            border-color: rgba(255, 255, 255, 0.12);
            color: #f1f5f9;
          }
        }
      }

      .resultCardFooter {
        background: rgba(255, 255, 255, 0.02);
        border-top-color: rgba(255, 255, 255, 0.06);

        .footerHintText {
          color: #94a3b8;
        }
      }
    }

    /* 空态 */
    .explainEmptyState {
      background: #282c34;
      border-color: rgba(255, 255, 255, 0.1);

      .emptyIconWrap {
        background: rgba(99, 102, 241, 0.2);
        color: #818cf8;
      }

      .emptyTitle {
        color: #e2e8f0;
      }

      .emptyDesc {
        color: #64748b;
      }
    }

    /* 历史记录 */
    .historyContainer {
      .historyHeader {
        border-bottom-color: rgba(255, 255, 255, 0.08);

        .summary {
          color: #94a3b8;
          b {
            color: #60a5fa;
          }
        }
      }

      .historyList {
        .historyItemCard {
          background: #282c34;
          border-color: rgba(255, 255, 255, 0.08);

          &:hover {
            border-color: rgba(255, 255, 255, 0.18);
          }

          .itemCardHeader {
            .itemTermGroup {
              .termTitle {
                color: #f8fafc;
              }

              .itemTime {
                color: #64748b;
              }
            }
          }

          .itemContent {
            background: #1e2227;
            border-color: rgba(255, 255, 255, 0.06);
            color: #cbd5e1;

            /deep/ strong,
            /deep/ b {
              color: #60a5fa;
            }
          }

          .itemEditBox {
            /deep/ .el-input__inner,
            /deep/ .el-textarea__inner {
              background-color: #1e2227;
              border-color: rgba(255, 255, 255, 0.12);
              color: #f1f5f9;
            }
          }
        }
      }
    }
  }
}

@media screen and (max-width: 768px) {
  .aiExplainDialog {
    /deep/ .el-dialog {
      margin-bottom: 20px !important;
    }

    /deep/ .el-dialog__header {
      padding: 14px 16px 10px !important;
    }

    /deep/ .el-dialog__body {
      padding: 10px 12px !important;
    }
  }

  .explainHeroCard {
    padding: 12px !important;

    .termRow {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 6px !important;
    }
  }

  .presetSelectorBar {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px !important;

    .presetPills {
      flex-wrap: wrap !important;
    }
  }

  .actionControlBar {
    flex-wrap: wrap !important;
    gap: 8px !important;

    .actionRight {
      width: 100% !important;
      display: flex !important;
      justify-content: flex-end !important;
    }
  }
}
</style>
