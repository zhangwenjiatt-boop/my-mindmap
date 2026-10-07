<template>
  <div class="loginPageContainer">
    <!-- 背景流光与几何网格装饰 -->
    <div class="bgDecorate">
      <div class="glowCircle glow1"></div>
      <div class="glowCircle glow2"></div>
      <div class="glowCircle glow3"></div>
      <div class="gridPattern"></div>
    </div>

    <!-- 主体卡片容器 -->
    <div class="mainCard">
      <!-- 左侧：产品介绍与特性展示 -->
      <div class="heroSection">
        <div class="brandHeader">
          <div class="brandLogo">
            <span class="logoIcon">🧠</span>
            <span class="logoText">思绪思维导图</span>
          </div>
          <span class="versionBadge">多人企业空间版 v2.0</span>
        </div>

        <h1 class="heroTitle">
          激发灵感，结构思考<br />
          让每一个创意井然有序
        </h1>
        <p class="heroDesc">
          全新多用户体系已上线。为每位团队成员提供独立的数据空间与多项目库管理，畅享实时云端同步与智能化思维推演。
        </p>

        <!-- 特色亮点列表 -->
        <div class="featureList">
          <div class="featureItem">
            <div class="featureIconWrap iconBg1">
              <i class="el-icon-folder-opened"></i>
            </div>
            <div class="featureText">
              <div class="featureName">多思维导图项目库</div>
              <div class="featureSub">自由创建并保存多个独立思维导图，随时随心切换</div>
            </div>
          </div>

          <div class="featureItem">
            <div class="featureIconWrap iconBg2">
              <i class="el-icon-lock"></i>
            </div>
            <div class="featureText">
              <div class="featureName">多人账号物理隔离</div>
              <div class="featureSub">独立用户身份认证与私有项目空间，数据私密安全</div>
            </div>
          </div>

          <div class="featureItem">
            <div class="featureIconWrap iconBg3">
              <i class="el-icon-refresh"></i>
            </div>
            <div class="featureText">
              <div class="featureName">实时云端自动同步</div>
              <div class="featureSub">毫秒级防抖持久化存储，多端编辑永不丢失修改</div>
            </div>
          </div>

          <div class="featureItem">
            <div class="featureIconWrap iconBg4">
              <i class="el-icon-magic-stick"></i>
            </div>
            <div class="featureText">
              <div class="featureName">双语对照与 AI 赋能</div>
              <div class="featureSub">一键中英双语对照与智能扩写，助力深度洞察与创作</div>
            </div>
          </div>
        </div>

        <div class="heroFooter">
          <span>© 2026 思绪思维导图平台 · 开箱即用的专业思维工具</span>
        </div>
      </div>

      <!-- 右侧：登录与注册交互表单 -->
      <div class="formSection">
        <div class="formCardInner">
          <div class="formTop">
            <div class="formWelcome">欢迎使用</div>
            <div class="formSub">请登录您的账号或注册新用户进入工作台</div>
          </div>

          <!-- Tab 切换 -->
          <div class="authTabSwitcher">
            <div
              class="tabBtn"
              :class="{ active: activeTab === 'login' }"
              @click="switchTab('login')"
            >
              账号登录
            </div>
            <div
              class="tabBtn"
              :class="{ active: activeTab === 'register' }"
              @click="switchTab('register')"
            >
              注册新账号
            </div>
          </div>

          <!-- 登录表单 -->
          <el-form
            v-if="activeTab === 'login'"
            :model="loginForm"
            :rules="loginRules"
            ref="loginFormRef"
            label-position="top"
            size="medium"
            class="authForm"
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

            <div class="formExtraRow">
              <el-checkbox v-model="rememberUsername">记住账号</el-checkbox>
            </div>

            <el-button
              type="primary"
              class="submitAuthBtn"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '正在验证并登录...' : '立即登录工作台' }}
            </el-button>
          </el-form>

          <!-- 注册表单 -->
          <el-form
            v-else
            :model="registerForm"
            :rules="registerRules"
            ref="registerFormRef"
            label-position="top"
            size="medium"
            class="authForm"
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
                placeholder="例如：产品经理小张"
                prefix-icon="el-icon-postcard"
                clearable
              ></el-input>
            </el-form-item>

            <el-form-item label="设置登录密码" prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                show-password
                placeholder="不少于 4 位字符"
                prefix-icon="el-icon-lock"
              ></el-input>
            </el-form-item>

            <el-form-item label="确认登录密码" prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                show-password
                placeholder="再次输入密码进行确认"
                prefix-icon="el-icon-check"
                @keyup.enter.native="handleRegister"
              ></el-input>
            </el-form-item>

            <el-button
              type="primary"
              class="submitAuthBtn"
              :loading="loading"
              @click="handleRegister"
            >
              {{ loading ? '正在注册并分配专属空间...' : '立即注册并进入' }}
            </el-button>
          </el-form>

          <!-- 访客直接试用入口 -->
          <div class="guestTrialRow">
            <span class="dividerText">或</span>
            <div class="guestLink" @click="enterAsGuest">
              <i class="el-icon-view"></i> 暂不登录，以访客模式试用（本地编辑）
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapMutations } from 'vuex'
import { registerUser, loginUser, fetchProjectList } from '@/api/auth'

export default {
  name: 'Login',
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
      rememberUsername: true,
      loginForm: {
        username: localStorage.getItem('SAVED_USERNAME') || '',
        password: ''
      },
      loginRules: {
        username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
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
  methods: {
    ...mapMutations(['setToken', 'setUserInfo', 'setCurrentProject', 'setProjectList']),

    switchTab(tab) {
      this.activeTab = tab
    },

    // 处理用户登录
    handleLogin() {
      this.$refs.loginFormRef.validate(async valid => {
        if (!valid) return
        this.loading = true
        try {
          const res = await loginUser(this.loginForm.username, this.loginForm.password)
          if (res.code === 0 && res.data) {
            this.setToken(res.data.token)
            this.setUserInfo(res.data.user)

            if (this.rememberUsername) {
              localStorage.setItem('SAVED_USERNAME', this.loginForm.username)
            } else {
              localStorage.removeItem('SAVED_USERNAME')
            }

            if (res.data.currentProject) {
              this.setCurrentProject(res.data.currentProject)
            }

            // 拉取项目列表
            try {
              const listRes = await fetchProjectList()
              if (listRes && listRes.data) {
                this.setProjectList(listRes.data)
              }
            } catch (e) {}

            this.$message.success(`欢迎回来，${res.data.user.nickname || res.data.user.username}！`)
            const redirect = this.$route.query.redirect || '/'
            this.$router.push(redirect)
          } else {
            this.$message.error(res.msg || '登录失败')
          }
        } catch (err) {
          this.$message.error(err.message || '登录异常')
        } finally {
          this.loading = false
        }
      })
    },

    // 处理新用户注册
    handleRegister() {
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

            if (res.data.currentProject) {
              this.setCurrentProject(res.data.currentProject)
            }

            this.$message.success('注册成功，已为您开通专属思维导图空间！')
            const redirect = this.$route.query.redirect || '/'
            this.$router.push(redirect)
          } else {
            this.$message.error(res.msg || '注册失败')
          }
        } catch (err) {
          this.$message.error(err.message || '注册异常')
        } finally {
          this.loading = false
        }
      })
    },

    // 访客直接体验
    enterAsGuest() {
      sessionStorage.setItem('MM_GUEST_MODE', 'true')
      this.$message.info('当前进入访客体验模式，思维导图将保存在本地浏览器缓存中')
      this.$router.push({ path: '/', query: { guest: '1' } })
    }
  }
}
</script>

<style lang="less" scoped>
.loginPageContainer {
  min-height: 100vh;
  width: 100vw;
  background-color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* 动态背景装饰 */
.bgDecorate {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;

  .glowCircle {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.35;
  }

  .glow1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, #3b82f6, #1d4ed8);
    top: -100px;
    left: -100px;
  }

  .glow2 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, #8b5cf6, #6d28d9);
    bottom: -150px;
    right: -100px;
  }

  .glow3 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, #06b6d4, #0284c7);
    top: 40%;
    left: 45%;
    transform: translate(-50%, -50%);
    opacity: 0.2;
  }

  .gridPattern {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
    background-size: 30px 30px;
  }
}

/* 主卡片：左侧品牌介绍 + 右侧登录卡片 */
.mainCard {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1080px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  overflow: hidden;
}

/* 左侧介绍部分 */
.heroSection {
  flex: 1.1;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));

  .brandHeader {
    display: flex;
    align-items: center;
    gap: 12px;

    .brandLogo {
      display: flex;
      align-items: center;
      gap: 10px;

      .logoIcon {
        font-size: 32px;
      }

      .logoText {
        font-size: 22px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.5px;
      }
    }

    .versionBadge {
      font-size: 11px;
      font-weight: 600;
      color: #60a5fa;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 2px 8px;
      border-radius: 12px;
    }
  }

  .heroTitle {
    font-size: 28px;
    font-weight: 700;
    color: #f8fafc;
    line-height: 1.35;
    margin: 28px 0 12px;
    letter-spacing: -0.5px;
  }

  .heroDesc {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.6;
    margin-bottom: 28px;
  }

  .featureList {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 32px;

    .featureItem {
      display: flex;
      align-items: center;
      gap: 14px;

      .featureIconWrap {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }

      .iconBg1 {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
      }
      .iconBg2 {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }
      .iconBg3 {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }
      .iconBg4 {
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
      }

      .featureText {
        .featureName {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 2px;
        }

        .featureSub {
          font-size: 12px;
          color: #64748b;
        }
      }
    }
  }

  .heroFooter {
    font-size: 12px;
    color: #475569;
  }
}

/* 右侧表单部分 */
.formSection {
  flex: 0.9;
  padding: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);

  .formCardInner {
    width: 100%;
    max-width: 360px;
  }

  .formTop {
    margin-bottom: 24px;

    .formWelcome {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }

    .formSub {
      font-size: 13px;
      color: #94a3b8;
    }
  }

  .authTabSwitcher {
    display: flex;
    background: rgba(30, 41, 59, 0.8);
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);

    .tabBtn {
      flex: 1;
      text-align: center;
      padding: 9px 0;
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.25s ease;

      &.active {
        background: #3b82f6;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
      }
    }
  }

  .authForm {
    /deep/ .el-form-item__label {
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 500;
      padding-bottom: 4px;
    }

    /deep/ .el-input__inner {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border-radius: 8px;
      height: 42px;
      line-height: 42px;

      &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
    }

    /deep/ .el-input__icon {
      color: #64748b;
    }
  }

  .formExtraRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    /deep/ .el-checkbox__label {
      color: #94a3b8;
      font-size: 13px;
    }
  }

  .submitAuthBtn {
    width: 100%;
    height: 44px;
    font-size: 15px;
    font-weight: 600;
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border: none;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    transition: all 0.25s ease;

    &:hover {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
    }
  }

  .guestTrialRow {
    margin-top: 24px;
    text-align: center;
    position: relative;

    .dividerText {
      display: block;
      font-size: 12px;
      color: #475569;
      margin-bottom: 12px;
      position: relative;

      &::before,
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 35%;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
      }
      &::before {
        left: 0;
      }
      &::after {
        right: 0;
      }
    }

    .guestLink {
      font-size: 13px;
      color: #94a3b8;
      cursor: pointer;
      transition: color 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 5px;

      &:hover {
        color: #60a5fa;
        text-decoration: underline;
      }
    }
  }
}

/* 响应式排版 */
@media (max-width: 860px) {
  .mainCard {
    flex-direction: column;
  }
  .heroSection {
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 32px 24px;
  }
  .formSection {
    padding: 32px 24px;
  }
}
</style>
