<template>
  <div
    class="nodeFloatingToolbar"
    ref="nodeFloatingToolbar"
    :style="style"
    :class="{ isDark: isDark, isMobile: isMobile }"
    @click.stop
    @touchend.stop
    v-show="showToolbar && node"
  >
    <div class="toolbarScroll customScrollbar">
      <!-- AI 功能组（开启 AI 时首屏最醒目展示） -->
      <div class="toolGroup aiFeatureGroup" v-if="enableAi">
        <el-tooltip
          content="AI 概念释义与知识助手"
          placement="top"
          :open-delay="300"
          :disabled="isMobile"
        >
          <button class="toolBtn aiBtn explainBtn" @click="handleAiExplain">
            <span class="aiSparkle">✨</span>
            <span class="btnText">AI 释义</span>
          </button>
        </el-tooltip>

        <el-tooltip
          content="AI 智能续写/拆解子分支"
          placement="top"
          :open-delay="300"
          :disabled="isMobile"
        >
          <button class="toolBtn aiBtn" @click="handleAiCreatePart">
            <span class="icon iconfont iconAIshengcheng"></span>
            <span class="btnText">续写</span>
          </button>
        </el-tooltip>

        <el-tooltip
          content="查看该节点的 AI 释义历史记录"
          placement="top"
          :open-delay="300"
          :disabled="isMobile"
        >
          <button class="toolBtn aiBtn noteBoxBtn" @click="handleOpenAiNoteBox">
            <span class="icon iconfont iconflow-Mark"></span>
            <span class="btnText">AI 备注</span>
            <span class="aiNoteBadge" v-if="nodeAiNotesCount > 0">{{ nodeAiNotesCount }}</span>
          </button>
        </el-tooltip>

        <el-popover
          placement="bottom"
          trigger="click"
          popper-class="nodeFloatingPopover nodeBilingualPopover"
          v-model="bilingualPopoverVisible"
        >
          <div class="nodeBilingualMenu" :class="{ isDark: isDark }">
            <div class="menuHeader">
              <span class="menuTitle">🌐 单节点中英切换与翻译</span>
              <span class="currStatus" v-if="nodeCurrentLangLabel">当前: {{ nodeCurrentLangLabel }}</span>
            </div>
            <div
              class="menuItem"
              :class="{ active: isNodeDisplayZh }"
              @click="handleSwitchSingleNodeLang('zh')"
            >
              <span class="itemIcon">🇨🇳</span>
              <div class="itemText">
                <div class="name">显示中文内容</div>
                <div class="desc">纯中文展示（未翻译将自动调用 AI）</div>
              </div>
              <i class="el-icon-check checkIcon" v-if="isNodeDisplayZh"></i>
            </div>
            <div
              class="menuItem"
              :class="{ active: isNodeDisplayEn }"
              @click="handleSwitchSingleNodeLang('en')"
            >
              <span class="itemIcon">🇬🇧</span>
              <div class="itemText">
                <div class="name">显示英文原版</div>
                <div class="desc">纯英文展示</div>
              </div>
              <i class="el-icon-check checkIcon" v-if="isNodeDisplayEn"></i>
            </div>
            <div
              class="menuItem"
              :class="{ active: isNodeDisplayDual }"
              @click="handleSwitchSingleNodeLang('dual')"
            >
              <span class="itemIcon">📑</span>
              <div class="itemText">
                <div class="name">双语对照显示</div>
                <div class="desc">双行对等对照展示</div>
              </div>
              <i class="el-icon-check checkIcon" v-if="isNodeDisplayDual"></i>
            </div>
            <div class="menuDivider"></div>
            <div
              class="menuItem retransItem"
              @click="handleSwitchSingleNodeLang('retranslate')"
            >
              <span class="itemIcon">🔄</span>
              <div class="itemText">
                <div class="name">重新 AI 翻译当前节点</div>
                <div class="desc">重新请求大模型精准互译</div>
              </div>
            </div>
          </div>

          <div class="nodeBilingualBtnGroup" slot="reference">
            <button
              class="toolBtn aiBtn translateBtn"
              :class="{ isTranslating: isTranslatingNode }"
              @click.stop="handleQuickToggleNodeLang"
              :title="nodeQuickToggleTip"
            >
              <span class="icon" :class="{ 'el-icon-loading': isTranslatingNode }">{{ isTranslatingNode ? '' : '🌐' }}</span>
              <span class="btnText">{{ isTranslatingNode ? '翻译中' : nodeQuickToggleBtnText }}</span>
            </button>
            <button
              class="toolBtn arrowDropdownBtn"
              title="切换语言选项"
              @click.stop="bilingualPopoverVisible = !bilingualPopoverVisible"
            >
              <i class="el-icon-arrow-down arrowIcon"></i>
            </button>
          </div>
        </el-popover>
      </div>

      <div class="toolDivider" v-if="enableAi"></div>

      <!-- 结构节点快捷操作 (高频操作) -->
      <div class="toolGroup">
        <el-tooltip content="插入子节点 (Tab)" placement="top" :open-delay="400" :disabled="isMobile">
          <button class="toolBtn actionBtn" @click="insertChild">
            <span class="icon iconfont icontianjiazijiedian"></span>
          </button>
        </el-tooltip>

        <el-tooltip
          content="插入同级节点 (Enter)"
          placement="top"
          :open-delay="400"
          :disabled="isMobile"
          v-if="!isRootNode"
        >
          <button class="toolBtn actionBtn" @click="insertSibling">
            <span class="icon iconfont iconjiedian"></span>
          </button>
        </el-tooltip>

        <el-tooltip content="删除节点 (Del)" placement="top" :open-delay="400" :disabled="isMobile">
          <button class="toolBtn actionBtn deleteBtn" @click="deleteNode">
            <span class="icon iconfont iconshanchu"></span>
          </button>
        </el-tooltip>
      </div>

      <div class="toolDivider"></div>

      <!-- 字号调节区 -->
      <div class="toolGroup">
        <el-tooltip content="缩小字号 (A-)" placement="top" :open-delay="400" :disabled="isMobile">
          <button class="toolBtn fontStepBtn" @click="changeFontSizeStep(-2)">
            <span>A-</span>
          </button>
        </el-tooltip>

        <el-popover placement="bottom" trigger="click" popper-class="nodeFloatingPopover">
          <div class="fontSizeListDropdown customScrollbar" :class="{ isDark: isDark }">
            <div
              class="fontSizeItem"
              v-for="size in fontSizeList"
              :key="size"
              :class="{ active: currentFontSize === size }"
              @click="setFontSize(size)"
            >
              {{ size }}px
            </div>
          </div>
          <button class="toolBtn fontSizeDisplay" slot="reference">
            <span>{{ currentFontSize }}</span>
            <i class="el-icon-arrow-down arrowIcon"></i>
          </button>
        </el-popover>

        <el-tooltip content="放大字号 (A+)" placement="top" :open-delay="400" :disabled="isMobile">
          <button class="toolBtn fontStepBtn" @click="changeFontSizeStep(2)">
            <span>A+</span>
          </button>
        </el-tooltip>
      </div>

      <div class="toolDivider"></div>

      <!-- 字体选择 -->
      <div class="toolGroup">
        <el-popover placement="bottom" trigger="click" popper-class="nodeFloatingPopover">
          <div class="fontFamilyDropdown customScrollbar" :class="{ isDark: isDark }">
            <div
              class="fontFamilyItem"
              v-for="item in fontFamilyList"
              :key="item.value"
              :style="{ fontFamily: item.value }"
              :class="{ active: currentFontFamily === item.value }"
              @click="setFontFamily(item.value)"
            >
              {{ item.name }}
            </div>
          </div>
          <button class="toolBtn fontFamBtn" slot="reference" title="字体">
            <span class="fontNameShow">{{ currentFontFamilyName }}</span>
            <i class="el-icon-arrow-down arrowIcon"></i>
          </button>
        </el-popover>
      </div>

      <div class="toolDivider"></div>

      <!-- 文本格式 B / I / S -->
      <div class="toolGroup">
        <el-tooltip content="加粗 (Ctrl+B)" placement="top" :open-delay="400" :disabled="isMobile">
          <button
            class="toolBtn iconBtn"
            :class="{ active: isBold }"
            @click="toggleStyle('fontWeight', 'bold', 'normal')"
          >
            <span class="icon iconfont iconzitijiacu"></span>
          </button>
        </el-tooltip>

        <el-tooltip content="斜体 (Ctrl+I)" placement="top" :open-delay="400" :disabled="isMobile">
          <button
            class="toolBtn iconBtn"
            :class="{ active: isItalic }"
            @click="toggleStyle('fontStyle', 'italic', 'normal')"
          >
            <span class="icon iconfont iconzitixieti"></span>
          </button>
        </el-tooltip>

        <el-tooltip content="删除线" placement="top" :open-delay="400" :disabled="isMobile">
          <button
            class="toolBtn iconBtn"
            :class="{ active: isStrike }"
            @click="toggleStyle('textDecoration', 'line-through', 'none')"
          >
            <span class="icon iconfont iconshanchuxian"></span>
          </button>
        </el-tooltip>
      </div>

      <div class="toolDivider"></div>

      <!-- 颜色设置 -->
      <div class="toolGroup">
        <!-- 文字颜色 -->
        <el-popover placement="bottom" trigger="click" popper-class="nodeFloatingPopover">
          <Color :color="textColor" @change="onTextColorChange"></Color>
          <button class="toolBtn colorBtn" slot="reference" title="文字颜色">
            <span class="icon iconfont iconzitiyanse"></span>
            <span class="colorIndicator" :style="{ backgroundColor: textColor }"></span>
          </button>
        </el-popover>

        <!-- 节点背景色 -->
        <el-popover placement="bottom" trigger="click" popper-class="nodeFloatingPopover">
          <Color :color="fillColor" @change="onFillColorChange"></Color>
          <button class="toolBtn colorBtn" slot="reference" title="节点背景颜色">
            <span class="icon iconfont iconbeijingyanse"></span>
            <span class="colorIndicator" :style="{ backgroundColor: fillColor || 'transparent' }"></span>
          </button>
        </el-popover>
      </div>

      <div class="toolDivider"></div>

      <!-- 节点属性 (备注 / 标签 / 链接) -->
      <div class="toolGroup">
        <el-tooltip content="添加/编辑备注" placement="top" :open-delay="400" :disabled="isMobile">
          <button class="toolBtn actionBtn" @click="showNote">
            <span class="icon iconfont iconflow-Mark"></span>
          </button>
        </el-tooltip>

        <el-tooltip content="添加标签" placement="top" :open-delay="400" :disabled="isMobile">
          <button class="toolBtn actionBtn" @click="showTag">
            <span class="icon iconfont iconbiaoqian"></span>
          </button>
        </el-tooltip>

        <el-tooltip content="添加超链接" placement="top" :open-delay="400" :disabled="isMobile">
          <button class="toolBtn actionBtn" @click="showLink">
            <span class="icon iconfont iconchaolianjie"></span>
          </button>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { fontFamilyList, fontSizeList } from '@/config'
import { isMobile } from 'simple-mind-map/src/utils/index'
import { getAiNotes } from '@/utils/aiNoteHelper'
import { setSingleNodeLanguageMode, translateSingleNode } from '@/utils/bilingualHelper'
import Color from './Color.vue'

export default {
  name: 'NodeFloatingToolbar',
  components: {
    Color
  },
  props: {
    mindMap: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isMobile: isMobile(),
      showToolbar: false,
      node: null,
      activeNodes: [],
      style: {
        left: '-9999px',
        top: '-9999px'
      },
      fontSizeList,
      currentFontSize: 16,
      currentFontFamily: '',
      isBold: false,
      isItalic: false,
      isStrike: false,
      textColor: '#1E293B',
      fillColor: '#FFFFFF',
      borderColor: '#2563EB',
      isRootNode: false,
      nodeAiNotesCount: 0,
      isTranslatingNode: false,
      bilingualPopoverVisible: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      enableAi: state => state.localConfig.enableAi,
      aiConfig: state => state.aiConfig,
      localConfig: state => state.localConfig
    }),
    fontFamilyList() {
      return fontFamilyList[this.$i18n.locale] || fontFamilyList.zh
    },
    currentFontFamilyName() {
      const match = this.fontFamilyList.find(
        f => f.value === this.currentFontFamily
      )
      if (match) return match.name
      return '字体'
    },
    nodeQuickToggleBtnText() {
      if (!this.node) return '中/英'
      const curText = (this.node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
      const trans = (this.node.getData('text_trans') || '').replace(/<[^>]+>/g, '').trim()
      if (!trans) return '中英翻译'
      if (/[\u4e00-\u9fa5]/.test(curText) && !curText.includes('\n')) {
        return '转英文'
      }
      return '转中文'
    },
    nodeQuickToggleTip() {
      return '点击一键在中英译文之间轮换切换'
    },
    nodeCurrentLangLabel() {
      if (!this.node) return ''
      const curText = (this.node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
      if (curText.includes('\n')) return '双语对照'
      return /[\u4e00-\u9fa5]/.test(curText) ? '中文' : '英文'
    },
    isNodeDisplayZh() {
      if (!this.node) return false
      const curText = (this.node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
      return !curText.includes('\n') && /[\u4e00-\u9fa5]/.test(curText)
    },
    isNodeDisplayEn() {
      if (!this.node) return false
      const curText = (this.node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
      return !curText.includes('\n') && !/[\u4e00-\u9fa5]/.test(curText)
    },
    isNodeDisplayDual() {
      if (!this.node) return false
      const curText = (this.node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
      return curText.includes('\n')
    }
  },
  mounted() {
    document.body.appendChild(this.$el)
    this.bindEvents()
  },
  beforeDestroy() {
    this.unbindEvents()
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el)
    }
  },
  methods: {
    bindEvents() {
      this.mindMap.on('node_active', this.onNodeActive)
      this.mindMap.on('scale', this.updatePosition)
      this.mindMap.on('translate', this.updatePosition)
      this.mindMap.on('draw_click', this.close)
      this.mindMap.on('svg_mousedown', this.close)
      this.mindMap.on('node_dblclick', this.close)
      this.mindMap.on('node_text_edit_open', this.close)
      this.$bus.$on('close_node_floating_toolbar', this.close)
    },
    unbindEvents() {
      this.mindMap.off('node_active', this.onNodeActive)
      this.mindMap.off('scale', this.updatePosition)
      this.mindMap.off('translate', this.updatePosition)
      this.mindMap.off('draw_click', this.close)
      this.mindMap.off('svg_mousedown', this.close)
      this.mindMap.off('node_dblclick', this.close)
      this.mindMap.off('node_text_edit_open', this.close)
      this.$bus.$off('close_node_floating_toolbar', this.close)
    },
    onNodeActive(node, activeNodeList) {
      this.$nextTick(() => {
        if (!node || !activeNodeList || activeNodeList.length === 0) {
          this.close()
          return
        }
        this.node = node
        this.activeNodes = [...activeNodeList]
        this.isRootNode = !!node.isRoot
        this.syncStylesFromNode()
        this.showToolbar = true
        this.$nextTick(() => {
          this.updatePosition()
        })
      })
    },
    syncStylesFromNode() {
      if (!this.node) return
      const fs = this.node.getStyle('fontSize', false)
      this.currentFontSize = fs ? parseInt(fs, 10) : 16
      this.currentFontFamily = this.node.getStyle('fontFamily', false) || ''
      this.isBold = this.node.getStyle('fontWeight', false) === 'bold'
      this.isItalic = this.node.getStyle('fontStyle', false) === 'italic'
      this.isStrike =
        this.node.getStyle('textDecoration', false) === 'line-through'
      this.textColor = this.node.getStyle('color', false) || '#1E293B'
      this.fillColor = this.node.getStyle('fillColor', false) || ''
      this.borderColor = this.node.getStyle('borderColor', false) || ''

      const notes = getAiNotes(this.node)
      this.nodeAiNotesCount = notes ? notes.length : 0
    },
    updatePosition() {
      if (!this.showToolbar || !this.node) return
      const rect = this.node.getRect ? this.node.getRect() : null
      if (!rect) {
        this.close()
        return
      }
      const toolbarEl = this.$refs.nodeFloatingToolbar
      if (!toolbarEl) return

      const toolbarWidth = toolbarEl.offsetWidth || 480
      const toolbarHeight = toolbarEl.offsetHeight || 44

      const nodeX = rect.x !== undefined ? rect.x : (rect.left || 0)
      const nodeY = rect.y !== undefined ? rect.y : (rect.top || 0)
      const nodeWidth = rect.width !== undefined ? rect.width : (rect.w || 0)
      const nodeHeight = rect.height !== undefined ? rect.height : (rect.h || 0)
      const nodeBottom = nodeY + nodeHeight

      const winWidth = window.innerWidth
      const winHeight = window.innerHeight

      let left = nodeX + nodeWidth / 2 - toolbarWidth / 2
      let top = nodeY - toolbarHeight - 12

      // 水平方向视口防溢出安全限制
      if (left + toolbarWidth > winWidth - 10) {
        left = winWidth - toolbarWidth - 10
      }
      if (left < 10) {
        left = 10
      }

      // 垂直方向视口防溢出安全限制（避开顶部 60px 标题栏与移动端底部操作条）
      const topSafeMargin = this.isMobile ? 65 : 60
      const bottomSafeMargin = this.isMobile ? 25 : 15

      if (top < topSafeMargin) {
        top = nodeBottom + 12
      }
      if (top + toolbarHeight > winHeight - bottomSafeMargin) {
        top = Math.max(topSafeMargin, winHeight - toolbarHeight - bottomSafeMargin)
      }

      this.style.left = `${Math.round(left)}px`
      this.style.top = `${Math.round(top)}px`
    },
    close() {
      this.showToolbar = false
      this.node = null
      this.activeNodes = []
      this.style.left = '-9999px'
      this.style.top = '-9999px'
    },

    // AI 释义
    handleAiExplain() {
      if (!this.node) return
      const text = (this.node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
      this.$bus.$emit('ai_explain', {
        text,
        node: this.node,
        mindMap: this.mindMap
      })
    },

    // AI 续写
    handleAiCreatePart() {
      if (!this.node) return
      this.$bus.$emit('ai_create_part', this.node)
    },

    // 打开 AI 备注箱 / 历史记录
    handleOpenAiNoteBox() {
      if (!this.node) return
      this.$bus.$emit('open_ai_note_box', {
        node: this.node,
        mindMap: this.mindMap
      })
    },

    // 快速一键中英轮换切换
    async handleQuickToggleNodeLang() {
      if (!this.node || this.isTranslatingNode) return
      this.isTranslatingNode = true
      try {
        const res = await setSingleNodeLanguageMode(this.node, 'toggle', this.aiConfig)
        if (res) {
          const modeLabel = res.mode === 'zh' ? '中文版' : (res.mode === 'en' ? '英文版' : '双语版')
          this.$message.success(`当前节点已切换为【${modeLabel}】`)
        }
      } catch (err) {
        console.error('切换单节点语言失败:', err)
        this.$message.error('切换失败，请检查 AI 模型配置')
      } finally {
        this.isTranslatingNode = false
      }
    },

    // 指定单节点切换语言（纯中文、纯英文、双语、重新翻译）
    async handleSwitchSingleNodeLang(targetMode) {
      if (!this.node || this.isTranslatingNode) return
      this.bilingualPopoverVisible = false
      this.isTranslatingNode = true
      try {
        const res = await setSingleNodeLanguageMode(this.node, targetMode, this.aiConfig)
        if (res) {
          const modeLabels = {
            zh: '纯中文版',
            en: '纯英文原版',
            dual: '双语对照版',
            retranslate: '最新 AI 译文'
          }
          this.$message.success(`当前节点已切换为【${modeLabels[targetMode] || targetMode}】`)
        }
      } catch (err) {
        console.error('更新单节点语言失败:', err)
        this.$message.error('操作失败，请检查 AI 模型配置')
      } finally {
        this.isTranslatingNode = false
      }
    },

    // 单节点双语即时翻译（兼容）
    async handleTranslateNode() {
      await this.handleQuickToggleNodeLang()
    },

    // 字号调节
    changeFontSizeStep(step) {
      let newSize = (this.currentFontSize || 16) + step
      if (newSize < 10) newSize = 10
      if (newSize > 64) newSize = 64
      this.setFontSize(newSize)
    },
    setFontSize(size) {
      this.currentFontSize = size
      this.applyStyle('fontSize', size)
    },
    // 字体调节
    setFontFamily(family) {
      this.currentFontFamily = family
      this.applyStyle('fontFamily', family)
    },
    // 格式切换
    toggleStyle(prop, onVal, offVal) {
      const currentVal = this.node.getStyle(prop, false)
      const nextVal = currentVal === onVal ? offVal : onVal
      if (prop === 'fontWeight') this.isBold = nextVal === 'bold'
      if (prop === 'fontStyle') this.isItalic = nextVal === 'italic'
      if (prop === 'textDecoration') this.isStrike = nextVal === 'line-through'
      this.applyStyle(prop, nextVal)
    },
    // 颜色修改
    onTextColorChange(color) {
      this.textColor = color
      this.applyStyle('color', color)
    },
    onFillColorChange(color) {
      this.fillColor = color
      this.applyStyle('fillColor', color)
    },
    // 批量应用样式
    applyStyle(prop, val) {
      if (!this.activeNodes || this.activeNodes.length === 0) return
      this.activeNodes.forEach(node => {
        node.setStyle(prop, val)
      })
      this.$nextTick(() => {
        this.updatePosition()
      })
    },
    // 节点命令
    insertChild() {
      this.mindMap.execCommand('INSERT_CHILD_NODE')
    },
    insertSibling() {
      this.mindMap.execCommand('INSERT_NODE')
    },
    deleteNode() {
      this.mindMap.execCommand('REMOVE_NODE')
      this.close()
    },
    showNote() {
      this.$bus.$emit('showNodeNote', this.node)
    },
    showTag() {
      this.$bus.$emit('showNodeTag', this.node)
    },
    showLink() {
      this.$bus.$emit('showNodeLink', this.node)
    }
  }
}
</script>

<style lang="less" scoped>
.nodeFloatingToolbar {
  position: fixed;
  z-index: 1002;
  display: flex;
  align-items: center;
  max-width: calc(100vw - 20px);
  box-sizing: border-box;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12),
    0 8px 10px -6px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
  user-select: none;
  transition: opacity 0.15s ease;

  .toolbarScroll {
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &.isDark {
    background: rgba(30, 41, 59, 0.96);
    border-color: #334155;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);

    .toolBtn {
      color: #e2e8f0;

      &:hover {
        background: #334155;
      }

      &.active {
        background: #2563eb;
        color: #ffffff;
      }
    }

    .toolDivider {
      background: #334155;
    }

    .fontSizeDisplay {
      border-color: #334155;
      color: #f1f5f9;
    }

    .fontFamBtn {
      border-color: #334155;
      color: #f1f5f9;
    }

    .aiFeatureGroup {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(168, 85, 247, 0.2) 100%);
      border-color: rgba(139, 92, 246, 0.4);

      .aiBtn {
        color: #c7d2fe;

        &:hover {
          background: rgba(99, 102, 241, 0.25);
          color: #ffffff;
        }

        &.explainBtn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: #ffffff;
        }
      }
    }
  }

  /* AI 功能组高亮微渐变风格 */
  .aiFeatureGroup {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.1) 100%);
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 8px;
    padding: 2px 4px;
    display: flex;
    align-items: center;
    gap: 3px;

    .aiBtn {
      font-weight: 500;
      color: #6366f1;
      padding: 0 8px;
      gap: 4px;

      &:hover {
        background: rgba(99, 102, 241, 0.12);
        color: #4f46e5;
      }

      &.explainBtn {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: #ffffff;
        font-weight: 600;
        box-shadow: 0 2px 6px -1px rgba(99, 102, 241, 0.4);

        &:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          box-shadow: 0 4px 10px -1px rgba(99, 102, 241, 0.5);
        }

        .aiSparkle {
          font-size: 13px;
        }
      }

      .btnText {
        font-size: 12px;
        white-space: nowrap;
      }

      .aiNoteBadge {
        background: #ec4899;
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        height: 15px;
        min-width: 15px;
        padding: 0 4px;
        border-radius: 10px;
        line-height: 15px;
        text-align: center;
        margin-left: 2px;
      }
    }
  }

  .toolGroup {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .toolDivider {
    width: 1px;
    height: 18px;
    background: #e2e8f0;
    margin: 0 3px;
    flex-shrink: 0;
  }

  .toolBtn {
    height: 28px;
    min-width: 28px;
    padding: 0 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #334155;
    font-size: 13px;
    cursor: pointer;
    outline: none;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    &.active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: bold;
    }

    .icon {
      font-size: 15px;
    }

    &.fontStepBtn {
      font-size: 11px;
      font-weight: 700;
      padding: 0 5px;
    }

    &.fontSizeDisplay {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 0 6px;
      font-weight: 600;
      font-size: 12px;
      gap: 3px;
    }

    &.fontFamBtn {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 0 6px;
      max-width: 90px;
      gap: 3px;

      .fontNameShow {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
      }
    }

    .arrowIcon {
      font-size: 10px;
      opacity: 0.7;
    }

    &.colorBtn {
      position: relative;
      flex-direction: column;
      padding: 3px 6px;

      .colorIndicator {
        width: 14px;
        height: 3px;
        border-radius: 1px;
        margin-top: 1px;
        box-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
      }
    }

    &.deleteBtn:hover {
      background: #fee2e2;
      color: #ef4444;
    }
  }

  /* 移动端触屏适配增强 */
  &.isMobile {
    padding: 6px 8px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
    touch-action: pan-x;

    .toolBtn {
      height: 36px;
      min-width: 36px;
      padding: 0 8px;
      font-size: 13px;

      .icon {
        font-size: 17px;
      }

      &.fontSizeDisplay,
      &.fontFamBtn {
        height: 36px;
      }

      &.fontStepBtn {
        font-size: 12px;
      }
    }

    .toolDivider {
      height: 22px;
      margin: 0 4px;
    }

    .aiFeatureGroup {
      padding: 3px 5px;

      .aiBtn {
        height: 36px;
        padding: 0 9px;

        &.explainBtn .aiSparkle {
          font-size: 15px;
        }

        .btnText {
          font-size: 13px;
        }
      }
    }
  }
}
</style>

<style lang="less">
.nodeFloatingPopover {
  padding: 6px !important;
  border-radius: 8px !important;
}

.fontSizeListDropdown {
  max-height: 220px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  width: 130px;

  &.isDark {
    .fontSizeItem {
      color: #cbd5e1;

      &:hover {
        background: #334155;
      }

      &.active {
        background: #2563eb;
        color: #fff;
      }
    }
  }

  .fontSizeItem {
    padding: 6px 8px;
    font-size: 12px;
    text-align: center;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: #f1f5f9;
    }

    &.active {
      background: #2563eb;
      color: #fff;
      font-weight: bold;
    }
  }
}

.fontFamilyDropdown {
  max-height: 260px;
  overflow-y: auto;
  width: 180px;

  &.isDark {
    .fontFamilyItem {
      color: #cbd5e1;

      &:hover {
        background: #334155;
      }

      &.active {
        background: #2563eb;
        color: #fff;
      }
    }
  }

  .fontFamilyItem {
    padding: 7px 10px;
    font-size: 13px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: all 0.15s;

    &:hover {
      background: #f1f5f9;
    }

    &.active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: bold;
    }
  }
}

.nodeBilingualBtnGroup {
  display: flex;
  align-items: center;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 6px;
  overflow: hidden;

  .translateBtn {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    padding-right: 4px;
  }

  .arrowDropdownBtn {
    padding: 0 4px;
    height: 28px;
    border: none;
    background: transparent;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    color: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      background: rgba(99, 102, 241, 0.2);
    }

    .arrowIcon {
      font-size: 11px;
    }
  }
}

.nodeBilingualMenu {
  width: 230px;
  padding: 4px 0;

  &.isDark {
    .menuHeader {
      border-color: #334155;
      color: #94a3b8;
    }
    .menuItem {
      color: #e2e8f0;
      &:hover {
        background: #334155;
      }
      &.active {
        background: rgba(37, 99, 235, 0.25);
        color: #60a5fa;
      }
      .itemText .desc {
        color: #64748b;
      }
    }
    .menuDivider {
      background: #334155;
    }
  }

  .menuHeader {
    padding: 6px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    font-size: 12px;
    font-weight: 600;
    color: #475569;

    .currStatus {
      font-size: 11px;
      color: #3b82f6;
      font-weight: normal;
    }
  }

  .menuItem {
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: #f8fafc;
    }

    &.active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: 600;

      .itemText .desc {
        color: #3b82f6;
      }
    }

    .itemIcon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .itemText {
      flex: 1;
      overflow: hidden;

      .name {
        font-size: 13px;
        line-height: 1.2;
      }

      .desc {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
      }
    }

    .checkIcon {
      font-size: 13px;
      color: #2563eb;
      font-weight: bold;
    }

    &.retransItem {
      color: #6366f1;
    }
  }

  .menuDivider {
    height: 1px;
    background: #f1f5f9;
    margin: 4px 0;
  }
}
</style>
