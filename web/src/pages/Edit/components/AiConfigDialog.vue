<template>
  <el-dialog
    class="aiConfigDialog"
    :title="$t('ai.AIConfiguration') || 'AI功能与模型配置'"
    :visible.sync="aiConfigDialogVisible"
    width="620px"
    top="10vh"
    append-to-body
  >
    <el-tabs v-model="activeTab" class="aiConfigTabs">
      <!-- Tab 1: 模型连接配置 -->
      <el-tab-pane label="大模型连接" name="model">
        <div class="tabContent">
          <p class="sectionTitle">{{ $t('ai.VolcanoArkLargeModelConfiguration') || '火山方舟 / OpenAI 兼容接口配置：' }}</p>
          <p class="sectionDesc">
            {{ $t('ai.configTip') || '配置大模型 API Key 及接入点参数。如未配置 Key，本地服务将自动启用智能辅助测试模式。' }}
            <a href="https://mp.weixin.qq.com/s/JNb7PH4sCjWzIZ9G8wStGQ" target="_blank">{{ $t('ai.course') }}</a>。
          </p>

          <el-form
            :model="ruleForm"
            ref="ruleFormRef"
            label-width="110px"
            size="small"
          >
            <el-form-item label="API Key">
              <el-input
                v-model="ruleForm.key"
                placeholder="请输入 API Key（如 ark-xxx 或 sk-xxx）"
                show-password
              ></el-input>
            </el-form-item>
            <el-form-item :label="$t('ai.inferenceAccessPoint') || '模型/接入点'">
              <el-input
                v-model="ruleForm.model"
                placeholder="例如：ep-2024xxxx 或 gpt-4o-mini / deepseek-chat"
              ></el-input>
            </el-form-item>
            <el-form-item label="接口 URL">
              <el-input
                v-model="ruleForm.api"
                placeholder="默认：http://ark.cn-beijing.volces.com/api/v3/chat/completions"
              ></el-input>
            </el-form-item>
            <el-form-item label="代理端口">
              <el-input
                v-model="ruleForm.port"
                placeholder="默认 3456 或 8080"
              ></el-input>
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

      ruleForm: {
        api: '',
        key: '',
        model: '',
        port: '',
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
    ...mapState(['aiConfig', 'localConfig']),

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
    ...mapMutations(['setLocalConfig']),

    close() {
      this.$emit('change', false)
    },

    initFormData() {
      // 基础模型配置
      Object.keys(this.ruleForm).forEach(key => {
        this.ruleForm[key] = this.aiConfig[key] !== undefined ? this.aiConfig[key] : ''
      })

      // Prompt 配置
      this.promptForm.aiContinuationPromptPreset =
        this.localConfig.aiContinuationPromptPreset || 'expand'
      this.promptForm.aiContinuationCustomPrompt =
        this.localConfig.aiContinuationCustomPrompt ||
        this.getContinuationPresetTemplate(this.promptForm.aiContinuationPromptPreset)

      this.promptForm.aiExplanationPromptPreset =
        this.localConfig.aiExplanationPromptPreset || 'plain'
      this.promptForm.aiExplanationCustomPrompt =
        this.localConfig.aiExplanationCustomPrompt ||
        this.getExplanationPresetTemplate(this.promptForm.aiExplanationPromptPreset)

      // 备注框配置
      this.noteBoxForm.enableAiNoteBox =
        this.localConfig.enableAiNoteBox !== undefined
          ? this.localConfig.enableAiNoteBox
          : true
      this.noteBoxForm.aiNoteRecordMode =
        this.localConfig.aiNoteRecordMode || 'auto'
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
      this.promptForm.aiContinuationCustomPrompt = this.getContinuationPresetTemplate(id)
    },

    onExplanationPresetSelect(id) {
      this.promptForm.aiExplanationCustomPrompt = this.getExplanationPresetTemplate(id)
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
      this.$message.success('AI 功能与 Prompt 配置已成功保存')
    }
  }
}
</script>

<style lang="less" scoped>
.aiConfigDialog {
  /deep/ .el-dialog__body {
    padding: 10px 24px 16px;
  }

  .aiConfigTabs {
    /deep/ .el-tabs__header {
      margin-bottom: 12px;
    }
  }

  .tabContent {
    min-height: 280px;

    .sectionTitle {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .sectionDesc {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 14px;
      line-height: 1.6;
      padding-left: 10px;
      border-left: 3px solid #3b82f6;

      a {
        color: #2563eb;
      }
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
</style>
