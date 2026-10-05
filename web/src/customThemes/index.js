import { businessBlue, businessBlueImg } from './businessBlue'
import { businessHighContrast, businessHighContrastImg } from './businessHighContrast'
import { naturalBranch, naturalBranchImg } from './naturalBranch'
import { freshForest, freshForestImg } from './freshForest'
import { softMacaron, softMacaronImg } from './softMacaron'
import { warmDoodle, warmDoodleImg } from './warmDoodle'

// 轻松曲线与自然树枝主题
export const relaxedThemes = [
  {
    name: '自然树枝 (轻松曲线)',
    value: 'naturalBranch',
    theme: naturalBranch,
    dark: false,
    img: naturalBranchImg
  },
  {
    name: '清新森系 (治愈薄荷)',
    value: 'freshForest',
    theme: freshForest,
    dark: false,
    img: freshForestImg
  },
  {
    name: '温暖马卡龙 (柔和胶囊)',
    value: 'softMacaron',
    theme: softMacaron,
    dark: false,
    img: softMacaronImg
  },
  {
    name: '暖阳手绘 (活力橙红)',
    value: 'warmDoodle',
    theme: warmDoodle,
    dark: false,
    img: warmDoodleImg
  }
]

// 商务与高对比主题
export const businessThemes = [
  {
    name: '商务深蓝 (高对比推荐)',
    value: 'businessBlue',
    theme: businessBlue,
    dark: false,
    img: businessBlueImg
  },
  {
    name: '商务极简 (黑白高对比)',
    value: 'businessHighContrast',
    theme: businessHighContrast,
    dark: false,
    img: businessHighContrastImg
  }
]

export const customThemes = [...relaxedThemes, ...businessThemes]

export const registerCustomThemes = MindMap => {
  customThemes.forEach(item => {
    MindMap.defineTheme(item.value, item.theme)
  })
}

export default customThemes
