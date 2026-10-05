// 暖阳手绘主题（活泼橙黄、暖意曲线与圆润外框）
export const warmDoodle = {
  lineColor: '#EA580C',
  lineWidth: 2,
  lineStyle: 'curve',
  rootLineKeepSameInCurve: true,
  generalizationLineWidth: 2,
  generalizationLineColor: '#EA580C',
  backgroundColor: '#FFFBEB',
  root: {
    shape: 'roundedRectangle',
    fillColor: '#C2410C',
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
    borderRadius: 16,
    borderColor: '#9A3412',
    borderWidth: 2,
    paddingX: 22,
    paddingY: 11
  },
  second: {
    shape: 'roundedRectangle',
    fillColor: '#FFFFFF',
    color: '#9A3412',
    borderColor: '#EA580C',
    borderWidth: 2,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 'bold',
    paddingX: 16,
    paddingY: 8,
    marginX: 65,
    marginY: 20
  },
  node: {
    shape: 'roundedRectangle',
    fillColor: '#FFF7ED',
    color: '#9A3412',
    borderColor: '#FDBA74',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 'normal',
    paddingX: 12,
    paddingY: 6,
    marginX: 38,
    marginY: 12
  },
  generalization: {
    shape: 'roundedRectangle',
    fillColor: '#FFEDD5',
    borderColor: '#F97316',
    color: '#9A3412',
    borderWidth: 1,
    borderRadius: 6
  }
}

export const warmDoodleImg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70" width="120" height="70"><rect width="120" height="70" fill="%23fffbeb"/><path d="M38 35 C52 35 55 20 72 20 M38 35 C52 35 55 50 72 50" stroke="%23ea580c" stroke-width="2" fill="none"/><rect x="6" y="24" width="34" height="22" rx="8" fill="%23c2410c"/><text x="23" y="38" font-size="8.5" font-weight="bold" fill="%23ffffff" text-anchor="middle" font-family="sans-serif">暖阳</text><rect x="72" y="12" width="40" height="16" rx="5" fill="%23ffffff" stroke="%23ea580c" stroke-width="1.5"/><text x="92" y="23" font-size="8" font-weight="bold" fill="%239a3412" text-anchor="middle" font-family="sans-serif">活力</text><rect x="72" y="42" width="40" height="16" rx="4" fill="%23fff7ed" stroke="%23fdba74" stroke-width="1.2"/><text x="92" y="53" font-size="7.5" fill="%239a3412" text-anchor="middle" font-family="sans-serif">明亮</text></svg>`
