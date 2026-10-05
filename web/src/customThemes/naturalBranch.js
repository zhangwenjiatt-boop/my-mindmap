// 自然树枝主题（轻松绿意、树枝曲线与圆角卡片）
export const naturalBranch = {
  lineColor: '#2E7D32',
  lineWidth: 2,
  lineStyle: 'curve',
  rootLineKeepSameInCurve: true,
  generalizationLineWidth: 2,
  generalizationLineColor: '#2E7D32',
  backgroundColor: '#F9FAF6',
  root: {
    shape: 'roundedRectangle',
    fillColor: '#1B5E20',
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
    borderRadius: 14,
    borderColor: '#2E7D32',
    borderWidth: 2,
    paddingX: 22,
    paddingY: 11
  },
  second: {
    shape: 'roundedRectangle',
    fillColor: '#FFFFFF',
    color: '#1B5E20',
    borderColor: '#2E7D32',
    borderWidth: 2,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 'bold',
    paddingX: 16,
    paddingY: 8,
    marginX: 65,
    marginY: 20
  },
  // 三级及深层节点：独立柔和外框与轻盈底色
  node: {
    shape: 'roundedRectangle',
    fillColor: '#F1F8E9',
    color: '#1B5E20',
    borderColor: '#A5D6A7',
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
    fillColor: '#E8F5E9',
    borderColor: '#4CAF50',
    color: '#1B5E20',
    borderWidth: 1,
    borderRadius: 6
  }
}

export const naturalBranchImg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70" width="120" height="70"><rect width="120" height="70" fill="%23f9faf6"/><path d="M38 35 C52 35 55 20 72 20 M38 35 C52 35 55 50 72 50" stroke="%232e7d32" stroke-width="2" fill="none"/><rect x="6" y="24" width="34" height="22" rx="7" fill="%231b5e20"/><text x="23" y="38" font-size="8.5" font-weight="bold" fill="%23ffffff" text-anchor="middle" font-family="sans-serif">树枝</text><rect x="72" y="12" width="40" height="16" rx="5" fill="%23ffffff" stroke="%232e7d32" stroke-width="1.5"/><text x="92" y="23" font-size="8" font-weight="bold" fill="%231b5e20" text-anchor="middle" font-family="sans-serif">分支</text><rect x="72" y="42" width="40" height="16" rx="4" fill="%23f1f8e9" stroke="%23a5d6a7" stroke-width="1.2"/><text x="92" y="53" font-size="7.5" fill="%232e7d32" text-anchor="middle" font-family="sans-serif">叶片</text></svg>`
