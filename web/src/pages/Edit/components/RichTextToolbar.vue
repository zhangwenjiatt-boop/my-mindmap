<template>
  <div
    class="richTextToolbar"
    ref="richTextToolbar"
    :style="style"
    :class="{ isDark: isDark, isMobile: isMobile }"
    @click.stop
    v-show="showRichTextToolbar"
  >
    <el-tooltip :content="$t('richTextToolbar.bold')" placement="top" :disabled="isMobile">
      <div class="btn" :class="{ active: formatInfo.bold }" @click="toggleBold">
        <span class="icon iconfont iconzitijiacu"></span>
      </div>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.italic')" placement="top" :disabled="isMobile">
      <div
        class="btn"
        :class="{ active: formatInfo.italic }"
        @click="toggleItalic"
      >
        <span class="icon iconfont iconzitixieti"></span>
      </div>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.underline')" placement="top" :disabled="isMobile">
      <div
        class="btn"
        :class="{ active: formatInfo.underline }"
        @click="toggleUnderline"
      >
        <span class="icon iconfont iconzitixiahuaxian"></span>
      </div>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.strike')" placement="top" :disabled="isMobile">
      <div
        class="btn"
        :class="{ active: formatInfo.strike }"
        @click="toggleStrike"
      >
        <span class="icon iconfont iconshanchuxian"></span>
      </div>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.fontFamily')" placement="top" :disabled="isMobile">
      <el-popover placement="bottom" trigger="click">
        <div class="fontOptionsList" :class="{ isDark: isDark }">
          <div
            class="fontOptionItem"
            v-for="item in fontFamilyList"
            :key="item.value"
            :style="{ fontFamily: item.value }"
            :class="{ active: formatInfo.font === item.value }"
            @click="changeFontFamily(item.value)"
          >
            {{ item.name }}
          </div>
        </div>
        <div class="btn" slot="reference">
          <span class="icon iconfont iconxingzhuang-wenzi"></span>
        </div>
      </el-popover>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.fontSize')" placement="top" :disabled="isMobile">
      <el-popover placement="bottom" trigger="click">
        <div class="fontOptionsList" :class="{ isDark: isDark }">
          <div
            class="fontOptionItem"
            v-for="item in fontSizeList"
            :key="item"
            :style="{
              fontSize: item + 'px',
              height: (item < 30 ? 30 : item + 10) + 'px'
            }"
            :class="{ active: formatInfo.size === item + 'px' }"
            @click="changeFontSize(item)"
          >
            {{ item }}px
          </div>
        </div>
        <div class="btn" slot="reference">
          <span class="icon iconfont iconcase fontColor"></span>
        </div>
      </el-popover>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.color')" placement="top" :disabled="isMobile">
      <el-popover placement="bottom" trigger="click">
        <Color :color="fontColor" @change="changeFontColor"></Color>
        <div class="btn" slot="reference" :style="{ color: formatInfo.color }">
          <span class="icon iconfont iconzitiyanse"></span>
        </div>
      </el-popover>
    </el-tooltip>

    <el-tooltip
      :content="$t('richTextToolbar.backgroundColor')"
      placement="top"
      :disabled="isMobile"
    >
      <el-popover placement="bottom" trigger="click">
        <Color
          :color="fontBackgroundColor"
          @change="changeFontBackgroundColor"
        ></Color>
        <div class="btn" slot="reference">
          <span class="icon iconfont iconbeijingyanse"></span>
        </div>
      </el-popover>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.textAlign')" placement="top" :disabled="isMobile">
      <el-popover placement="bottom" trigger="click">
        <div class="fontOptionsList" :class="{ isDark: isDark }">
          <div
            class="fontOptionItem"
            v-for="item in alignList"
            :key="item.value"
            :class="{ active: formatInfo.align === item.value }"
            @click="changeTextAlign(item.value)"
          >
            {{ item.name }}
          </div>
        </div>
        <div class="btn" slot="reference">
          <span class="icon iconfont iconjuzhongduiqi"></span>
        </div>
      </el-popover>
    </el-tooltip>

    <el-tooltip :content="$t('richTextToolbar.removeFormat')" placement="top" :disabled="isMobile">
      <div class="btn" @click="removeFormat">
        <span class="icon iconfont iconqingchu"></span>
      </div>
    </el-tooltip>

    <!-- AI 释义 -->
    <el-tooltip content="AI 概念释义与知识助手" placement="top" v-if="enableAi" :disabled="isMobile">
      <div class="btn aiBtn" @click="handleAiExplain">
        <span class="icon iconfont iconAIshengcheng"></span>
      </div>
    </el-tooltip>
  </div>
</template>

<script>
import { fontFamilyList, fontSizeList, alignList } from '@/config'
import Color from './Color.vue'
import { mapState } from 'vuex'
import { isMobile } from 'simple-mind-map/src/utils/index'

export default {
  components: {
    Color
  },
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      isMobile: isMobile(),
      fontSizeList,
      showRichTextToolbar: false,
      style: {
        left: 0,
        top: 0
      },
      fontColor: '',
      fontBackgroundColor: '',
      formatInfo: {}
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      enableAi: state => state.localConfig.enableAi
    }),

    fontFamilyList() {
      return fontFamilyList[this.$i18n.locale] || fontFamilyList.zh
    },

    alignList() {
      return alignList[this.$i18n.locale] || alignList.zh
    }
  },
  created() {
    this.$bus.$on('rich_text_selection_change', this.onRichTextSelectionChange)
  },
  mounted() {
    document.body.append(this.$refs.richTextToolbar)
  },
  beforeDestroy() {
    this.$bus.$off('rich_text_selection_change', this.onRichTextSelectionChange)
  },
  methods: {
    onRichTextSelectionChange(hasRange, rect, formatInfo) {
      if (hasRange && rect) {
        const winWidth = window.innerWidth
        let left = rect.left + rect.width / 2
        let top = rect.top - 60
        if (top < 65) {
          top = (rect.bottom || rect.top + 30) + 12
        }
        if (left < 20) left = 20
        if (left > winWidth - 20) left = winWidth - 20

        this.style.left = left + 'px'
        this.style.top = top + 'px'
        this.formatInfo = { ...(formatInfo || {}) }
      }
      this.showRichTextToolbar = hasRange
    },

    toggleBold() {
      this.formatInfo.bold = !this.formatInfo.bold
      this.mindMap.richText.formatText({
        bold: this.formatInfo.bold
      })
    },

    toggleItalic() {
      this.formatInfo.italic = !this.formatInfo.italic
      this.mindMap.richText.formatText({
        italic: this.formatInfo.italic
      })
    },

    toggleUnderline() {
      this.formatInfo.underline = !this.formatInfo.underline
      this.mindMap.richText.formatText({
        underline: this.formatInfo.underline
      })
    },

    toggleStrike() {
      this.formatInfo.strike = !this.formatInfo.strike
      this.mindMap.richText.formatText({
        strike: this.formatInfo.strike
      })
    },

    changeFontFamily(font) {
      this.formatInfo.font = font
      this.mindMap.richText.formatText({
        font
      })
    },

    changeFontSize(size) {
      this.formatInfo.size = size
      this.mindMap.richText.formatText({
        size: size + 'px'
      })
    },

    changeFontColor(color) {
      this.formatInfo.color = color
      this.mindMap.richText.formatText({
        color
      })
    },

    changeFontBackgroundColor(background) {
      this.formatInfo.background = background
      this.mindMap.richText.formatText({
        background
      })
    },

    changeTextAlign(align) {
      this.formatInfo.align = align
      this.mindMap.richText.formatText({
        align
      })
    },

    removeFormat() {
      this.mindMap.richText.removeFormat()
    },

    handleAiExplain() {
      let selectedText = ''
      try {
        const sel = window.getSelection()
        if (sel) {
          selectedText = sel.toString().trim()
        }
      } catch (e) {
        console.error(e)
      }

      const activeNodes = (this.mindMap && this.mindMap.renderer)
        ? this.mindMap.renderer.activeNodeList
        : []
      const node = activeNodes.length > 0 ? activeNodes[0] : null

      if (!selectedText && node) {
        selectedText = (node.getData('text') || '').replace(/<[^>]+>/g, '').trim()
      }

      this.$bus.$emit('ai_explain', {
        text: selectedText,
        node: node
      })
    }
  }
}
</script>

<style lang="less" scoped>
.richTextToolbar {
  position: fixed;
  z-index: 2000;
  height: 48px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  transform: translateX(-50%);
  max-width: calc(100vw - 20px);
  box-sizing: border-box;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &.isDark {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.4);

    .btn {
      color: #e2e8f0;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      &.aiBtn {
        color: #818cf8;
        border-left-color: #334155;

        &:hover {
          background: rgba(99, 102, 241, 0.2);
          color: #c7d2fe;
        }
      }
    }
  }

  .btn {
    width: 44px;
    height: 48px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background-color: #f1f5f9;
    }

    &.active {
      color: #2563eb;
    }

    &.aiBtn {
      color: #6366f1;
      border-left: 1px solid rgba(0, 0, 0, 0.08);

      &:hover {
        background-color: #eff6ff;
        color: #4f46e5;
      }
    }

    .icon {
      font-size: 18px;

      &.fontColor {
        font-size: 22px;
      }
    }
  }

  &.isMobile {
    height: 42px;

    .btn {
      width: 38px;
      height: 42px;

      .icon {
        font-size: 16px;
      }
    }
  }
}

.fontOptionsList {
  width: 150px;

  &.isDark {
    .fontOptionItem {
      color: #fff;

      &:hover {
        background-color: hsla(0, 0%, 100%, 0.05);
      }
    }
  }

  .fontOptionItem {
    height: 30px;
    width: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;

    &:hover {
      background-color: #f7f7f7;
    }

    &.active {
      color: #2563eb;
    }
  }
}
</style>
