<template>
  <el-dialog
    class="aiConfigDialog"
    :title="$t('ai.AIConfiguration') || 'AI功能与模型配置'"
    :visible.sync="aiConfigDialogVisible"
    width="660px"
    top="8vh"
    append-to-body
  >
    <el-tabs v-model="activeTab" class="aiConfigTabs">
      <!-- Tab 1: 大模型连接与测试 -->
      <el-tab-pane label="大模型连接" name="model">
        <div class="tabContent">
          <!-- 状态展示卡片 / 徽章 -->
          <div class="aiStatusBanner" :class="'status-' + curStatus.type">
            <div class="statusLeft">
              <span class="statusDot" :class="'dot-' + curStatus.type"></span>
              <div class="statusTextGroup">
                <div class="statusHeaderRow">
                  <span class="statusTitle">{{ curStatus.title }}</span>
                  <el-tag size="mini" :type="curStatus.tagType" effect="plain" class="statusTag">
                    {{ curStatus.tagText }}
                  </el-tag>
                  <span class="latencyBadge" v-if="aiStatus.latency && curStatus.type === 'ready'">
                    ⚡ {{ aiStatus.latency }}ms
                  </span>
                </div>
                <div class="statusDesc">{{ curStatus.desc }}</div>
              </div>
            </div>
            <div class="statusRight">
              <el-button
                size="small"
                type="primary"
                :loading="isTestingConnection"
                icon="el-icon-connection"
                @click="testAiConnection"
              >
                {{ isTestingConnection ? '测试中...' : '测试接入' }}
              </el-button>
            </div>
          </div>

          <!-- 模型配置表单 -->
          <el-form
            :model="ruleForm"
            ref="ruleFormRef"
            label-width="110px"
            size="small"
            class="aiConfigForm"
          >
            <!-- 服务商快捷选择 -->
            <el-form-item label="服务商预设">
              <el-select
                v-model="ruleForm.provider"
                placeholder="请选择大模型服务商"
                style="width: 100%"
                @change="onProviderChange"
              >
                <el-option
                  v-for="item in providers"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                ></el-option>
              </el-select>
              <div class="formItemTip">
                选择服务商将自动为您填入官方接口 URL 与推荐模型。如使用自建网关或中转接口，请选择“自定义”。
              </div>
            </el-form-item>

            <!-- API Key -->
            <el-form-item label="API Key">
              <el-input
                v-model="ruleForm.key"
                :placeholder="currentProvider.placeholder || '请输入 API Key'"
                show-password
                clearable
              ></el-input>
            </el-form-item>

            <!-- 接口 URL -->
            <el-form-item label="接口 URL">
              <el-input
                v-model="ruleForm.api"
                placeholder="例如：https://api.deepseek.com/chat/completions"
                clearable
              ></el-input>
              <div class="formItemTip">
                标准 OpenAI 兼容的聊天补全接口（Chat Completions API）。无需填写代理端口。
              </div>
            </el-form-item>

            <!-- 模型名称及自动拉取清单 -->
            <el-form-item label="模型/接入点">
              <div class="modelInputRow">
                <el-select
                  v-model="ruleForm.model"
                  filterable
                  allow-create
                  default-first-option
                  placeholder="请选择或直接输入模型名称"
                  style="flex: 1;"
                >
                  <el-option
                    v-for="item in modelOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                  >
                    <span style="float: left">{{ item.name }}</span>
                    <span
                      style="float: right; color: #8492a6; font-size: 12px; margin-left: 12px;"
                      v-if="item.id !== item.name"
                    >{{ item.id }}</span>
                  </el-option>
                </el-select>
                <el-button
                  class="pullModelsBtn"
                  size="small"
                  icon="el-icon-refresh"
                  :loading="isLoadingModels"
                  @click="fetchModelList"
                  title="向服务商查询并自动拉取可用模型列表"
                >
                  {{ isLoadingModels ? '拉取中...' : '自动拉取清单' }}
                </el-button>
              </div>
              <div class="formItemTip">
                支持直接在输入框中回车输入自定义模型名，或点击「自动拉取清单」获取该 API Key 下的可用模型。
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- Tab 2: AI 续写 Prompt 配置 -->
      <el-tab-pane label="AI 续写 Prompt" name="continuation">
        <div class="tabContent">
          <p class="sectionTitle">AI 续写（展开节点）Prompt 设置：</p>
          <el-form label-width="110px" size="small">
            <el-form-item label="默认续写预设">
              <el-select
                v-model="promptForm.aiContinuationPromptPreset"
                style="width: 100%"
                @change="onContinuationPresetSelect"
              >
                <el-option
                  v-for="item in continuationPresets"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                ></el-option>
              </el-select>
              <div class="presetDescText" v-if="curContinuationPresetObj">
                {{ curContinuationPresetObj.desc }}
              </div>
            </el-form-item>

            <el-form-item label="Prompt 模版">
              <el-input
                type="textarea"
                :rows="4"
                v-model="promptForm.aiContinuationCustomPrompt"
                placeholder="可自定义 Prompt 模版，支持变量：{topic}中心主题、{nodeText}当前节点"
              ></el-input>
              <div class="variableHelp">
                <span>支持占位符：<code>{topic}</code>(导图中心主题)、<code>{nodeText}</code>(当前续写节点)</span>
                <el-button type="text" size="mini" @click="resetContinuationPrompt">恢复当前预设模版</el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- Tab 3: AI 解释 Prompt 配置 -->
      <el-tab-pane label="AI 解释 Prompt" name="explanation">
        <div class="tabContent">
          <p class="sectionTitle">AI 概念释义 Prompt 设置：</p>
          <el-form label-width="110px" size="small">
            <el-form-item label="默认解释预设">
              <el-select
                v-model="promptForm.aiExplanationPromptPreset"
                style="width: 100%"
                @change="onExplanationPresetSelect"
              >
                <el-option
                  v-for="item in explanationPresets"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                ></el-option>
              </el-select>
              <div class="presetDescText" v-if="curExplanationPresetObj">
                {{ curExplanationPresetObj.desc }}
              </div>
            </el-form-item>

            <el-form-item label="Prompt 模版">
              <el-input
                type="textarea"
                :rows="4"
                v-model="promptForm.aiExplanationCustomPrompt"
                placeholder="可自定义 Prompt 模版，支持变量：{text}释义词条、{nodeText}所属节点、{topic}导图中心主题"
              ></el-input>
              <div class="variableHelp">
                <span>支持占位符：<code>{text}</code>(释义词条)、<code>{nodeText}</code>(所属节点)、<code>{topic}</code>(导图中心主题)</span>
                <el-button type="text" size="mini" @click="resetExplanationPrompt">恢复当前预设模版</el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- Tab 4: AI 备注框设置 -->
      <el-tab-pane label="AI 备注框设置" name="noteBox">
        <div class="tabContent">
          <p class="sectionTitle">节点 AI 备注框与历史记录规则：</p>
          <el-form label-width="120px" size="small">
            <el-form-item label="AI 备注框功能">
              <el-switch
                v-model="noteBoxForm.enableAiNoteBox"
                active-text="开启"
                inactive-text="关闭"
              ></el-switch>
              <div class="settingItemTip">
                开启后，AI 释义将与节点备注系统深度联动，并在节点悬停浮层展示结构化的释义历史与卡片。
              </div>
            </el-form-item>

            <el-form-item label="释义记录模式" v-if="noteBoxForm.enableAiNoteBox">
              <el-radio-group v-model="noteBoxForm.aiNoteRecordMode">
                <el-radio label="auto">
                  <b>自动记录</b>
                  <span class="radioSubText">（AI 释义完成后，自动将词条及内容保存至节点备注框中）</span>
                </el-radio>
                <div style="margin-top: 8px;"></div>
                <el-radio label="manual">
                  <b>手动记录</b>
                  <span class="radioSubText">（AI 释义完成后由用户确认并点击保存至节点备注框）</span>
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>

    <div slot="footer" class="dialog-footer">
      <el-button @click="cancel">{{ $t('ai.cancel') || '取消' }}</el-button>
      <el-button type="primary" @click="confirm">{{
        $t('ai.confirm') || '保存配置'
      }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import {
  AI_CONTINUATION_PRESETS,
  AI_EXPLANATION_PRESETS
} from '@/utils/aiPrompts'

// 主流模型服务商预设
const AI_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索 - 推荐)',
    api: 'https://api.deepseek.com/chat/completions',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'deepseek-chat (DeepSeek-V3 推荐)' },
      { id: 'deepseek-reasoner', name: 'deepseek-reasoner (DeepSeek-R1 深度推理)' }
    ],
    placeholder: '请输入 DeepSeek API Key（以 sk- 开头）'
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    api: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini (极速高性价比推荐)' },
      { id: 'gpt-4o', name: 'gpt-4o (全能旗舰)' },
      { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' }
    ],
    placeholder: '请输入 OpenAI API Key（以 sk- 开头）'
  },
  {
    id: 'qwen',
    name: '通义千问 (阿里云百炼 / DashScope)',
    api: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    defaultModel: 'qwen-plus',
    models: [
      { id: 'qwen-plus', name: 'qwen-plus (能力均衡推荐)' },
      { id: 'qwen-turbo', name: 'qwen-turbo (极速响应)' },
      { id: 'qwen-max', name: 'qwen-max (复杂推理旗舰)' }
    ],
    placeholder: '请输入百炼/DashScope API Key（以 sk- 开头）'
  },
  {
    id: 'kimi',
    name: '月之暗面 (Kimi / Moonshot)',
    api: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k',
    models: [
      { id: 'moonshot-v1-8k', name: 'moonshot-v1-8k (8k 上下文)' },
      { id: 'moonshot-v1-32k', name: 'moonshot-v1-32k (32k 上下文)' },
      { id: 'moonshot-v1-128k', name: 'moonshot-v1-128k (长文本旗舰)' }
    ],
    placeholder: '请输入 Moonshot API Key（以 sk- 开头）'
  },
  {
    id: 'zhipu',
    name: '智谱清言 (GLM 大模型)',
    api: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    models: [
      { id: 'glm-4-flash', name: 'glm-4-flash (极速免费/高性价比)' },
      { id: 'glm-4-air', name: 'glm-4-air (轻量旗舰)' },
      { id: 'glm-4', name: 'glm-4 (全能旗舰)' }
    ],
    placeholder: '请输入智谱 API Key'
  },
  {
    id: 'volcengine',
    name: '火山方舟 (字节跳动)',
    api: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    defaultModel: '',
    models: [],
    placeholder: '请输入火山方舟 API Key（接入点格式为 ep-xxx）'
  },
  {
    id: 'ollama',
    name: 'Ollama (本地私有化大模型)',
    api: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'llama3',
    models: [
      { id: 'llama3', name: 'llama3' },
      { id: 'qwen2.5:7b', name: 'qwen2.5:7b' },
      { id: 'deepseek-r1:8b', name: 'deepseek-r1:8b' }
    ],
    placeholder: '本地模型无需 API Key，可直接留空'
  },
  {
    id: 'custom',
    name: '自定义 (OpenAI 兼容接口)',
    api: '',
    defaultModel: '',
    models: [],
    placeholder: '请输入 API Key'
  }
]

export default {
  model: {
    prop: 'visible',
    event: 'change'
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      activeTab: 'model',
      aiConfigDialogVisible: false,
      continuationPresets: AI_CONTINUATION_PRESETS,
      explanationPresets: AI_EXPLANATION_PRESETS,
      providers: AI_PROVIDERS,
      modelOptions: [],

      isLoadingModels: false,
      isTestingConnection: false,

      ruleForm: {
        provider: 'deepseek',
        api: 'https://api.deepseek.com/chat/completions',
        key: '',
        model: 'deepseek-chat',
        method: 'POST'
      },

      promptForm: {
        aiContinuationPromptPreset: 'expand',
        aiContinuationCustomPrompt: '',
        aiExplanationPromptPreset: 'plain',
        aiExplanationCustomPrompt: ''
      },

      noteBoxForm: {
        enableAiNoteBox: true,
        aiNoteRecordMode: 'auto'
      }
    }
  },
  computed: {
    ...mapState(['aiConfig', 'localConfig', 'aiStatus']),

    currentProvider() {
      return (
        this.providers.find(p => p.id === this.ruleForm.provider) ||
        this.providers[0]
      )
    },

    curStatus() {
      if (this.isTestingConnection) {
        return {
          type: 'testing',
          tagType: 'warning',
          tagText: '检测中',
          title: '正在检测大模型接入...',
          desc: '向模型端点发送握手探活请求，测试响应延迟'
        }
      }
      if (this.aiStatus && this.aiStatus.status === 'ready') {
        return {
          type: 'ready',
          tagType: 'success',
          tagText: '已就绪',
          title: '大模型服务连接正常',
          desc: `接入正常 · 延迟 ${this.aiStatus.latency || 0}ms · 模型：${this.ruleForm.model || '已配置'}${
            this.aiStatus.lastTested ? ' (' + this.aiStatus.lastTested + ')' : ''
          }`
        }
      }
      if (this.aiStatus && this.aiStatus.status === 'error') {
        return {
          type: 'error',
          tagType: 'danger',
          tagText: '连接异常',
          title: '大模型接入测试未通过',
          desc:
            this.aiStatus.message ||
            '连接失败，请检查 API Key、接口 URL 或模型名称是否正确'
        }
      }
      return {
        type: 'unconfigured',
        tagType: 'info',
        tagText: '待检测',
        title: '大模型服务待检测',
        desc: '配置 API Key 与接口后，点击右侧「测试接入」即可验证连通性'
      }
    },

    curContinuationPresetObj() {
      return this.continuationPresets.find(
        p => p.id === this.promptForm.aiContinuationPromptPreset
      )
    },

    curExplanationPresetObj() {
      return this.explanationPresets.find(
        p => p.id === this.promptForm.aiExplanationPromptPreset
      )
    }
  },
  watch: {
    visible(val) {
      this.aiConfigDialogVisible = val
      if (val) {
        this.initFormData()
      }
    },
    aiConfigDialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.close()
      }
    }
  },
  created() {
    this.initFormData()
  },
  methods: {
    ...mapMutations(['setLocalConfig', 'setAiStatus']),

    close() {
      this.$emit('change', false)
    },

    initFormData() {
      // 基础模型配置（不含代理端口）
      Object.keys(this.ruleForm).forEach(key => {
        if (this.aiConfig[key] !== undefined) {
          this.ruleForm[key] = this.aiConfig[key]
        }
      })

      // 服务商预设与推荐模型选项
      const matched = this.providers.find(p => p.id === this.ruleForm.provider)
      if (matched && matched.models && matched.models.length > 0) {
        this.modelOptions = [...matched.models]
      } else {
        const defaultP = this.providers.find(p => p.id === 'deepseek')
        this.modelOptions = defaultP ? [...defaultP.models] : []
      }

      // 如果当前已有保存的模型，确保它存在于模型下拉项中
      if (
        this.ruleForm.model &&
        !this.modelOptions.some(m => m.id === this.ruleForm.model)
      ) {
        this.modelOptions.unshift({
          id: this.ruleForm.model,
          name: this.ruleForm.model
        })
      }

      // Prompt 配置
      this.promptForm.aiContinuationPromptPreset =
        this.localConfig.aiContinuationPromptPreset || 'expand'
      this.promptForm.aiContinuationCustomPrompt =
        this.localConfig.aiContinuationCustomPrompt ||
        this.getContinuationPresetTemplate(
          this.promptForm.aiContinuationPromptPreset
        )

      this.promptForm.aiExplanationPromptPreset =
        this.localConfig.aiExplanationPromptPreset || 'plain'
      this.promptForm.aiExplanationCustomPrompt =
        this.localConfig.aiExplanationCustomPrompt ||
        this.getExplanationPresetTemplate(
          this.promptForm.aiExplanationPromptPreset
        )

      // 备注框配置
      this.noteBoxForm.enableAiNoteBox =
        this.localConfig.enableAiNoteBox !== undefined
          ? this.localConfig.enableAiNoteBox
          : true
      this.noteBoxForm.aiNoteRecordMode =
        this.localConfig.aiNoteRecordMode || 'auto'
    },

    onProviderChange(providerId) {
      const p = this.providers.find(item => item.id === providerId)
      if (!p) return
      if (p.api) {
        this.ruleForm.api = p.api
      }
      if (p.models && p.models.length > 0) {
        this.modelOptions = [...p.models]
        if (p.defaultModel) {
          this.ruleForm.model = p.defaultModel
        }
      }
    },

    // 自动拉取模型清单
    async fetchModelList() {
      if (!this.ruleForm.api) {
        this.$message.warning('请先输入接口 URL')
        return
      }
      this.isLoadingModels = true
      try {
        const res = await fetch('/ai/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api: this.ruleForm.api,
            key: this.ruleForm.key
          })
        })
        const result = await res.json()
        if (
          result &&
          result.data &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          this.modelOptions = result.data
          if (!this.ruleForm.model && this.modelOptions.length > 0) {
            this.ruleForm.model = this.modelOptions[0].id
          }
          if (result.isFallback) {
            this.$message.info('已加载推荐常用模型列表，可直接选用或输入自定义模型')
          } else {
            this.$message.success(`成功拉取 ${result.data.length} 个模型！`)
          }
        } else {
          this.$message.warning('未拉取到模型列表，已为您保留当前选项')
        }
      } catch (err) {
        this.$message.warning('自动拉取失败，已使用预设模型列表')
      } finally {
        this.isLoadingModels = false
      }
    },

    // 测试模型接入连通性
    async testAiConnection() {
      if (!this.ruleForm.api) {
        this.$message.warning('请先输入接口 URL')
        return
      }
      this.isTestingConnection = true
      try {
        const res = await fetch('/ai/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api: this.ruleForm.api,
            key: this.ruleForm.key,
            model: this.ruleForm.model
          })
        })
        const result = await res.json()
        const now = new Date()
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

        if (result.code === 0) {
          this.setAiStatus({
            status: 'ready',
            message: result.msg || '大模型连接正常',
            latency: result.latency || 0,
            lastTested: timeStr
          })
          this.$message.success(result.msg || `接入测试成功！延迟 ${result.latency}ms`)
        } else {
          this.setAiStatus({
            status: 'error',
            message: result.msg || '连接失败',
            latency: result.latency || 0,
            lastTested: timeStr
          })
          this.$message.error(`接入测试未通过: ${result.msg || '未知错误'}`)
        }
      } catch (err) {
        this.setAiStatus({
          status: 'error',
          message: err.message,
          latency: 0,
          lastTested: ''
        })
        this.$message.error(`网络请求异常: ${err.message}`)
      } finally {
        this.isTestingConnection = false
      }
    },

    getContinuationPresetTemplate(id) {
      const preset = this.continuationPresets.find(p => p.id === id)
      return preset ? preset.template : ''
    },

    getExplanationPresetTemplate(id) {
      const preset = this.explanationPresets.find(p => p.id === id)
      return preset ? preset.template : ''
    },

    onContinuationPresetSelect(id) {
      this.promptForm.aiContinuationCustomPrompt = this.getContinuationPresetTemplate(
        id
      )
    },

    onExplanationPresetSelect(id) {
      this.promptForm.aiExplanationCustomPrompt = this.getExplanationPresetTemplate(
        id
      )
    },

    resetContinuationPrompt() {
      this.promptForm.aiContinuationCustomPrompt = this.getContinuationPresetTemplate(
        this.promptForm.aiContinuationPromptPreset
      )
    },

    resetExplanationPrompt() {
      this.promptForm.aiExplanationCustomPrompt = this.getExplanationPresetTemplate(
        this.promptForm.aiExplanationPromptPreset
      )
    },

    cancel() {
      this.close()
      this.initFormData()
    },

    confirm() {
      this.close()
      // 保存到 vuex 及 localStorage
      this.setLocalConfig({
        ...this.ruleForm,
        ...this.promptForm,
        ...this.noteBoxForm
      })
      this.$message.success('AI 功能与模型配置已成功保存')
    }
  }
}
</script>

<style lang="less" scoped>
.aiConfigDialog {
  /deep/ .el-dialog__body {
    padding: 12px 24px 18px;
  }

  .aiConfigTabs {
    /deep/ .el-tabs__header {
      margin-bottom: 14px;
    }
  }

  .tabContent {
    min-height: 290px;

    /* 状态卡片样式 */
    .aiStatusBanner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 18px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      transition: all 0.25s ease;

      &.status-ready {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }

      &.status-error {
        background: #fef2f2;
        border-color: #fecaca;
      }

      &.status-testing {
        background: #fefce8;
        border-color: #fef08a;
      }

      &.status-unconfigured {
        background: #f8fafc;
        border-color: #e2e8f0;
      }

      .statusLeft {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;

        .statusDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;

          &.dot-ready {
            background: #22c55e;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
          }

          &.dot-error {
            background: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
          }

          &.dot-testing {
            background: #eab308;
            box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.2);
            animation: pulseDot 1s infinite alternate;
          }

          &.dot-unconfigured {
            background: #94a3b8;
          }
        }

        .statusTextGroup {
          display: flex;
          flex-direction: column;
          gap: 3px;

          .statusHeaderRow {
            display: flex;
            align-items: center;
            gap: 8px;

            .statusTitle {
              font-size: 14px;
              font-weight: 600;
              color: #1e293b;
            }

            .statusTag {
              height: 20px;
              line-height: 18px;
              padding: 0 6px;
            }

            .latencyBadge {
              font-size: 11px;
              font-weight: 600;
              color: #15803d;
              background: #dcfce7;
              padding: 1px 6px;
              border-radius: 4px;
            }
          }

          .statusDesc {
            font-size: 12px;
            color: #64748b;
            line-height: 1.4;
          }
        }
      }

      .statusRight {
        flex-shrink: 0;
        margin-left: 12px;
      }
    }

    .formItemTip {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.4;
      margin-top: 4px;
    }

    .modelInputRow {
      display: flex;
      align-items: center;
      gap: 8px;

      .pullModelsBtn {
        flex-shrink: 0;
      }
    }

    .sectionTitle {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .presetDescText {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }

    .variableHelp {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      font-size: 11px;
      color: #94a3b8;

      code {
        background: #f1f5f9;
        padding: 1px 4px;
        border-radius: 3px;
        color: #2563eb;
      }
    }

    .settingItemTip {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
      line-height: 1.5;
    }

    .radioSubText {
      font-size: 12px;
      color: #64748b;
    }
  }
}

@keyframes pulseDot {
  from {
    opacity: 0.5;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1.15);
  }
}
</style>
