<template>
  <div
    class="sidebarContainer"
    @click.stop
    :class="{ show: show, isDark: isDark }"
    :style="sidebarStyle"
  >
    <span class="closeBtn el-icon-close" @click="close"></span>
    <div class="sidebarHeader" v-if="title">
      {{ title }}
    </div>
    <div class="sidebarContent customScrollbar" ref="sidebarContent">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import { store } from '@/config'
import { mapState, mapMutations } from 'vuex'

// 侧边栏容器
export default {
  props: {
    title: {
      type: String,
      default: ''
    },
    width: {
      type: String,
      default: '300px'
    }
  },
  data() {
    return {
      show: false,
      zIndex: 1000
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark
    }),
    sidebarStyle() {
      const widthVal = this.width || '300px'
      return {
        zIndex: Math.max(999, this.zIndex || 999),
        width: widthVal,
        right: this.show ? '0px' : `-${widthVal}`
      }
    }
  },
  watch: {
    show(val, oldVal) {
      if (val && !oldVal) {
        this.zIndex = Math.max(1000, store.sidebarZIndex++)
      }
    }
  },
  created() {
    this.$bus.$on('closeSideBar', this.handleCloseSidebar)
    this.$bus.$on('svg_mousedown', this.handleCanvasClick)
    this.$bus.$on('draw_click', this.handleCanvasClick)
    window.addEventListener('keydown', this.handleKeyDown)
  },
  beforeDestroy() {
    this.$bus.$off('closeSideBar', this.handleCloseSidebar)
    this.$bus.$off('svg_mousedown', this.handleCanvasClick)
    this.$bus.$off('draw_click', this.handleCanvasClick)
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    ...mapMutations(['setActiveSidebar']),

    handleCanvasClick() {
      if (this.show) {
        this.close()
      }
    },

    handleKeyDown(e) {
      if (e.key === 'Escape' && this.show) {
        this.close()
      }
    },

    handleCloseSidebar() {
      this.close()
    },

    close() {
      this.show = false
      this.setActiveSidebar(null)
    },

    getEl() {
      return this.$refs.sidebarContent
    }
  }
}
</script>

<style lang="less" scoped>
.sidebarContainer {
  position: fixed;
  right: -300px;
  top: 70px;
  bottom: 0;
  width: 300px;
  background-color: #fff;
  border-left: 1px solid #e2e8f0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  transition: right 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 999;

  &.isDark {
    background-color: #262a2e;
    border-left-color: hsla(0, 0%, 100%, 0.1);

    .sidebarHeader {
      border-bottom-color: hsla(0, 0%, 100%, 0.1);
      color: #fff;
    }

    .closeBtn {
      color: #fff;
    }
  }

  &.show {
    right: 0;
  }

  .closeBtn {
    position: absolute;
    right: 20px;
    top: 12px;
    font-size: 20px;
    cursor: pointer;
  }

  .sidebarHeader {
    width: 100%;
    height: 44px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-grow: 0;
    flex-shrink: 0;
  }

  .sidebarContent {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
}
</style>
