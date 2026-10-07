<template>
  <div
    class="noteContentViewer customScrollbar"
    ref="noteContentViewer"
    :class="{ isAiNoteMode: isAiNoteBoxActive }"
    :style="{
      left: this.left + 'px',
      top: this.top + 'px',
      visibility: show ? 'visible' : 'hidden'
    }"
    @click.stop
    @mousedown.stop
    @mousemove.stop
    @mouseup.stop
    @wheel.stop
  >
    <!-- 当开启 AI 备注框且该节点拥有 AI 释义记录时显示增强备注卡片 -->
    <template v-if="isAiNoteBoxActive">
      <div class="aiNoteBoxWrapper">
        <div class="aiNoteBoxHeader">
          <div class="titleWrap">
            <span class="icon">🤖</span>
            <span class="title">AI 释义与备注</span>
            <span class="countBadge">{{ nodeAiNotes.length }}</span>
          </div>
          <div class="actionBtns">
            <el-button
              type="primary"
              size="mini"
              icon="el-icon-setting"
              circle
              title="管理全部释义与备注"
              @click="openManager"
            ></el-button>
            <el-button
              type="success"
              size="mini"
              icon="el-icon-plus"
              circle
              title="对此节点新增 AI 释义"
              @click="openAddExplain"
            ></el-button>
          </div>
        </div>

        <div class="aiNoteList customScrollbar">
          <div
            v-for="item in nodeAiNotes"
            :key="item.id"
            class="aiNoteItem"
          >
            <div class="itemHead">
              <div class="termTitle">
                <span class="tag">📌</span>
                <span class="term">{{ item.term }}</span>
                <span class="time">{{ item.time ? item.time.split(' ')[0] : '' }}</span>
              </div>
              <div class="itemOps">
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-edit"
                  title="编辑此释义"
                  @click="editItem(item)"
                ></el-button>
                <el-button
                  type="text"
                  size="mini"
                  icon="el-icon-delete"
                  style="color: #f56c6c;"
                  title="删除此释义"
                  @click="deleteItem(item.id)"
                ></el-button>
              </div>
            </div>
            <div class="itemContent customScrollbar" v-html="renderMd(item.content)"></div>
          </div>
        </div>

        <!-- 普通手动备注展示区（如果同时存在） -->
        <div class="manualNoteSection" v-if="manualNoteContent">
          <div class="manualTitle">📝 普通备注内容</div>
          <div class="manualBody customScrollbar" v-html="renderMd(manualNoteContent)"></div>
        </div>
      </div>
    </template>

    <!-- 原生纯 Markdown 预览视图 -->
    <div
      v-show="!isAiNoteBoxActive"
      class="noteContentWrap customScrollbar"
      ref="noteContentWrap"
    ></div>
  </div>
</template>

<script>
import Viewer from '@toast-ui/editor/dist/toastui-editor-viewer'
import '@toast-ui/editor/dist/toastui-editor-viewer.css'
import { mapState } from 'vuex'
import MarkdownIt from 'markdown-it'
import {
  getAiNotes,
  deleteAiNote,
  extractManualNote
} from '@/utils/aiNoteHelper'

let md = new MarkdownIt()

// 节点备注内容显示
export default {
  props: {
    mindMap: {
      type: Object,
      default() {
        return null
      }
    }
  },
  data() {
    return {
      editor: null,
      show: false,
      left: 0,
      top: 0,
      node: null,
      nodeAiNotes: [],
      manualNoteContent: ''
    }
  },
  computed: {
    ...mapState({
      localConfig: state => state.localConfig
    }),

    isAiNoteBoxActive() {
      return (
        this.localConfig.enableAi &&
        this.localConfig.enableAiNoteBox &&
        this.nodeAiNotes &&
        this.nodeAiNotes.length > 0
      )
    }
  },
  created() {
    this.$bus.$on('showNoteContent', this.onShowNoteContent)
    this.$bus.$on('node_note_click', this.onNodeNoteClick)
    this.$bus.$on('hideNoteContent', this.hideNoteContent)
    document.body.addEventListener('click', this.hideNoteContent)
    this.$bus.$on('node_active', this.onNodeActive)
    this.$bus.$on('scale', this.onScale)
    this.$bus.$on('translate', this.onScale)
    this.$bus.$on('svg_mousedown', this.hideNoteContent)
    this.$bus.$on('expand_btn_click', this.hideNoteContent)
  },
  mounted() {
    this.mindMap.el.appendChild(this.$refs.noteContentViewer)
    this.initEditor()
  },
  beforeDestroy() {
    this.$bus.$off('showNoteContent', this.onShowNoteContent)
    this.$bus.$off('node_note_click', this.onNodeNoteClick)
    this.$bus.$off('hideNoteContent', this.hideNoteContent)
    document.body.removeEventListener('click', this.hideNoteContent)
    this.$bus.$off('node_active', this.onNodeActive)
    this.$bus.$off('scale', this.onScale)
    this.$bus.$off('translate', this.onScale)
    this.$bus.$off('svg_mousedown', this.hideNoteContent)
    this.$bus.$off('expand_btn_click', this.hideNoteContent)
  },
  methods: {
    onNodeActive(...args) {
      const nodes = [...args[1]]
      if (nodes.length > 0) {
        if (nodes[0] !== this.node) {
          this.hideNoteContent()
        }
      } else {
        this.hideNoteContent()
      }
    },

    // 显示备注浮层
    onShowNoteContent(content, left, top, node) {
      this.node = node
      this.nodeAiNotes = getAiNotes(node)
      this.manualNoteContent = extractManualNote(content)

      if (!this.isAiNoteBoxActive) {
        this.editor.setMarkdown(content || '')
        this.handleALink()
      }

      this.$nextTick(() => {
        this.updateNoteContentPosition(left, top)
        this.show = true
      })
    },

    renderMd(content) {
      if (!content) return ''
      return md.render(content)
    },

    openManager() {
      this.hideNoteContent()
      this.$bus.$emit('open_ai_note_box', this.node)
    },

    openAddExplain() {
      this.hideNoteContent()
      const text = this.node
        ? (this.node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
        : ''
      this.$bus.$emit('ai_explain', {
        text,
        node: this.node
      })
    },

    editItem(item) {
      this.hideNoteContent()
      this.$bus.$emit('open_ai_note_box', this.node)
    },

    deleteItem(noteId) {
      const updated = deleteAiNote(this.node, noteId)
      this.nodeAiNotes = updated
      this.$message.success('已删除该释义记录')
      if (updated.length === 0) {
        this.hideNoteContent()
      }
    },

    // 超链接新窗口打开
    handleALink() {
      const list = this.$refs.noteContentViewer.querySelectorAll('a')
      Array.from(list).forEach(a => {
        a.setAttribute('target', '_blank')
      })
    },

    onNodeNoteClick(node) {
      if (!node) return
      const { left, top } = node.getNoteContentPosition()
      this.onShowNoteContent(node.getData('note'), left, top, node)
    },

    // 更新位置
    updateNoteContentPosition(left, top) {
      if (!this.$refs.noteContentViewer) return
      const { width, height } = this.$refs.noteContentViewer.getBoundingClientRect()
      const winWidth = window.innerWidth
      const winHeight = window.innerHeight

      let l = left + width > winWidth ? winWidth - width - 12 : left
      let t = top + height > winHeight ? winHeight - height - 12 : top

      this.left = Math.max(10, l)
      this.top = Math.max(60, t)
    },

    // 画布缩放事件
    onScale() {
      if (!this.node || !this.show) return
      const { left, top } = this.node.getNoteContentPosition()
      this.updateNoteContentPosition(left, top)
    },

    // 隐藏备注浮层
    hideNoteContent() {
      this.show = false
    },

    // 初始化编辑器
    initEditor() {
      if (!this.editor) {
        this.editor = new Viewer({
          el: this.$refs.noteContentWrap
        })
      }
    }
  }
}
</script>

<style lang="less" scoped>
.noteContentViewer {
  position: fixed;
  background-color: #fff;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.08);
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  z-index: 2000;

  &.isAiNoteMode {
    width: 320px;
    max-width: calc(100vw - 24px);
    padding: 12px;
  }

  .noteContentWrap {
    max-width: 280px;
    max-height: 320px;
    overflow-y: auto;
  }

  .aiNoteBoxWrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .aiNoteBoxHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;

      .titleWrap {
        display: flex;
        align-items: center;
        gap: 6px;

        .icon {
          font-size: 16px;
        }

        .title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .countBadge {
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 10px;
        }
      }

      .actionBtns {
        display: flex;
        gap: 4px;
      }
    }

    .aiNoteList {
      max-height: 240px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .aiNoteItem {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;

        .itemHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;

          .termTitle {
            display: flex;
            align-items: center;
            gap: 4px;

            .tag {
              font-size: 11px;
            }

            .term {
              font-weight: 600;
              font-size: 12px;
              color: #0f172a;
            }

            .time {
              font-size: 10px;
              color: #94a3b8;
              margin-left: 4px;
            }
          }

          .itemOps {
            display: flex;
            gap: 2px;

            /deep/ .el-button {
              padding: 0 3px;
            }
          }
        }

        .itemContent {
          font-size: 12px;
          line-height: 1.5;
          color: #475569;
          max-height: 100px;
          overflow-y: auto;

          /deep/ p {
            margin-bottom: 4px;
          }
        }
      }
    }

    .manualNoteSection {
      border-top: 1px dashed #e2e8f0;
      padding-top: 6px;

      .manualTitle {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 4px;
      }

      .manualBody {
        font-size: 12px;
        color: #334155;
        max-height: 80px;
        overflow-y: auto;
      }
    }
  }
}
</style>
