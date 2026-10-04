<template>
  <div
    class="markdownSplitEditor"
    :class="{ isDark: isDark, collapsed: !visible }"
    v-show="visible"
  >
    <!-- 头部工具栏 -->
    <div class="editorHeader">
      <div class="headerLeft">
        <span class="headerTitle">
          <i class="el-icon-document"></i> Markdown 笔记
        </span>
        <span class="syncStatus" :class="{ syncing: isSyncing }">
          <i class="el-icon-loading" v-if="isSyncing"></i>
          <i class="el-icon-check" v-else></i>
          {{ isSyncing ? '同步中...' : '实时联动' }}
        </span>
      </div>
      <div class="headerRight">
        <el-tooltip content="复制 Markdown 文本" placement="top" :open-delay="400">
          <button class="headerBtn" @click="copyMarkdown">
            <i class="el-icon-document-copy"></i>
          </button>
        </el-tooltip>
        <el-tooltip content="格式整理" placement="top" :open-delay="400">
          <button class="headerBtn" @click="formatMarkdown">
            <i class="el-icon-magic-stick"></i>
          </button>
        </el-tooltip>
        <el-tooltip content="关闭双栏编辑" placement="top" :open-delay="400">
          <button class="headerBtn closeBtn" @click="close">
            <i class="el-icon-close"></i>
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- 语法快捷插入工具栏 -->
    <div class="quickSyntaxBar">
      <span class="syntaxTag" @click="insertSyntax('# ', '')"># 一级</span>
      <span class="syntaxTag" @click="insertSyntax('## ', '')">## 二级</span>
      <span class="syntaxTag" @click="insertSyntax('### ', '')">### 三级</span>
      <span class="syntaxTag" @click="insertSyntax('- ', '')">- 列表</span>
      <span class="syntaxTag" @click="insertSyntax('- [ ] ', '')">待办</span>
      <span class="syntaxTag" @click="insertSyntax('**', '**')">加粗</span>
    </div>

    <!-- 编辑器主体 -->
    <div class="editorContainer" ref="editorContainer"></div>

    <!-- 底部状态与提示栏 -->
    <div class="editorFooter">
      <span class="tipText">
        <i class="el-icon-info"></i> 支持 # 标题分级与列表缩进，左侧编辑实时绘制脑图
      </span>
      <span class="wordCount">{{ lineCount }} 行 | {{ charCount }} 字</span>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/markdown/markdown.js'
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'
import { transformToMarkdown } from 'simple-mind-map/src/parse/toMarkdown'
import { storeData } from '@/api'

export default {
  name: 'MarkdownSplitEditor',
  props: {
    mindMap: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      visible: false,
      editor: null,
      isSyncing: false,
      isUpdatingFromMarkdown: false,
      debounceTimer: null,
      mindMapDebounceTimer: null,
      lineCount: 0,
      charCount: 0
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark
    })
  },
  watch: {
    isDark() {
      if (this.editor) {
        this.updateEditorTheme()
      }
    }
  },
  created() {
    this.$bus.$on('toggleMarkdownSplit', this.toggle)
    this.$bus.$on('openMarkdownSplit', this.open)
    this.$bus.$on('closeMarkdownSplit', this.close)
  },
  mounted() {
    this.initEditor()
    this.bindMindMapEvents()
  },
  beforeDestroy() {
    this.$bus.$off('toggleMarkdownSplit', this.toggle)
    this.$bus.$off('openMarkdownSplit', this.open)
    this.$bus.$off('closeMarkdownSplit', this.close)
    this.unbindMindMapEvents()
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    if (this.mindMapDebounceTimer) clearTimeout(this.mindMapDebounceTimer)
  },
  methods: {
    initEditor() {
      this.editor = CodeMirror(this.$refs.editorContainer, {
        value: '',
        mode: 'markdown',
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
        indentUnit: 2,
        autofocus: false,
        extraKeys: {
          Tab: cm => {
            if (cm.somethingSelected()) {
              cm.indentSelection('add')
            } else {
              cm.replaceSelection('  ', 'end', '+input')
            }
          }
        }
      })

      this.updateEditorTheme()

      this.editor.on('change', (cm, changeObj) => {
        if (changeObj.origin === 'setValue') return
        const val = cm.getValue()
        this.updateStats(val)
        this.handleMarkdownInput(val)
      })
    },

    updateEditorTheme() {
      // 保持与界面一致的商务清晰黑白/深色风格
      if (!this.editor) return
      const wrapper = this.editor.getWrapperElement()
      if (wrapper) {
        wrapper.classList.toggle('cm-dark-theme', this.isDark)
      }
    },

    bindMindMapEvents() {
      if (!this.mindMap) return
      this.mindMap.on('data_change', this.onMindMapDataChange)
    },

    unbindMindMapEvents() {
      if (!this.mindMap) return
      this.mindMap.off('data_change', this.onMindMapDataChange)
    },

    toggle() {
      if (this.visible) {
        this.close()
      } else {
        this.open()
      }
    },

    open() {
      this.visible = true
      this.$emit('change', true)
      this.$bus.$emit('split_editor_change', true)
      this.syncFromMindMap()
      this.$nextTick(() => {
        if (this.editor) {
          this.editor.refresh()
          this.editor.focus()
        }
        if (this.mindMap) {
          this.mindMap.resize()
        }
      })
    },

    close() {
      this.visible = false
      this.$emit('change', false)
      this.$bus.$emit('split_editor_change', false)
      this.$nextTick(() => {
        if (this.mindMap) {
          this.mindMap.resize()
        }
      })
    },

    // 从思维导图同步到 Markdown
    syncFromMindMap() {
      if (!this.mindMap || !this.editor) return
      try {
        const rawData = this.mindMap.getData(false)
        const root = rawData && rawData.root ? rawData.root : rawData
        if (!root || !root.data) return
        const md = transformToMarkdown(root)
        if (md !== undefined && md !== null) {
          const currentVal = this.editor.getValue()
          if (currentVal !== md) {
            const cursor = this.editor.getCursor()
            this.editor.setValue(md)
            this.editor.setCursor(cursor)
            this.updateStats(md)
          }
        }
      } catch (err) {
        console.warn('syncFromMindMap error', err)
      }
    },

    // 从 Markdown 编辑器输入防抖同步到思维导图
    handleMarkdownInput(val) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.isSyncing = true
      this.debounceTimer = setTimeout(() => {
        this.syncToMindMap(val)
      }, 350)
    },

    async syncToMindMap(mdText) {
      if (!mdText || !mdText.trim() || !this.mindMap) {
        this.isSyncing = false
        return
      }
      try {
        this.isUpdatingFromMarkdown = true
        const rootNode = await transformMarkdownTo(mdText)
        if (rootNode && rootNode.data) {
          this.mindMap.setData(rootNode)
          storeData(this.mindMap.getData(true))
        }
      } catch (err) {
        console.warn('syncToMindMap error', err)
      } finally {
        setTimeout(() => {
          this.isUpdatingFromMarkdown = false
          this.isSyncing = false
        }, 120)
      }
    },

    onMindMapDataChange() {
      if (!this.visible || this.isUpdatingFromMarkdown) return
      if (this.mindMapDebounceTimer) clearTimeout(this.mindMapDebounceTimer)
      this.mindMapDebounceTimer = setTimeout(() => {
        this.syncFromMindMap()
      }, 250)
    },

    updateStats(text) {
      this.lineCount = text ? text.split('\n').length : 0
      this.charCount = text ? text.length : 0
    },

    insertSyntax(prefix, suffix = '') {
      if (!this.editor) return
      const doc = this.editor.getDoc()
      const selection = doc.getSelection()
      if (selection) {
        doc.replaceSelection(`${prefix}${selection}${suffix}`)
      } else {
        const cursor = doc.getCursor()
        doc.replaceRange(`${prefix}${suffix}`, cursor)
        doc.setCursor({ line: cursor.line, ch: cursor.ch + prefix.length })
      }
      this.editor.focus()
    },

    formatMarkdown() {
      this.syncFromMindMap()
      this.$message.success('已依据脑图层级整理 Markdown 格式')
    },

    async copyMarkdown() {
      if (!this.editor) return
      const text = this.editor.getValue()
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        this.$message.success('Markdown 笔记已复制到剪贴板')
      } catch (e) {
        this.$message.error('复制失败，请手动选取复制')
      }
    }
  }
}
</script>

<style lang="less" scoped>
.markdownSplitEditor {
  width: 440px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 4px 0 16px rgba(15, 23, 42, 0.04);
  z-index: 100;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  user-select: none;

  &.isDark {
    background: #1e293b;
    border-right-color: #334155;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.3);

    .editorHeader {
      background: #0f172a;
      border-bottom-color: #334155;

      .headerTitle {
        color: #f1f5f9;
      }

      .headerBtn {
        color: #94a3b8;

        &:hover {
          background: #334155;
          color: #f8fafc;
        }
      }
    }

    .quickSyntaxBar {
      background: #1e293b;
      border-bottom-color: #334155;

      .syntaxTag {
        background: #334155;
        color: #cbd5e1;
        border-color: #475569;

        &:hover {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
      }
    }

    .editorFooter {
      background: #0f172a;
      border-top-color: #334155;
      color: #94a3b8;
    }
  }

  .editorHeader {
    height: 48px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;

    .headerLeft {
      display: flex;
      align-items: center;
      gap: 10px;

      .headerTitle {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .syncStatus {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 12px;
        background: #ecfdf5;
        color: #059669;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;

        &.syncing {
          background: #eff6ff;
          color: #2563eb;
        }
      }
    }

    .headerRight {
      display: flex;
      align-items: center;
      gap: 4px;

      .headerBtn {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #64748b;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        &.closeBtn:hover {
          background: #fee2e2;
          color: #ef4444;
        }
      }
    }
  }

  .quickSyntaxBar {
    padding: 7px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    border-bottom: 1px solid #f1f5f9;
    overflow-x: auto;
    white-space: nowrap;

    .syntaxTag {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 5px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: #eff6ff;
        color: #2563eb;
        border-color: #bfdbfe;
      }
    }
  }

  .editorContainer {
    flex: 1;
    overflow: hidden;
    position: relative;

    /deep/ .CodeMirror {
      height: 100%;
      font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
      font-size: 13.5px;
      line-height: 1.65;
      background: transparent;

      .CodeMirror-gutters {
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
      }

      .CodeMirror-linenumber {
        color: #94a3b8;
        padding: 0 8px 0 5px;
      }

      .CodeMirror-cursor {
        border-left: 2px solid #2563eb;
      }

      .cm-header-1 {
        font-size: 17px;
        font-weight: 700;
        color: #0f172a;
      }

      .cm-header-2 {
        font-size: 15px;
        font-weight: 600;
        color: #1e3a8a;
      }

      .cm-header-3 {
        font-size: 14px;
        font-weight: 600;
        color: #2563eb;
      }

      .cm-variable-2 {
        color: #0284c7;
      }

      .cm-strong {
        color: #0f172a;
      }
    }

    /deep/ .cm-dark-theme.CodeMirror {
      color: #f1f5f9;

      .CodeMirror-gutters {
        background: #0f172a;
        border-right-color: #334155;
      }

      .CodeMirror-linenumber {
        color: #64748b;
      }

      .CodeMirror-cursor {
        border-left-color: #38bdf8;
      }

      .cm-header-1 {
        color: #f8fafc;
      }

      .cm-header-2 {
        color: #93c5fd;
      }

      .cm-header-3 {
        color: #60a5fa;
      }

      .cm-variable-2 {
        color: #38bdf8;
      }

      .cm-strong {
        color: #ffffff;
      }
    }
  }

  .editorFooter {
    height: 32px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #64748b;

    .tipText {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wordCount {
      font-weight: 600;
      white-space: nowrap;
    }
  }
}
</style>
