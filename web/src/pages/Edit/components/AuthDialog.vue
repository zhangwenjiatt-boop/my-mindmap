<template>
  <el-dialog
    :visible="visible"
    :title="activeTab === 'login' ? '用户登录' : '注册新账号'"
    width="420px"
    custom-class="authDialog"
    :close-on-click-modal="false"
    :append-to-body="true"
    @close="handleClose"
  >
    <div class="authBox">
      <!-- 顶部欢迎提示与 Tab 切换 -->
      <div class="authHeader">
        <div class="authLogo">
          <span class="logoIcon">🧠</span>
          <span class="logoTitle">思绪思维导图</span>
        </div>
        <p class="authSub">
          {{
            activeTab === 'login'
              ? '登录账号，即可随时在多台设备间保存并管理您的思维导图'
              : '注册个人专属账号，开启多人独立思维空间与项目库'
          }}
        </p>
      </div>

      <el-tabs v-model="activeTab" class="authTabs" :stretch="true">
        <el-tab-pane label="账号登录" name="login"></el-tab-pane>
        <el-tab-pane label="注册新账号" name="register"></el-tab-pane>
      </el-tabs>

      <!-- 登录表单 -->
      <el-form
        v-if="activeTab === 'login'"
        :model="loginForm"
        :rules="loginRules"
        ref="loginFormRef"
        label-position="top"
        size="medium"
        @submit.native.prevent="handleLogin"
      >
        <el-form-item label="登录账号" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入您的账号"
            prefix-icon="el-icon-user"
            clearable
            @keyup.enter.native="handleLogin"
          ></el-input>
        </el-form-item>
        <el-form-item label="登录密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            show-password
            placeholder="请输入登录密码"
            prefix-icon="el-icon-lock"
            @keyup.enter.native="handleLogin"
          ></el-input>
        </el-form-item>
        <div class="formActions">
          <el-button
            type="primary"
            class="submitBtn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '正在登录...' : '立即登录' }}
          </el-button>
        </div>
      </el-form>

      <!-- 注册表单 -->
      <el-form
        v-else
        :model="registerForm"
        :rules="registerRules"
        ref="registerFormRef"
        label-position="top"
        size="medium"
        @submit.native.prevent="handleRegister"
      >
        <el-form-item label="设置账号" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="2-32位字母/数字/中文"
            prefix-icon="el-icon-user"
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item label="用户昵称 (选填)" prop="nickname">
          <el-input
            v-model="registerForm.nickname"
            placeholder="如：思维学者、项目经理"
            prefix-icon="el-icon-postcard"
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item label="设置密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            show-password
            placeholder="不少于 4 位字符"
            prefix-icon="el-icon-lock"
          ></el-input>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入密码确认"
            prefix-icon="el-icon-check"
            @keyup.enter.native="handleRegister"
          ></el-input>
        </el-form-item>
        <div class="formActions">
          <el-button
            type="primary"
            class="submitBtn"
            :loading="loading"
            @click="handleRegister"
          >
            {{ loading ? '正在注册...' : '立即注册并进入' }}
          </el-button>
        </div>
      </el-form>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { registerUser, loginUser, fetchProjectList, fetchProjectDetail } from '@/api/auth'

export default {
  name: 'AuthDialog',
  data() {
    const validateConfirm = (rule, value, callback) => {
      if (value !== this.registerForm.password) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }
    return {
      activeTab: 'login',
      loading: false,
      loginForm: {
        username: '',
        password: ''
      },
      loginRules: {
        username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      },
      registerForm: {
        username: '',
        nickname: '',
        password: '',
        confirmPassword: ''
      },
      registerRules: {
        username: [
          { required: true, message: '请输入账号', trigger: 'blur' },
          { min: 2, max: 32, message: '账号长度在 2 到 32 个字符之间', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 4, message: '密码不能少于 4 位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请确认密码', trigger: 'blur' },
          { validator: validateConfirm, trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapState({
      visible: state => state.isAuthDialogVisible
    })
  },
  methods: {
    ...mapMutations([
      'setAuthDialogVisible',
      'setToken',
      'setUserInfo',
      'setCurrentProject',
      'setProjectList'
    ]),

    handleClose() {
      this.setAuthDialogVisible(false)
    },

    // 处理登录
    async handleLogin() {
      this.$refs.loginFormRef.validate(async valid => {
        if (!valid) return
        this.loading = true
        try {
          const res = await loginUser(this.loginForm.username, this.loginForm.password)
          if (res.code === 0 && res.data) {
            this.setToken(res.data.token)
            this.setUserInfo(res.data.user)

            this.$message.success(`欢迎回来，${res.data.user.nickname || res.data.user.username}！`)
            this.setAuthDialogVisible(false)

            // 拉取项目列表
            await this.loadUserProjects(res.data.currentProject)
          } else {
            this.$message.error(res.msg || '登录失败')
          }
        } catch (err) {
          this.$message.error(err.message || '登录失败')
        } finally {
          this.loading = false
        }
      })
    },

    // 处理注册
    async handleRegister() {
      this.$refs.registerFormRef.validate(async valid => {
        if (!valid) return
        this.loading = true
        try {
          const res = await registerUser(
            this.registerForm.username,
            this.registerForm.password,
            this.registerForm.nickname
          )
          if (res.code === 0 && res.data) {
            this.setToken(res.data.token)
            this.setUserInfo(res.data.user)

            this.$message.success(`恭喜注册成功，已为您开通专属思维导图空间！`)
            this.setAuthDialogVisible(false)

            // 初始化新用户的项目
            await this.loadUserProjects(res.data.currentProject)
          } else {
            this.$message.error(res.msg || '注册失败')
          }
        } catch (err) {
          this.$message.error(err.message || '注册失败')
        } finally {
          this.loading = false
        }
      })
    },

    // 加载用户项目并激活
    async loadUserProjects(preferredProject) {
      try {
        const listRes = await fetchProjectList()
        const projects = (listRes && listRes.data) || []
        this.setProjectList(projects)

        let targetProj = preferredProject || projects[0]
        if (targetProj) {
          this.setCurrentProject(targetProj)
          const detailRes = await fetchProjectDetail(targetProj.id)
          if (detailRes && detailRes.data && detailRes.data.data) {
            this.$bus.$emit('loadProjectData', detailRes.data.data)
          }
        }
      } catch (e) {
        console.error('Failed to load user projects after login:', e)
      }
    }
  }
}
</script>

<style lang="less" scoped>
.authDialog {
  border-radius: 14px;
  overflow: hidden;
}

.authBox {
  padding: 0 10px 10px;
}

.authHeader {
  text-align: center;
  margin-bottom: 20px;

  .authLogo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 6px;

    .logoIcon {
      font-size: 26px;
    }

    .logoTitle {
      font-size: 19px;
      font-weight: 700;
      color: #2c3e50;
      letter-spacing: 0.5px;
    }
  }

  .authSub {
    font-size: 13px;
    color: #7f8c8d;
    margin: 0;
    line-height: 1.5;
  }
}

.authTabs {
  margin-bottom: 18px;

  /deep/ .el-tabs__item {
    font-size: 15px;
    font-weight: 600;
  }
}

.formActions {
  margin-top: 24px;

  .submitBtn {
    width: 100%;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.25);
  }
}
</style>
