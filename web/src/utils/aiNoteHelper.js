import { createUid } from 'simple-mind-map/src/utils'

const AI_NOTE_DIVIDER_START = '<!-- AI_NOTES_START -->'
const AI_NOTE_DIVIDER_END = '<!-- AI_NOTES_END -->'

/**
 * 获取节点中的 AI 释义历史记录列表
 * @param {Object} node simple-mind-map 节点实例
 * @returns {Array} aiNotes 列表
 */
export function getAiNotes(node) {
  if (!node) return []
  const data = node.getData('aiNotes')
  if (Array.isArray(data)) {
    return data
  }
  return []
}

/**
 * 从节点的原始 note 文本中分离出纯手动备注内容（排除 AI 自动追加的释义部分）
 * @param {string} fullNote 节点完整的 note 字符串
 * @returns {string} 纯用户手动输入的备注
 */
export function extractManualNote(fullNote = '') {
  if (!fullNote) return ''
  // 匹配标记包裹的区域
  const markerRegex = new RegExp(
    `${AI_NOTE_DIVIDER_START}[\\s\\S]*?${AI_NOTE_DIVIDER_END}`,
    'g'
  )
  let manual = fullNote.replace(markerRegex, '').trim()
  // 兼容未包含标记但以标准标题开头的旧格式
  if (manual.includes('### 🤖 AI 释义历史记录')) {
    manual = manual.split('### 🤖 AI 释义历史记录')[0].trim()
  }
  return manual
}

/**
 * 将 aiNotes 数组格式化为美观的 Markdown 文本
 * @param {Array} aiNotes 释义记录列表
 * @returns {string} Markdown 文本
 */
export function formatAiNotesToMarkdown(aiNotes = []) {
  if (!aiNotes || aiNotes.length === 0) return ''
  const itemsMd = aiNotes
    .map(item => {
      const modeStr = item.presetName ? ` | 模式：${item.presetName}` : ''
      return `#### 📌 ${item.term || '释义'}\n> 记录时间：${item.time || ''}${modeStr}\n\n${item.content || ''}`
    })
    .join('\n\n---\n\n')

  return `${AI_NOTE_DIVIDER_START}\n### 🤖 AI 释义历史记录\n\n${itemsMd}\n${AI_NOTE_DIVIDER_END}`
}

/**
 * 将更新后的 aiNotes 同步写入节点的 aiNotes 数据及 note 属性
 * @param {Object} node 节点实例
 * @param {Array} aiNotes 最新的释义列表
 */
export function syncNodeAiNotes(node, aiNotes = []) {
  if (!node) return
  const currentNote = node.getData('note') || ''
  const manualNote = extractManualNote(currentNote)
  const aiMarkdown = formatAiNotesToMarkdown(aiNotes)

  let fullNote = ''
  if (manualNote && aiMarkdown) {
    fullNote = `${manualNote}\n\n${aiMarkdown}`
  } else if (aiMarkdown) {
    fullNote = aiMarkdown
  } else {
    fullNote = manualNote
  }

  // 写入结构化数据
  node.setData({
    aiNotes: [...aiNotes]
  })
  // 写入并触发思维导图核心的备注状态渲染 (显示/更新 📝 图标)
  node.setNote(fullNote)
}

/**
 * 给节点添加一条新的 AI 释义记录
 * @param {Object} node 节点实例
 * @param {Object} item { term, content, preset, presetName }
 * @returns {Array} 最新的 aiNotes 列表
 */
export function addAiNote(node, item = {}) {
  if (!node) return []
  const list = getAiNotes(node)
  const now = new Date()
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')} ${String(
    now.getHours()
  ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
    now.getSeconds()
  ).padStart(2, '0')}`

  const newNote = {
    id: createUid(),
    term: (item.term || '').trim(),
    content: (item.content || '').trim(),
    time: timeStr,
    preset: item.preset || 'plain',
    presetName: item.presetName || '通俗易懂'
  }

  const updatedList = [newNote, ...list]
  syncNodeAiNotes(node, updatedList)
  return updatedList
}

/**
 * 更新节点中指定的一条 AI 释义记录
 * @param {Object} node 节点实例
 * @param {string} noteId 记录ID
 * @param {Object} fields 要修改的字段 { term, content }
 * @returns {Array} 最新的 aiNotes 列表
 */
export function updateAiNote(node, noteId, fields = {}) {
  if (!node || !noteId) return []
  const list = getAiNotes(node)
  const updatedList = list.map(item => {
    if (item.id === noteId) {
      return {
        ...item,
        ...fields
      }
    }
    return item
  })
  syncNodeAiNotes(node, updatedList)
  return updatedList
}

/**
 * 删除节点中指定的一条 AI 释义记录
 * @param {Object} node 节点实例
 * @param {string} noteId 记录ID
 * @returns {Array} 最新的 aiNotes 列表
 */
export function deleteAiNote(node, noteId) {
  if (!node || !noteId) return []
  const list = getAiNotes(node)
  const updatedList = list.filter(item => item.id !== noteId)
  syncNodeAiNotes(node, updatedList)
  return updatedList
}

/**
 * 清空节点中的全部 AI 释义记录（保留可能存在的普通手动备注）
 * @param {Object} node 节点实例
 */
export function clearAllAiNotes(node) {
  if (!node) return
  syncNodeAiNotes(node, [])
}
