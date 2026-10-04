<template>
  <div
    class="nodeFloatingToolbar"
    ref="nodeFloatingToolbar"
    :style="style"
    :class="{ isDark: isDark }"
    @click.stop.passive
    v-show="showToolbar && node"
  >
    <!-- 字号调节区 -->
    <div class="toolGroup">
      <el-tooltip content="缩小字号 (A-)" placement="top" :open-delay="400">
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

      <el-tooltip content="放大字号 (A+)" placement="top" :open-delay="400">
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
      <el-tooltip content="加粗 (Ctrl+B)" placement="top" :open-delay="400">
        <button
          class="toolBtn iconBtn"
          :class="{ active: isBold }"
          @click="toggleStyle('fontWeight', 'bold', 'normal')"
        >
          <span class="icon iconfont iconzitijiacu"></span>
        </button>
      </el-tooltip>

      <el-tooltip content="斜体 (Ctrl+I)" placement="top" :open-delay="400">
        <button
          class="toolBtn iconBtn"
          :class="{ active: isItalic }"
          @click="toggleStyle('fontStyle', 'italic', 'normal')"
        >
          <span class="icon iconfont iconzitixieti"></span>
        </button>
      </el-tooltip>

      <el-tooltip content="删除线" placement="top" :open-delay="400">
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

    <!-- 结构节点快捷操作 -->
    <div class="toolGroup">
      <el-tooltip content="插入子节点 (Tab)" placement="top" :open-delay="400">
        <button class="toolBtn actionBtn" @click="insertChild">
          <span class="icon iconfont icontianjiazijiedian"></span>
        </button>
      </el-tooltip>

      <el-tooltip
        content="插入同级节点 (Enter)"
        placement="top"
        :open-delay="400"
        v-if="!isRootNode"
      >
        <button class="toolBtn actionBtn" @click="insertSibling">
          <span class="icon iconfont iconjiedian"></span>
        </button>
      </el-tooltip>

      <el-tooltip content="删除节点 (Del)" placement="top" :open-delay="400">
        <button class="toolBtn actionBtn deleteBtn" @click="deleteNode">
          <span class="icon iconfont iconshanchu"></span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolDivider"></div>

    <!-- 节点属性 (备注 / 标签 / 链接) -->
    <div class="toolGroup">
      <el-tooltip content="添加/编辑备注" placement="top" :open-delay="400">
        <button class="toolBtn actionBtn" @click="showNote">
          <span class="icon iconfont iconflow-Mark"></span>
        </button>
      </el-tooltip>

      <el-tooltip content="添加标签" placement="top" :open-delay="400">
        <button class="toolBtn actionBtn" @click="showTag">
          <span class="icon iconfont iconbiaoqian"></span>
        </button>
      </el-tooltip>

      <el-tooltip content="添加超链接" placement="top" :open-delay="400">
        <button class="toolBtn actionBtn" @click="showLink">
          <span class="icon iconfont iconchaolianjie"></span>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { fontFamilyList, fontSizeList } from '@/config'
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
      isRootNode: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark
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
    },
    updatePosition() {
      if (!this.showToolbar || !this.node) return
      const rect = this.node.getRect ? this.node.getRect() : null
      if (!rect) {
        this.close()
        return
      }
      const toolbarEl = this.$refs.nodeFloatingToolbar
      const toolbarWidth = toolbarEl ? toolbarEl.offsetWidth || 440 : 440
      const toolbarHeight = toolbarEl ? toolbarEl.offsetHeight || 44 : 44

      const nodeX = rect.x !== undefined ? rect.x : (rect.left || 0)
      const nodeY = rect.y !== undefined ? rect.y : (rect.top || 0)
      const nodeWidth = rect.width !== undefined ? rect.width : (rect.w || 0)
      const nodeHeight = rect.height !== undefined ? rect.height : (rect.h || 0)
      const nodeBottom = nodeY + nodeHeight

      let left = nodeX + nodeWidth / 2 - toolbarWidth / 2
      let top = nodeY - toolbarHeight - 12

      const winWidth = window.innerWidth
      if (top < 65) {
        top = nodeBottom + 12
      }
      if (left < 12) {
        left = 12
      } else if (left + toolbarWidth > winWidth - 12) {
        left = winWidth - toolbarWidth - 12
      }

      this.style.left = `${left}px`
      this.style.top = `${top}px`
    },
    close() {
      this.showToolbar = false
      this.node = null
      this.activeNodes = []
      this.style.left = '-9999px'
      this.style.top = '-9999px'
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
  gap: 4px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12),
    0 8px 10px -6px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
  user-select: none;
  transition: opacity 0.15s ease;

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
  }

  .toolGroup {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolDivider {
    width: 1px;
    height: 18px;
    background: #e2e8f0;
    margin: 0 3px;
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
</style>
