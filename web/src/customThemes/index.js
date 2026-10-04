import { businessBlue, businessBlueImg } from './businessBlue'
import { businessHighContrast, businessHighContrastImg } from './businessHighContrast'

export const customThemes = [
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

export const registerCustomThemes = MindMap => {
  customThemes.forEach(item => {
    MindMap.defineTheme(item.value, item.theme)
  })
}

export default customThemes
