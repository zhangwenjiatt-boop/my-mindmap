<template>
  <el-dialog
    class="aiExplainDialog"
    :title="$t('aiExplain.title') || '🤖 AI 概念释义与节点备注'"
    :visible.sync="dialogVisible"
    width="680px"
    top="10vh"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab" class="aiTabs">
      <!-- Tab 1: AI 释义与生成 -->
      <el-tab-pane label="AI 智能释义" name="explain">
        <div class="explainContainer customScrollbar">
          <!-- 上下文信息 -->
          <div class="contextCard">
            <div class="contextItem">
              <span class="label">待释义词条：</span>
              <el-tag size="medium" effect="dark" type="success" class="termTag">
                {{ currentTerm || '（请选择或输入词条）' }}
              </el-tag>
              <el-button
                type="text"
                size="mini"
                icon="el-icon-edit"
                @click="showEditTerm = !showEditTerm"
              >
                {{ showEditTerm ? '完成修改' : '修改词条' }}
              </el-button>
            </div>
            <div class="contextItem" v-if="showEditTerm">
              <el-input
                size="small"
                v-model="currentTerm"
                placeholder="请输入要释义的关键词或内容"
                style="width: 280px"
                @change="onTermChange"
              ></el-input>
            </div>
            <div class="contextItem" v-if="targetNode">
              <span class="label">所属节点：</span>
              <span class="nodeContentText">{{ nodeTextSummary }}</span>
            </div>
          </div>

          <!-- Prompt 预设选择与自定义编辑 -->
          <div class="promptConfigBox">
            <div class="promptHeader">
              <span class="label">释义 Prompt 模式：</span>
              <el-select
                v-model="selectedPreset"
                size="small"
                style="width: 220px"
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
                class="toggleCustomBtn"
                @click="showCustomPromptEditor = !showCustomPromptEditor"
              >
                {{ showCustomPromptEditor ? '收起 Prompt 模版' : '查看/编辑 Prompt' }}
              </el-button>
            </div>

            <!-- 自定义 Prompt 编辑区 -->
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
          </div>

          <!-- 模式状态与操作栏 -->
          <div class="actionToolbar">
            <div class="modeIndicator">
              <span v-if="localConfig.enableAiNoteBox && localConfig.aiNoteRecordMode === 'auto'" class="autoNoteBadge">
                <i class="el-icon-check"></i> 自动记录开启：释义完成将自动保存至该节点备注
              </span>
              <span v-else-if="localConfig.enableAiNoteBox" class="manualNoteBadge">
                <i class="el-icon-info"></i> 手动记录模式：生成后可点击保存至节点备注
              </span>
              <span v-else class="disabledNoteBadge">
                <i class="el-icon-warning-outline"></i> AI备注框未开启（可在系统设置中开启）
              </span>
            </div>

            <div class="actionBtns">
              <el-button
                v-if="!isGenerating"
                type="primary"
                size="small"
                icon="el-icon-magic-stick"
                @click="startExplain"
                :disabled="!currentTerm"
              >
                {{ hasGenerated ? '重新释义' : '开始 AI 释义' }}
              </el-button>
              <el-button
                v-else
                type="warning"
                size="small"
                icon="el-icon-video-pause"
                @click="stopExplain"
              >
                停止生成
              </el-button>
            </div>
          </div>

          <!-- 结果展示与编辑面板 -->
          <div class="resultCard" v-if="isGenerating || explanationResult">
            <div class="resultHeader">
              <div class="leftTitle">
                <i class="el-icon-reading"></i>
                <span>释义结果</span>
                <el-tag size="mini" v-if="isGenerating" type="warning">正在思考生成中...</el-tag>
                <el-tag size="mini" v-else-if="isSavedToNote" type="success">已保存到节点备注</el-tag>
              </div>
              <div class="rightActions">
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-edit"
                  @click="isEditResult = !isEditResult"
                  v-if="!isGenerating && explanationResult"
                >
                  {{ isEditResult ? '预览渲染' : '直接编辑文本' }}
                </el-button>
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-document-copy"
                  @click="copyResult"
                  v-if="explanationResult"
                >
                  复制
                </el-button>
              </div>
            </div>

            <div class="resultBody">
              <!-- 渲染视图 -->
              <div
                v-if="!isEditResult"
                class="markdownContent customScrollbar"
                v-html="renderedMarkdown"
              ></div>
              <!-- 编辑视图 -->
              <div v-else class="editResultWrap">
                <el-input
                  type="textarea"
                  :rows="8"
                  v-model="explanationResult"
                  placeholder="可在此直接修改释义内容"
                ></el-input>
              </div>
            </div>

            <!-- 底部保存到备注按钮栏 -->
            <div class="resultFooter" v-if="!isGenerating && explanationResult">
              <el-button
                type="success"
                size="small"
                icon="el-icon-notebook-2"
                @click="manualSaveToNote"
                :disabled="!localConfig.enableAiNoteBox"
              >
                {{ isSavedToNote ? '更新节点备注内容' : '记录保存至节点备注' }}
              </el-button>
              <span class="footerTip" v-if="!localConfig.enableAiNoteBox">
                （当前未开启AI备注框功能，可去设置开启）
              </span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Tab 2: 该节点的释义备注历史记录 -->
      <el-tab-pane :label="`本节点释义备注 (${nodeAiNotes.length})`" name="history">
        <div class="historyContainer customScrollbar">
          <div class="historyHeader">
            <div class="summary">
              当前节点共包含 <b>{{ nodeAiNotes.length }}</b> 条 AI 释义记录
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
              class="historyItem"
            >
              <div class="itemHeader">
                <div class="itemTerm">
                  <span class="termName">📌 {{ item.term }}</span>
                  <span class="itemTime">{{ item.time }}</span>
                  <el-tag size="mini" type="info" v-if="item.presetName">{{ item.presetName }}</el-tag>
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
                    style="color: #f56c6c;"
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
            <i class="el-icon-document" style="font-size: 40px; color: #ccc;"></i>
            <p>该节点暂无任何 AI 释义备注记录</p>
            <el-button size="small" type="primary" plain @click="activeTab = 'explain'">立即进行 AI 释义</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 手动新增释义记录弹窗 -->
    <el-dialog
      title="新增释义记录"
      :visible.sync="showAddCustomNoteDialog"
      width="450px"
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="词条名称">
          <el-input v-model="newCustomTerm" placeholder="例如：经纬度"></el-input>
        </el-form-item>
        <el-form-item label="释义内容">
          <el-input type="textarea" :rows="5" v-model="newCustomContent" placeholder="请输入对该词条的解释内容"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="showAddCustomNoteDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddCustomNote">保存</el-button>
      </div>
    </el-dialog>

    <div slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false">关闭</el-button>
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
      localConfig: state => state.localConfig
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
      const savedPreset = this.localConfig.aiExplanationPromptPreset || 'plain'
      this.selectedPreset = savedPreset
      this.updateActiveTemplate()
    },

    onPresetChange() {
      this.updateActiveTemplate()
    },

    updateActiveTemplate() {
      if (this.selectedPreset === 'custom') {
        this.activePromptTemplate =
          this.localConfig.aiExplanationCustomPrompt ||
          '请针对词条“{text}”（所属节点：【{nodeText}】），给出清晰明了的释义与关键要点，使用Markdown格式返回。'
      } else {
        const preset = this.explanationPresets.find(p => p.id === this.selectedPreset)
        this.activePromptTemplate = preset ? preset.template : ''
      }
    },

    resetToDefaultPrompt() {
      const preset = this.explanationPresets.find(p => p.id === this.selectedPreset)
      if (preset && preset.template) {
        this.activePromptTemplate = preset.template
      }
    },

    onTermChange() {
      this.hasGenerated = false
      this.explanationResult = ''
      this.isSavedToNote = false
    },

    handleAiExplainEvent({ text, node } = {}) {
      this.targetNode = node || (this.mindMap && this.mindMap.renderer.activeNodeList[0]) || null
      this.currentTerm = (text || '').trim()
      this.showEditTerm = !this.currentTerm
      this.hasGenerated = false
      this.explanationResult = ''
      this.isSavedToNote = false
      this.activeTab = 'explain'
      this.loadNodeAiNotes()

      this.dialogVisible = true

      // 如果有清晰的划词词条，自动开始释义体验更流畅
      if (this.currentTerm) {
        this.$nextTick(() => {
          this.startExplain()
        })
      }
    },

    handleOpenAiNoteBoxEvent(node) {
      this.targetNode = node || (this.mindMap && this.mindMap.renderer.activeNodeList[0]) || null
      this.loadNodeAiNotes()
      this.activeTab = 'history'
      this.dialogVisible = true
    },

    loadNodeAiNotes() {
      if (this.targetNode) {
        this.nodeAiNotes = getAiNotes(this.targetNode)
      } else {
        this.nodeAiNotes = []
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
            this.$message.error('AI 解释请求失败，请检查配置与网络')
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
    padding: 10px 24px 20px;
  }

  .aiTabs {
    /deep/ .el-tabs__header {
      margin-bottom: 14px;
    }
  }

  .explainContainer {
    max-height: 520px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .contextCard {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;

    .contextItem {
      display: flex;
      align-items: center;
      margin-bottom: 6px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        font-size: 13px;
        color: #64748b;
        font-weight: 500;
        width: 84px;
        flex-shrink: 0;
      }

      .termTag {
        font-weight: 600;
        font-size: 14px;
        margin-right: 8px;
      }

      .nodeContentText {
        font-size: 13px;
        color: #1e293b;
        background: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid #cbd5e1;
        max-width: 450px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .promptConfigBox {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 14px;

    .promptHeader {
      display: flex;
      align-items: center;

      .label {
        font-size: 13px;
        font-weight: 500;
        color: #334155;
        margin-right: 8px;
      }

      .toggleCustomBtn {
        margin-left: 12px;
      }
    }

    .promptEditorBox {
      margin-top: 10px;

      .promptTips {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
        font-size: 12px;
        color: #94a3b8;

        code {
          background: #f1f5f9;
          padding: 1px 4px;
          border-radius: 3px;
          color: #2563eb;
        }
      }
    }
  }

  .actionToolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;

    .modeIndicator {
      font-size: 12px;

      .autoNoteBadge {
        color: #16a34a;
        font-weight: 500;
        background: #f0fdf4;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid #bbf7d0;
      }

      .manualNoteBadge {
        color: #2563eb;
        background: #eff6ff;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid #bfdbfe;
      }

      .disabledNoteBadge {
        color: #ea580c;
        background: #fff7ed;
        padding: 4px 8px;
        border-radius: 4px;
      }
    }
  }

  .resultCard {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

    .resultHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      padding: 8px 14px;
      border-bottom: 1px solid #e2e8f0;

      .leftTitle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 13px;
        color: #1e293b;
      }
    }

    .resultBody {
      padding: 14px;

      .markdownContent {
        max-height: 260px;
        overflow-y: auto;
        font-size: 14px;
        line-height: 1.7;
        color: #334155;

        /deep/ h3, /deep/ h4 {
          margin-top: 10px;
          margin-bottom: 6px;
          color: #0f172a;
        }

        /deep/ p {
          margin-bottom: 8px;
        }

        /deep/ ul, /deep/ ol {
          padding-left: 20px;
          margin-bottom: 8px;
        }

        /deep/ blockquote {
          margin: 8px 0;
          padding: 6px 12px;
          background: #f8fafc;
          border-left: 4px solid #3b82f6;
          color: #475569;
        }
      }
    }

    .resultFooter {
      padding: 8px 14px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;

      .footerTip {
        font-size: 12px;
        color: #94a3b8;
      }
    }
  }

  .historyContainer {
    max-height: 520px;
    overflow-y: auto;

    .historyHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f1f5f9;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #334155;
    }

    .historyList {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .historyItem {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        background: #fff;
        transition: all 0.2s;

        &:hover {
          border-color: #93c5fd;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
        }

        .itemHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px dashed #e2e8f0;

          .itemTerm {
            display: flex;
            align-items: center;
            gap: 8px;

            .termName {
              font-weight: 600;
              font-size: 14px;
              color: #1e293b;
            }

            .itemTime {
              font-size: 12px;
              color: #94a3b8;
            }
          }
        }

        .itemContent {
          font-size: 13px;
          line-height: 1.6;
          color: #334155;
          max-height: 180px;
          overflow-y: auto;

          /deep/ p {
            margin-bottom: 6px;
          }
        }

        .itemEditBox {
          padding-top: 6px;

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
      padding: 40px 20px;
      color: #94a3b8;

      p {
        margin: 12px 0;
      }
    }
  }
}
</style>
