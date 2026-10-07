<template>
  <div class="toolbarContainer" :class="{ isDark: isDark }">
    <!-- 展开工具栏悬浮把手（当工具栏收起/隐藏时显示） -->
    <transition name="el-zoom-in-top">
      <div
        class="toolbarFloatingTrigger"
        v-if="isToolbarHidden"
        :style="triggerStyle"
        @click="toggleToolbar(true)"
        title="展开编辑工具栏 (快捷键 Alt+H)"
      >
        <i class="el-icon-arrow-down"></i>
        <span class="triggerText">展开编辑工具栏</span>
      </div>
    </transition>

    <div
      class="toolbar"
      ref="toolbarRef"
      :style="toolbarStyle"
      :class="{ isDragging: isDraggingToolbar, isHidden: isToolbarHidden }"
    >
      <!-- 移动拖拽手柄 -->
      <div
        class="toolbarDragGrip"
        @pointerdown="startDrag"
        @dblclick="resetPosition"
        title="按住鼠标拖拽移动工具栏，双击恢复默认居中"
      >
        <span class="gripIcon el-icon-rank"></span>
        <span class="gripText">移动</span>
      </div>

      <!-- 节点操作与插入元素 -->
      <div class="toolbarBlock">
        <ToolbarNodeBtnList :list="horizontalList"></ToolbarNodeBtnList>
        <!-- 更多 -->
        <el-popover
          v-model="popoverShow"
          placement="bottom-end"
          width="120"
          trigger="hover"
          v-if="showMoreBtn"
          :style="{ marginLeft: horizontalList.length > 0 ? '20px' : 0 }"
        >
          <ToolbarNodeBtnList
            dir="v"
            :list="verticalList"
            @click.native="popoverShow = false"
          ></ToolbarNodeBtnList>
          <div slot="reference" class="toolbarBtn">
            <span class="icon iconfont icongongshi"></span>
            <span class="text">{{ $t('toolbar.more') }}</span>
          </div>
        </el-popover>
      </div>

      <!-- 收起隐藏按钮 -->
      <div class="toolbarBlock" style="padding: 0 4px;">
        <div
          class="toolbarBtn hideToolbarBtn"
          @click="toggleToolbar(false)"
          title="收起/隐藏编辑工具栏 (快捷键 Alt+H)"
          style="margin-right: 0;"
        >
          <span class="icon el-icon-arrow-up" style="font-size: 15px;"></span>
          <span class="text">隐藏</span>
        </div>
      </div>
    </div>

    <!-- 本地文件树抽屉 -->
    <div
      class="fileTreeBox"
      v-if="fileTreeVisible"
      :class="{ expand: fileTreeExpand }"
    >
      <div class="fileTreeToolbar">
        <div class="fileTreeName">
          {{ rootDirName ? '/' + rootDirName : '' }}
        </div>
        <div class="fileTreeActionList">
          <div
            class="btn"
            :class="[
              fileTreeExpand ? 'el-icon-arrow-up' : 'el-icon-arrow-down'
            ]"
            @click="fileTreeExpand = !fileTreeExpand"
          ></div>
          <div
            class="btn el-icon-close"
            @click="fileTreeVisible = false"
          ></div>
        </div>
      </div>
      <div class="fileTreeWrap">
        <el-tree
          :props="fileTreeProps"
          :load="loadFileTreeNode"
          :expand-on-click-node="false"
          node-key="id"
          lazy
        >
          <span class="customTreeNode" slot-scope="{ node, data }">
            <div class="treeNodeInfo">
              <span
                class="treeNodeIcon iconfont"
                :class="[
                  data.type === 'file' ? 'iconwenjian' : 'icondakai'
                ]"
              ></span>
              <span class="treeNodeName">{{ node.label }}</span>
            </div>
            <div class="treeNodeBtnList" v-if="data.type === 'file'">
              <el-button
                type="text"
                size="mini"
                v-if="data.enableEdit"
                @click="editLocalFile(data)"
                >编辑</el-button
              >
              <el-button
                type="text"
                size="mini"
                v-else
                @click="importLocalFile(data)"
                >导入</el-button
              >
            </div>
          </span>
        </el-tree>
      </div>
    </div>
    <!-- 模态框与弹窗挂载 -->
    <NodeImage></NodeImage>
    <NodeHyperlink></NodeHyperlink>
    <NodeIcon></NodeIcon>
    <NodeNote></NodeNote>
    <NodeTag></NodeTag>
    <Export></Export>
    <Import ref="ImportRef"></Import>
  </div>
</template>

<script>
import NodeImage from './NodeImage.vue'
import NodeHyperlink from './NodeHyperlink.vue'
import NodeIcon from './NodeIcon.vue'
import NodeNote from './NodeNote.vue'
import NodeTag from './NodeTag.vue'
import Export from './Export.vue'
import Import from './Import.vue'
import { mapState, mapMutations } from 'vuex'
import { Notification } from 'element-ui'
import exampleData from 'simple-mind-map/example/exampleData'
import { getData } from '../../../api'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { throttle, isMobile } from 'simple-mind-map/src/utils/index'
import { switchMindMapBilingualMode, syncUntranslatedNodes } from '@/utils/bilingualHelper'

// 工具栏
let fileHandle = null
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'deleteNode',
  'image',
  'icon',
  'link',
  'note',
  'tag',
  'summary',
  'associativeLine',
  'formula',
  // 'attachment',
  'outerFrame',
  'annotation',
  'ai'
]

export default {
  components: {
    NodeImage,
    NodeHyperlink,
    NodeIcon,
    NodeNote,
    NodeTag,
    Export,
    Import,
    ToolbarNodeBtnList
  },
  data() {
    return {
      isMobile: isMobile(),
      horizontalList: [],
      verticalList: [],
      showMoreBtn: true,
      popoverShow: false,
      fileTreeProps: {
        label: 'name',
        children: 'children',
        isLeaf: 'leaf'
      },
      fileTreeVisible: false,
      rootDirName: '',
      fileTreeExpand: true,
      waitingWriteToLocalFile: false,
      hasSplitEditor: false,
      splitEditorWidth: 440,
      splitEditorCollapsed: false,
      isSplitDragging: false,
      isToolbarHidden: false,
      isDraggingToolbar: false,
      customPos: null,
      dragStartX: 0,
      dragStartY: 0,
      initialToolbarX: 0,
      initialToolbarY: 0,
      isSyncingBilingual: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isHandleLocalFile: state => state.isHandleLocalFile,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      enableAi: state => state.localConfig.enableAi,
      aiConfig: state => state.aiConfig,
      localConfig: state => state.localConfig
    }),

    currentBilingualMode() {
      return (this.localConfig && this.localConfig.bilingualMode) || 'dual'
    },

    currentBilingualModeLabel() {
      const mode = this.currentBilingualMode
      if (mode === 'zh') return '🇨🇳 纯中文'
      if (mode === 'en') return '🇬🇧 纯英文'
      return '📑 双语对照'
    },

    toolbarStyle() {
      const baseTransition = this.isDraggingToolbar
        ? 'none'
        : 'opacity 0.22s ease, transform 0.22s ease, left 0.22s cubic-bezier(0.4, 0, 0.2, 1)'

      if (this.isToolbarHidden) {
        return {
          opacity: 0,
          pointerEvents: 'none',
          transform: this.customPos
            ? 'translateY(-30px) scale(0.95)'
            : 'translateX(-50%) translateY(-30px) scale(0.95)',
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)'
        }
      }

      if (this.customPos) {
        return {
          left: `${this.customPos.x}px`,
          top: `${this.customPos.y}px`,
          transform: 'none',
          transition: baseTransition
        }
      }

      if (!this.hasSplitEditor || this.splitEditorCollapsed) {
        return {
          left: '50%',
          top: '20px',
          transform: 'translateX(-50%)',
          transition: baseTransition
        }
      }

      return {
        left: `calc(50% + ${this.splitEditorWidth / 2}px)`,
        top: '20px',
        transform: 'translateX(-50%)',
        transition: baseTransition
      }
    },

    triggerStyle() {
      if (this.customPos) {
        const x = Math.min(Math.max(80, this.customPos.x + 80), window.innerWidth - 80)
        return {
          left: `${x}px`,
          transform: 'translateX(-50%)'
        }
      }
      if (!this.hasSplitEditor || this.splitEditorCollapsed) {
        return {
          left: '50%',
          transform: 'translateX(-50%)'
        }
      }
      return {
        left: `calc(50% + ${this.splitEditorWidth / 2}px)`,
        transform: 'translateX(-50%)'
      }
    },

    btnLit() {
      let res = [...defaultBtnList]
      if (!this.openNodeRichText) {
        res = res.filter(item => {
          return item !== 'formula'
        })
      }
      if (!this.enableAi) {
        res = res.filter(item => {
          return item !== 'ai'
        })
      }
      return res
    }
  },
  watch: {
    isHandleLocalFile(val) {
      if (!val) {
        Notification.closeAll()
      }
    },
    btnLit: {
      deep: true,
      handler() {
        this.computeToolbarShow()
      }
    }
  },
  created() {
    this.initToolbarState()
    this.$bus.$on('write_local_file', this.onWriteLocalFile)
    this.$bus.$on('openLocalFile', this.openLocalFile)
    this.$bus.$on('createNewLocalFile', this.createNewLocalFile)
    this.$bus.$on('saveLocalFile', this.saveLocalFile)
    this.$bus.$on('openDirectory', this.openDirectory)
    this.$bus.$on('toggle_toolbar_show', this.toggleToolbar)
    this.$bus.$on('reset_toolbar_position', this.resetPosition)
  },
  mounted() {
    this.computeToolbarShow()
    this.computeToolbarShowThrottle = throttle(this.computeToolbarShow, 300)
    window.addEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$on('lang_change', this.computeToolbarShowThrottle)
    window.addEventListener('beforeunload', this.onUnload)
    this.$bus.$on('node_note_dblclick', this.onNodeNoteDblclick)
    window.addEventListener('keydown', this.handleKeyDown)
  },
  beforeDestroy() {
    this.$bus.$off('write_local_file', this.onWriteLocalFile)
    this.$bus.$off('openLocalFile', this.openLocalFile)
    this.$bus.$off('createNewLocalFile', this.createNewLocalFile)
    this.$bus.$off('saveLocalFile', this.saveLocalFile)
    this.$bus.$off('openDirectory', this.openDirectory)
    this.$bus.$off('toggle_toolbar_show', this.toggleToolbar)
    this.$bus.$off('reset_toolbar_position', this.resetPosition)
    window.removeEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$off('lang_change', this.computeToolbarShowThrottle)
    window.removeEventListener('beforeunload', this.onUnload)
    this.$bus.$off('node_note_dblclick', this.onNodeNoteDblclick)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('pointermove', this.onDragging)
    window.removeEventListener('pointerup', this.stopDrag)
  },
  methods: {
    ...mapMutations(['setLocalConfig']),

    initToolbarState() {
      try {
        const savedPos = localStorage.getItem('TOOLBAR_CUSTOM_POS')
        if (savedPos) {
          const parsed = JSON.parse(savedPos)
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            const maxX = Math.max(10, window.innerWidth - 100)
            const maxY = Math.max(10, window.innerHeight - 100)
            this.customPos = {
              x: Math.max(10, Math.min(parsed.x, maxX)),
              y: Math.max(10, Math.min(parsed.y, maxY))
            }
          }
        }
        const savedHidden = localStorage.getItem('TOOLBAR_HIDDEN')
        if (savedHidden === 'true') {
          this.isToolbarHidden = true
        }
      } catch (e) {}
    },

    // 切换思维导图双语展示模式
    async handleSwitchBilingualMode(mode) {
      this.setLocalConfig({ bilingualMode: mode })
      const mindMap = window.mindMap || (this.$parent && this.$parent.mindMap) || window.$mindMap
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

      // 如果切换到中文或双语模式，但导图中完全没有任何翻译数据，自动启动一次快速批量翻译
      if ((mode === 'zh' || mode === 'dual') && fullData && fullData.root && !hasAnyTrans(fullData.root)) {
        this.$message.info('检测到当前导图尚未生成翻译，正在调用 AI 快速补全双语...')
        await this.handleSyncBilingual()
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

    // 一键同步新加入/编辑节点的双语互译
    async handleSyncBilingual() {
      if (this.isSyncingBilingual) return
      const mindMap = window.mindMap
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
    },

    startDrag(e) {
      if (e.button !== 0) return
      this.isDraggingToolbar = true
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY

      const rect = this.$refs.toolbarRef.getBoundingClientRect()
      this.initialToolbarX = rect.left
      this.initialToolbarY = rect.top

      document.body.style.userSelect = 'none'

      window.addEventListener('pointermove', this.onDragging)
      window.addEventListener('pointerup', this.stopDrag)
    },

    onDragging(e) {
      if (!this.isDraggingToolbar) return
      const deltaX = e.clientX - this.dragStartX
      const deltaY = e.clientY - this.dragStartY

      let newX = this.initialToolbarX + deltaX
      let newY = this.initialToolbarY + deltaY

      const rect = this.$refs.toolbarRef.getBoundingClientRect()
      const maxX = Math.max(10, window.innerWidth - rect.width - 10)
      const maxY = Math.max(10, window.innerHeight - rect.height - 10)

      newX = Math.max(10, Math.min(newX, maxX))
      newY = Math.max(10, Math.min(newY, maxY))

      this.customPos = { x: Math.round(newX), y: Math.round(newY) }
    },

    stopDrag() {
      if (!this.isDraggingToolbar) return
      this.isDraggingToolbar = false
      document.body.style.userSelect = ''

      window.removeEventListener('pointermove', this.onDragging)
      window.removeEventListener('pointerup', this.stopDrag)

      if (this.customPos) {
        try {
          localStorage.setItem('TOOLBAR_CUSTOM_POS', JSON.stringify(this.customPos))
        } catch (e) {}
      }
    },

    resetPosition() {
      this.customPos = null
      try {
        localStorage.removeItem('TOOLBAR_CUSTOM_POS')
      } catch (e) {}
      this.$message.success('已恢复工具栏默认居中位置')
    },

    toggleToolbar(show) {
      if (typeof show === 'boolean') {
        this.isToolbarHidden = !show
      } else {
        this.isToolbarHidden = !this.isToolbarHidden
      }
      try {
        localStorage.setItem('TOOLBAR_HIDDEN', this.isToolbarHidden ? 'true' : 'false')
      } catch (e) {}
      this.$bus.$emit('toolbar_visibility_change', !this.isToolbarHidden)
    },

    handleKeyDown(e) {
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault()
        this.toggleToolbar()
      }
    },

    onSplitEditorResize({ show, width, isCollapsed, isDragging }) {
      if (show !== undefined) this.hasSplitEditor = show
      if (width !== undefined) this.splitEditorWidth = width
      if (isCollapsed !== undefined) this.splitEditorCollapsed = isCollapsed
      this.isSplitDragging = !!isDragging
      this.$nextTick(() => {
        this.computeToolbarShow()
      })
    },

    onSplitEditorChange(show) {
      this.hasSplitEditor = show
      this.$nextTick(() => {
        this.computeToolbarShow()
      })
    },

    enterZenMode() {
      this.setLocalConfig({ isZenMode: true })
    },

    // 计算工具按钮如何显示
    computeToolbarShow() {
      if (!this.$refs.toolbarRef) return
      if (this.customPos && this.$refs.toolbarRef) {
        const rect = this.$refs.toolbarRef.getBoundingClientRect()
        const maxX = Math.max(10, window.innerWidth - rect.width - 10)
        const maxY = Math.max(10, window.innerHeight - rect.height - 10)
        if (this.customPos.x > maxX || this.customPos.y > maxY) {
          this.customPos = {
            x: Math.min(this.customPos.x, maxX),
            y: Math.min(this.customPos.y, maxY)
          }
        }
      }
      const splitOffset = (this.hasSplitEditor && !this.splitEditorCollapsed) ? this.splitEditorWidth : 0
      const windowWidth = Math.max(280, window.innerWidth - splitOffset - 40)
      const all = [...this.btnLit]
      let index = 1
      const loopCheck = () => {
        if (index > all.length) return done()
        this.horizontalList = all.slice(0, index)
        this.$nextTick(() => {
          const width = this.$refs.toolbarRef.getBoundingClientRect().width
          if (width < windowWidth) {
            index++
            loopCheck()
          } else if (index > 0 && width > windowWidth) {
            index--
            this.horizontalList = all.slice(0, index)
            done()
          }
        })
      }
      const done = () => {
        this.verticalList = all.slice(index)
        this.showMoreBtn = this.verticalList.length > 0
      }
      loopCheck()
    },

    // 监听本地文件读写
    onWriteLocalFile(content) {
      clearTimeout(this.timer)
      if (fileHandle && this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = true
      }
      this.timer = setTimeout(() => {
        this.writeLocalFile(content)
      }, 1000)
    },

    onUnload(e) {
      if (this.waitingWriteToLocalFile) {
        const msg = '存在未保存的数据'
        e.returnValue = msg
        return msg
      }
    },

    // 加载本地文件树
    async loadFileTreeNode(node, resolve) {
      try {
        let dirHandle
        if (node.level === 0) {
          dirHandle = await window.showDirectoryPicker()
          this.rootDirName = dirHandle.name
        } else {
          dirHandle = node.data.handle
        }
        const dirList = []
        const fileList = []
        for await (const [key, value] of dirHandle.entries()) {
          const isFile = value.kind === 'file'
          if (isFile && !/\.(smm|xmind|md|json)$/.test(value.name)) {
            continue
          }
          const enableEdit = isFile && /\.smm$/.test(value.name)
          const data = {
            id: key,
            name: value.name,
            type: value.kind,
            handle: value,
            leaf: isFile,
            enableEdit
          }
          if (isFile) {
            fileList.push(data)
          } else {
            dirList.push(data)
          }
        }
        resolve([...dirList, ...fileList])
      } catch (error) {
        console.log(error)
        this.fileTreeVisible = false
        resolve([])
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 扫描本地文件夹
    openDirectory() {
      this.fileTreeVisible = false
      this.fileTreeExpand = true
      this.rootDirName = ''
      this.$nextTick(() => {
        this.fileTreeVisible = true
      })
    },

    // 编辑指定文件
    editLocalFile(data) {
      if (data.handle) {
        fileHandle = data.handle
        this.readFile()
      }
    },

    // 导入指定文件
    async importLocalFile(data) {
      try {
        const file = await data.handle.getFile()
        this.$refs.ImportRef.onChange({
          raw: file,
          name: file.name
        })
        this.$refs.ImportRef.confirm()
      } catch (error) {
        console.log(error)
      }
    },

    // 打开本地文件
    async openLocalFile() {
      try {
        let [_fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '',
              accept: {
                'application/json': ['.smm']
              }
            }
          ],
          excludeAcceptAllOption: true,
          multiple: false
        })
        if (!_fileHandle) {
          return
        }
        fileHandle = _fileHandle
        if (fileHandle.kind === 'directory') {
          this.$message.warning(this.$t('toolbar.selectFileTip'))
          return
        }
        this.readFile()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 读取本地文件
    async readFile() {
      let file = await fileHandle.getFile()
      let fileReader = new FileReader()
      fileReader.onload = async () => {
        this.$store.commit('setIsHandleLocalFile', true)
        this.setData(fileReader.result)
        Notification.closeAll()
        Notification({
          title: this.$t('toolbar.tip'),
          message: `${this.$t('toolbar.editingLocalFileTipFront')}${
            file.name
          }${this.$t('toolbar.editingLocalFileTipEnd')}`,
          duration: 0,
          showClose: true
        })
      }
      fileReader.readAsText(file)
    },

    // 渲染读取的数据
    setData(str) {
      try {
        let data = JSON.parse(str)
        if (typeof data !== 'object') {
          throw new Error(this.$t('toolbar.fileContentError'))
        }
        if (data.root) {
          this.isFullDataFile = true
        } else {
          this.isFullDataFile = false
          data = {
            ...exampleData,
            root: data
          }
        }
        this.$bus.$emit('setData', data)
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('toolbar.fileOpenFailed'))
      }
    },

    // 写入本地文件
    async writeLocalFile(content) {
      if (!fileHandle || !this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = false
        return
      }
      if (!this.isFullDataFile) {
        content = content.root
      }
      let string = JSON.stringify(content)
      const writable = await fileHandle.createWritable()
      await writable.write(string)
      await writable.close()
      this.waitingWriteToLocalFile = false
    },

    // 创建本地文件
    async createNewLocalFile() {
      await this.createLocalFile(exampleData)
    },

    // 另存为
    async saveLocalFile() {
      let data = getData()
      await this.createLocalFile(data)
    },

    // 创建本地文件
    async createLocalFile(content) {
      try {
        let _fileHandle = await window.showSaveFilePicker({
          types: [
            {
              description: '',
              accept: { 'application/json': ['.smm'] }
            }
          ],
          suggestedName: this.$t('toolbar.defaultFileName')
        })
        if (!_fileHandle) {
          return
        }
        const loading = this.$loading({
          lock: true,
          text: this.$t('toolbar.creatingTip'),
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        })
        fileHandle = _fileHandle
        this.$store.commit('setIsHandleLocalFile', true)
        this.isFullDataFile = true
        await this.writeLocalFile(content)
        await this.readFile()
        loading.close()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    onNodeNoteDblclick(node, e) {
      e.stopPropagation()
      this.$bus.$emit('showNodeNote', node)
    }
  }
}
</script>

<style lang="less" scoped>
.toolbarContainer {
  &.isDark {
    .toolbar {
      color: hsla(0, 0%, 100%, 0.9);
      .toolbarBlock {
        background-color: #262a2e;

        .fileTreeBox {
          background-color: #262a2e;

          /deep/ .el-tree {
            background-color: #262a2e;

            &.el-tree--highlight-current {
              .el-tree-node.is-current > .el-tree-node__content {
                background-color: hsla(0, 0%, 100%, 0.05) !important;
              }
            }

            .el-tree-node:focus > .el-tree-node__content {
              background-color: hsla(0, 0%, 100%, 0.05) !important;
            }

            .el-tree-node__content:hover,
            .el-upload-list__item:hover {
              background-color: hsla(0, 0%, 100%, 0.02) !important;
            }
          }

          .fileTreeWrap {
            .customTreeNode {
              .treeNodeInfo {
                color: #fff;
              }

              .treeNodeBtnList {
                .el-button {
                  padding: 7px 5px;
                }
              }
            }
          }
        }
      }

      .toolbarBtn {
        .icon {
          background: transparent;
          border-color: transparent;
        }

        &:hover {
          &:not(.disabled) {
            .icon {
              background: hsla(0, 0%, 100%, 0.05);
            }
          }
        }

        &.disabled {
          color: #54595f;
        }
      }
    }

    .toolbarFloatingTrigger {
      background: #262a2e;
      border-color: #3f444e;
      color: #f1f5f9;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);

      i {
        color: #38bdf8;
      }

      &:hover {
        background: #32373d;
        color: #38bdf8;
        box-shadow: 0 6px 20px rgba(56, 189, 248, 0.25);
      }
    }

    .toolbar {
      .toolbarDragGrip {
        background-color: #262a2e;
        border-color: #3f444e;
        color: #94a3b8;

        &:hover {
          background-color: #32373d;
          border-color: #60a5fa;
          color: #60a5fa;
        }
      }
    }
  }

  .toolbarFloatingTrigger {
    position: fixed;
    top: 0;
    z-index: 1003;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px 8px;
    background: #ffffff;
    color: #1e293b;
    font-size: 12px;
    font-weight: 500;
    border-radius: 0 0 10px 10px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
    border: 1px solid #e2e8f0;
    border-top: none;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;

    i {
      font-size: 13px;
      color: #2563eb;
      transition: transform 0.2s ease;
    }

    &:hover {
      background: #f8fafc;
      color: #2563eb;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.18);
      transform: translateX(-50%) translateY(2px) !important;

      i {
        transform: translateY(2px);
      }
    }
  }

  .toolbar {
    position: fixed;
    transform: translateX(-50%);
    top: 20px;
    width: max-content;
    display: flex;
    font-size: 12px;
    font-family: PingFangSC-Regular, PingFang SC;
    font-weight: 400;
    color: rgba(26, 26, 26, 0.8);
    z-index: 2;

    &.isDragging {
      cursor: grabbing !important;
      user-select: none;
      .toolbarDragGrip {
        cursor: grabbing !important;
      }
    }

    .toolbarDragGrip {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #fff;
      padding: 10px 10px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 12px;
      cursor: grab;
      color: #64748b;
      user-select: none;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        color: #2563eb;
        border-color: rgba(37, 99, 235, 0.3);
        box-shadow: 0 4px 20px 0 rgba(37, 99, 235, 0.12);
      }

      &:active {
        cursor: grabbing;
      }

      .gripIcon {
        font-size: 16px;
      }

      .gripText {
        font-size: 11px;
        margin-top: 4px;
        white-space: nowrap;
        opacity: 0.85;
      }
    }

    .toolbarBlock {
      display: flex;
      background-color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 20px;
      flex-shrink: 0;
      position: relative;

      &:last-of-type {
        margin-right: 0;
      }

  .fileTreeBox {
    position: fixed;
    left: 20px;
    top: 60px;
    width: 260px;
    height: 36px;
    background-color: #fff;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    border: 1px solid #e2e8f0;
    z-index: 100;

    &.expand {
      height: 340px;

          .fileTreeWrap {
            visibility: visible;
          }
        }

        .fileTreeToolbar {
          width: 100%;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9e9e9;
          margin-bottom: 12px;
          padding-left: 12px;

          .fileTreeName {
          }

          .fileTreeActionList {
            .btn {
              font-size: 18px;
              margin-left: 12px;
              cursor: pointer;
            }
          }
        }

        .fileTreeWrap {
          width: 100%;
          height: 100%;
          overflow: auto;
          visibility: hidden;

          .customTreeNode {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            padding-right: 5px;

            .treeNodeInfo {
              display: flex;
              align-items: center;

              .treeNodeIcon {
                margin-right: 5px;
                opacity: 0.7;
              }

              .treeNodeName {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .treeNodeBtnList {
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }

    .toolbarBtn {
      display: flex;
      justify-content: center;
      flex-direction: column;
      cursor: pointer;
      margin-right: 20px;

      &:last-of-type {
        margin-right: 0;
      }

      &:hover {
        &:not(.disabled) {
          .icon {
            background: #f5f5f5;
          }
        }
      }

      &.active {
        .icon {
          background: #f5f5f5;
        }
      }

      &.disabled {
        color: #bcbcbc;
        cursor: not-allowed;
        pointer-events: none;
      }

      .icon {
        display: flex;
        height: 26px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e9e9e9;
        justify-content: center;
        flex-direction: column;
        text-align: center;
        padding: 0 5px;
      }

      .text {
        margin-top: 3px;
      }
    }
  }
}

.bilingualPopover {
  padding: 8px !important;
  border-radius: 10px !important;
}

.bilingualMenu {
  width: 250px;

  &.isDark {
    .menuHeader {
      color: #94a3b8;
      border-bottom-color: #334155;
    }

    .menuItem {
      color: #e2e8f0;

      &:hover {
        background: #334155;
      }

      &.active {
        background: rgba(37, 99, 235, 0.2);
        color: #60a5fa;
      }

      .menuText .desc {
        color: #64748b;
      }
    }

    .menuDivider {
      background: #334155;
    }
  }

  .menuHeader {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    padding: 6px 10px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 4px;
  }

  .menuItem {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: #f1f5f9;
    }

    &.active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: 600;
    }

    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .flagIcon {
      font-size: 18px;
      display: flex;
      align-items: center;
    }

    .menuText {
      flex: 1;

      .title {
        font-size: 13px;
        line-height: 1.3;
      }

      .desc {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
      }
    }

    .checkMark {
      font-size: 14px;
      color: #2563eb;
    }
  }

  .menuDivider {
    height: 1px;
    background: #f1f5f9;
    margin: 6px 4px;
  }
}
</style>
