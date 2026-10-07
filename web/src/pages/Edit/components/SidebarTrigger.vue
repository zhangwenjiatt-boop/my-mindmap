<template>
  <div
    class="sidebarTriggerContainer"
    @click.stop
    :class="{ hasActive: show && activeSidebar, show: show, isDark: isDark }"
    :style="{ maxHeight: maxHeight + 'px' }"
  >
    <div
      class="toggleShowBtn"
      :class="{ hide: !show }"
      @click="toggleShow"
      :title="show ? '收起右侧工具栏' : '展开吸边工具栏'"
    >
      <span class="iconfont iconjiantouyou"></span>
    </div>
    <div class="trigger customScrollbar">
      <div
        class="triggerItem"
        v-for="item in triggerList"
        :key="item.value"
        :class="{ active: activeSidebar === item.value }"
        @click="trigger(item)"
      >
        <div class="triggerIcon iconfont" :class="[item.icon]"></div>
        <div class="triggerName">{{ item.name }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { sidebarTriggerList } from '@/config'

// 侧边栏触发器
export default {
  data() {
    return {
      show: true,
      maxHeight: 0
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      activeSidebar: state => state.activeSidebar,
      isReadonly: state => state.isReadonly,
      enableAi: state => state.localConfig.enableAi
    }),

    triggerList() {
      let list = sidebarTriggerList[this.$i18n.locale] || sidebarTriggerList.zh
      if (this.isReadonly) {
        list = list.filter(item => {
          return ['outline', 'shortcutKey', 'ai'].includes(item.value)
        })
      }
      if (!this.enableAi) {
        list = list.filter(item => {
          return item.value !== 'ai'
        })
      }
      return list
    }
  },
  watch: {
    isReadonly(val) {
      if (val) {
        this.setActiveSidebar(null)
      }
    }
  },
  created() {
    window.addEventListener('resize', this.onResize)
    this.updateSize()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    ...mapMutations(['setActiveSidebar']),

    trigger(item) {
      if (this.activeSidebar === item.value) {
        this.setActiveSidebar(null)
      } else {
        this.setActiveSidebar(item.value)
      }
    },

    toggleShow() {
      this.show = !this.show
      if (!this.show && this.activeSidebar) {
        this.setActiveSidebar(null)
      }
    },

    onResize() {
      this.updateSize()
    },

    updateSize() {
      const topMargin = 70
      const bottomMargin = 80
      this.maxHeight = window.innerHeight - topMargin - bottomMargin
    }
  }
}
</script>

<style lang="less" scoped>
.sidebarTriggerContainer {
  position: fixed;
  top: 70px;
  bottom: 80px;
  right: -58px;
  transition: right 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1001;
  pointer-events: auto;

  &.isDark {
    .trigger {
      background-color: #262a2e;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: -4px 0 16px rgba(0, 0, 0, 0.35);

      .triggerItem {
        color: hsla(0, 0%, 100%, 0.65);

        &:hover {
          background-color: hsla(0, 0%, 100%, 0.08);
          color: #fff;
        }

        &.active {
          color: #409eff;
          background-color: hsla(211, 100%, 60%, 0.12);
        }
      }
    }
  }

  &.show {
    right: 0;
  }

  &.hasActive {
    right: 300px;

    .trigger {
      border-right: 1px solid #e2e8f0;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.05);
    }
  }

  .toggleShowBtn {
    position: absolute;
    left: -8px;
    width: 24px;
    height: 48px;
    background: #409eff;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    transition: all 0.2s;
    z-index: 1;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -2px 0 6px rgba(64, 158, 255, 0.3);

    &.hide {
      left: -24px;
      border-radius: 8px 0 0 8px;

      span {
        transform: rotateZ(180deg);
      }
    }

    &:hover {
      background: #66b1ff;
      left: -12px;
      &.hide {
        left: -24px;
      }
    }

    span {
      color: #fff;
      font-size: 12px;
      transition: all 0.2s;
    }
  }

  .trigger {
    position: relative;
    width: 58px;
    border: 1px solid #e2e8f0;
    border-right: none;
    background-color: #fff;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.06);
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    user-select: none;

    .triggerItem {
      height: 58px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      color: #475569;
      user-select: none;
      white-space: nowrap;
      transition: all 0.15s;

      &:hover {
        background-color: #f8fafc;
        color: #2563eb;
      }

      &.active {
        color: #2563eb;
        background-color: #eff6ff;
        font-weight: 600;
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          background: #2563eb;
          border-radius: 0 2px 2px 0;
        }
      }

      .triggerIcon {
        font-size: 18px;
        margin-bottom: 4px;
      }

      .triggerName {
        font-size: 12px;
      }
    }
  }
}
</style>
