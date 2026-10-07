<template>
  <div>
    <el-dialog
      class="nodeImportDialog"
      :title="$t('import.title')"
      :visible.sync="dialogVisible"
      width="380px"
    >
      <el-upload
        ref="upload"
        action="x"
        :accept="supportFileStr"
        :file-list="fileList"
        :auto-upload="false"
        :multiple="false"
        :on-change="onChange"
        :on-remove="onRemove"
        :limit="1"
        :on-exceed="onExceed"
      >
        <el-button slot="trigger" size="small" type="primary">{{
          $t('import.selectFile')
        }}</el-button>
        <div slot="tip" class="el-upload__tip">
          {{ $t('import.support') }}{{ supportFileStr }}{{ $t('import.file') }}
        </div>
      </el-upload>

      <!-- 双语 1:1 翻译选项 -->
      <div class="bilingualImportOption" v-if="enableAi">
        <el-checkbox v-model="enableBilingualImport">
          🔤 导入时执行 AI 1:1 双语翻译
        </el-checkbox>
        <div class="bilingualTip" v-if="enableBilingualImport">
          自动识别中英语言，保留原版并生成双语对照。导入后可在顶部工具栏随时一键切换【纯中文 / 纯英文 / 双语对照】。
        </div>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="cancel">{{ $t('dialog.cancel') }}</el-button>
        <el-button type="primary" @click="confirm">{{
          $t('dialog.confirm')
        }}</el-button>
      </span>
    </el-dialog>
    <el-dialog
      class="xmindCanvasSelectDialog"
      :title="$t('import.xmindCanvasSelectDialogTitle')"
      :visible.sync="xmindCanvasSelectDialogVisible"
      width="300px"
      :show-close="false"
    >
      <el-radio-group v-model="selectCanvas" class="canvasList">
        <el-radio
          v-for="(item, index) in canvasList"
          :key="index"
          :label="index"
          >{{ item.title }}</el-radio
        >
      </el-radio-group>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="confirmSelect">{{
          $t('dialog.confirm')
        }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import xmind from 'simple-mind-map/src/parse/xmind.js'
import markdown from 'simple-mind-map/src/parse/markdown.js'
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'
import { mapState, mapMutations } from 'vuex'
import {
  treeToCleanMarkdown,
  translateMarkdownStructure,
  mergeBilingualTree
} from '@/utils/bilingualHelper'

// 导入
export default {
  data() {
    return {
      dialogVisible: false,
      fileList: [],
      selectPromiseResolve: null,
      xmindCanvasSelectDialogVisible: false,
      selectCanvas: '',
      canvasList: [],
      mdStr: '',
      enableBilingualImport: false
    }
  },
  computed: {
    ...mapState(['aiConfig', 'localConfig']),
    enableAi() {
      return this.localConfig && this.localConfig.enableAi
    },
    supportFileStr() {
      return '.smm,.json,.xmind,.md'
    }
  },
  watch: {
    dialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.fileList = []
      }
    }
  },
  created() {
    this.$bus.$on('showImport', this.handleShowImport)
    this.$bus.$on('handle_file_url', this.handleFileURL)
    this.$bus.$on('importFile', this.handleImportFile)
  },
  beforeDestroy() {
    this.$bus.$off('showImport', this.handleShowImport)
    this.$bus.$off('handle_file_url', this.handleFileURL)
    this.$bus.$off('importFile', this.handleImportFile)
  },
  methods: {
    ...mapMutations(['setActiveSidebar', 'setLocalConfig']),

    handleShowImport() {
      this.dialogVisible = true
    },

    getRegexp() {
      return new RegExp(`\.(smm|json|xmind|md)$`)
    },

    // 检查url中是否操作需要打开的文件
    async handleFileURL() {
      try {
        const fileURL = this.$route.query.fileURL
        if (!fileURL) return
        const macth = this.getRegexp().exec(fileURL)
        if (!macth) {
          return
        }
        const type = macth[1]
        const res = await fetch(fileURL)
        const file = await res.blob()
        const data = {
          raw: file
        }
        if (type === 'smm' || type === 'json') {
          this.handleSmm(data)
        } else if (type === 'xmind') {
          this.handleXmind(data)
        } else if (type === 'md') {
          this.handleMd(data)
        }
      } catch (error) {
        console.log(error)
      }
    },

    // 文件选择
    onChange(file) {
      if (!this.getRegexp().test(file.name)) {
        this.$message.error(
          this.$t('import.pleaseSelect') +
            this.supportFileStr +
            this.$t('import.file')
        )
        this.fileList = []
      } else {
        this.fileList.push(file)
      }
    },

    // 移除文件
    onRemove(file, fileList) {
      this.fileList = fileList
    },

    // 数量超出限制
    onExceed() {
      this.$message.error(this.$t('import.maxFileNum'))
    },

    // 取消
    cancel() {
      this.dialogVisible = false
    },

    // 确定
    confirm() {
      if (this.fileList.length <= 0) {
        return this.$message.error(this.$t('import.notSelectTip'))
      }
      this.$store.commit('setIsHandleLocalFile', false)
      let file = this.fileList[0]
      if (/\.(smm|json)$/.test(file.name)) {
        this.handleSmm(file)
      } else if (/\.xmind$/.test(file.name)) {
        this.handleXmind(file)
      } else if (/\.md$/.test(file.name)) {
        this.handleMd(file)
      }
      this.cancel()
      this.setActiveSidebar(null)
    },

    // 统一应用数据（带双语 1:1 处理）
    async applyDataWithBilingual(data) {
      if (this.enableBilingualImport && this.enableAi) {
        const rootNode = data.root || data
        const loading = this.$loading({
          lock: true,
          text: 'AI 正在对思维导图结构进行 1:1 双语翻译...',
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        })
        try {
          // 1. 提取为干净层级 Markdown
          const mdText = treeToCleanMarkdown(rootNode)
          // 2. 调用大模型一次性翻译整篇 Markdown
          const transMd = await translateMarkdownStructure(mdText, this.aiConfig)
          // 3. 将翻译后的 Markdown 解析为树
          const transTree = transformMarkdownTo(transMd)
          // 4. 双轨 1:1 归并
          const currentMode = (this.localConfig && this.localConfig.bilingualMode) || 'dual'
          mergeBilingualTree(rootNode, transTree, currentMode)
          loading.close()
          this.$message.success('已成功生成双语对照思维导图！')
        } catch (err) {
          loading.close()
          console.error('双语翻译失败，降级使用原始导图:', err)
          this.$message.warning('AI 双语翻译遇到问题，已保留原始结构导入')
        }
      }

      this.$bus.$emit('setData', data)
      this.$message.success(this.$t('import.importSuccess'))
    },

    // 处理.smm文件
    handleSmm(file) {
      let fileReader = new FileReader()
      fileReader.readAsText(file.raw)
      fileReader.onload = async evt => {
        try {
          let data = JSON.parse(evt.target.result)
          if (typeof data !== 'object') {
            throw new Error(this.$t('import.fileContentError'))
          }
          await this.applyDataWithBilingual(data)
        } catch (error) {
          console.log(error)
          this.$message.error(this.$t('import.fileParsingFailed'))
        }
      }
    },

    // 处理.xmind文件
    async handleXmind(file) {
      try {
        let data = await xmind.parseXmindFile(file.raw, content => {
          this.showSelectXmindCanvasDialog(content)
          return new Promise(resolve => {
            this.selectPromiseResolve = resolve
          })
        })
        await this.applyDataWithBilingual(data)
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('import.fileParsingFailed'))
      }
    },

    // 显示xmind文件的多个画布选择弹窗
    showSelectXmindCanvasDialog(content) {
      this.canvasList = content
      this.selectCanvas = 0
      this.xmindCanvasSelectDialogVisible = true
    },

    // 确认导入指定的画布
    confirmSelect() {
      this.selectPromiseResolve(this.canvasList[this.selectCanvas])
      this.xmindCanvasSelectDialogVisible = false
      this.canvasList = []
      this.selectCanvas = 0
    },

    // 处理markdown文件
    async handleMd(file) {
      let fileReader = new FileReader()
      fileReader.readAsText(file.raw)
      fileReader.onload = async evt => {
        try {
          let data = markdown.transformMarkdownTo(evt.target.result)
          this.collapseDeepLevels(data, 2)
          await this.applyDataWithBilingual(data)
        } catch (error) {
          console.log(error)
          this.$message.error(this.$t('import.fileParsingFailed'))
        }
      }
    },

    // 【定制】大纲层级较深时，只展开到第 maxLevel 层（根节点为第 0 层）
    collapseDeepLevels(node, maxLevel, level = 0) {
      if (!node || !node.data) return
      const children = node.children || []
      if (children.length > 0 && level >= maxLevel) {
        node.data.expand = false
      }
      children.forEach(child => {
        this.collapseDeepLevels(child, maxLevel, level + 1)
      })
    },

    // 导入指定文件
    handleImportFile(file) {
      this.onChange({
        raw: file,
        name: file.name
      })
      if (this.fileList.length <= 0) return
      this.confirm()
    }
  }
}
</script>

<style lang="less" scoped>
.nodeImportDialog {
  .bilingualImportOption {
    margin-top: 16px;
    padding: 10px 12px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;

    .bilingualTip {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.5;
    }
  }
}

.canvasList {
  display: flex;
  flex-direction: column;

  /deep/ .el-radio {
    margin-bottom: 12px;

    &:last-of-type {
      margin-bottom: 0;
    }
  }
}
</style>
