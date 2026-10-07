import Ai from '@/utils/ai'
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'
import { htmlEscape, textToNodeRichTextWithWrap } from 'simple-mind-map/src/utils'

/**
 * 语言检测：判断文本主要语言（中 / 英）
 * @param {string} text 
 * @returns {'zh' | 'en'}
 */
export function detectLanguage(text) {
  if (!text) return 'en'
  const clean = String(text).replace(/<[^>]+>/g, '').trim()
  return /[\u4e00-\u9fa5]/.test(clean) ? 'zh' : 'en'
}

/**
 * 清除 HTML 标签与多余空格
 */
export function cleanNodeText(text) {
  if (!text) return ''
  return String(text).replace(/<[^>]+>/g, '').trim()
}

/**
 * 根据双语展示模式生成节点展示的文本
 * @param {string} originText 原文
 * @param {string} transText 译文
 * @param {'zh' | 'en' | 'dual'} mode 显示模式
 * @param {'zh' | 'en'} langOrigin 原文语言
 * @param {boolean} isRich 是否富文本
 * @returns {string} 组合后的展示文本
 */
export function formatBilingualNodeText(originText = '', transText = '', mode = 'dual', langOrigin = null, isRich = false) {
  let orig = cleanNodeText(originText)
  let trans = cleanNodeText(transText)

  if (!trans && !orig) return ''
  if (!trans) return isRich ? `<p><span>${htmlEscape(orig)}</span></p>` : orig
  if (!orig) return isRich ? `<p><span>${htmlEscape(trans)}</span></p>` : trans

  const lang = langOrigin || detectLanguage(orig)
  let result = ''

  if (mode === 'zh') {
    // 纯中文模式：必须展示中文
    result = lang === 'zh' ? orig : (trans || orig)
  } else if (mode === 'en') {
    // 纯英文模式：必须展示英文
    result = lang === 'en' ? orig : (trans || orig)
  } else {
    // 双语对照模式 (dual)
    if (orig === trans) {
      result = orig
    } else {
      result = `${orig}\n${trans}`
    }
  }

  if (isRich) {
    return result
      .split('\n')
      .map(line => `<p><span>${htmlEscape(line)}</span></p>`)
      .join('')
  }
  return result
}

/**
 * 将思维导图结构树转换为干净的层级 Markdown 文本
 * @param {Object} root 树根节点
 * @returns {string} Markdown 文本
 */
export function treeToCleanMarkdown(root) {
  if (!root) return ''
  let md = ''

  function walk(node, depth = 1) {
    if (!node || !node.data) return
    let text = node.data.text_origin || node.data.text || ''
    text = cleanNodeText(text)
    if (text.includes('\n')) {
      text = text.split('\n')[0].trim()
    }
    if (!text) text = 'Topic'

    // 根据深度生成 Markdown 标题标记或列表标记
    const prefix = depth <= 6 ? '#'.repeat(depth) + ' ' : '  '.repeat(depth - 6) + '- '
    md += `${prefix}${text}\n\n`

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => walk(child, depth + 1))
    }
  }

  walk(root, 1)
  return md.trim()
}

/**
 * 封装单次 AI 对话请求
 * @param {string} prompt 提示词
 * @param {Object} aiConfig AI 连接配置
 * @param {Function} onProgress 进度回调
 * @returns {Promise<string>} 返回最终内容
 */
export function callAiChat(prompt, aiConfig, onProgress = () => {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const aiInstance = new Ai()
      aiInstance.init('huoshan', aiConfig)

      await aiInstance.request(
        {
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        chunk => {
          onProgress(chunk)
        },
        content => {
          resolve(content)
        },
        err => {
          reject(err)
        }
      )
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 提取 AI 返回内容中的 Markdown（去除外层 ```markdown 包裹）
 */
function cleanAiMarkdownResult(aiOutput) {
  if (!aiOutput) return ''
  let content = aiOutput.trim()
  if (content.startsWith('```')) {
    content = content.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '')
  }
  return content.trim()
}

/**
 * 一次性将思维导图全篇 Markdown 提交大模型进行 1:1 翻译
 * @param {string} mdText 原 Markdown 字符串
 * @param {Object} aiConfig AI 连接配置
 * @param {Function} onProgress 进度回调
 * @returns {Promise<string>} 翻译后的 Markdown 字符串
 */
export async function translateMarkdownStructure(mdText, aiConfig, onProgress = () => {}) {
  const prompt = `你是一名精通中英双语的技术文献与学术专家，擅长制作思维导图与知识架构。
请将下面这份思维导图 Markdown 结构翻译为对等语言（如果原文主要是英文，请专业严谨地翻译为中文；如果原文主要是中文，请翻译为地道流利的英文）。

严格约束条件：
1. 必须 100% 保持原有的标题层级标记（#、##、###...）以及列表缩进层次，行数与节点层级必须与原文完全一一对应；
2. 保持专业术语在全文的统一性；
3. 直接输出翻译后的 Markdown 文本内容，不要包含任何前言、开场白、解释或总结说明。

Markdown内容如下：
${mdText}`

  const result = await callAiChat(prompt, aiConfig, onProgress)
  return cleanAiMarkdownResult(result)
}

/**
 * 1:1 深度归并原始导图树与翻译导图树，生成双轨数据
 * @param {Object} origNode 原始节点树
 * @param {Object} transNode 翻译后的节点树
 * @param {'zh' | 'en' | 'dual'} mode 显示模式
 * @returns {Object} 带有双轨数据的完整节点树
 */
export function mergeBilingualTree(origNode, transNode, mode = 'dual') {
  if (!origNode || !origNode.data) return origNode

  const rawOrigText = origNode.data.text_origin || origNode.data.text || ''
  const cleanOrig = cleanNodeText(rawOrigText)

  let cleanTrans = ''
  if (transNode && transNode.data) {
    cleanTrans = cleanNodeText(transNode.data.text || '')
  }

  const langOrigin = origNode.data.lang_origin || detectLanguage(cleanOrig)
  const langTrans = langOrigin === 'zh' ? 'en' : 'zh'

  origNode.data.text_origin = cleanOrig
  origNode.data.text_trans = cleanTrans
  origNode.data.lang_origin = langOrigin
  origNode.data.lang_trans = langTrans
  origNode.data.text = formatBilingualNodeText(cleanOrig, cleanTrans, mode, langOrigin)

  if (origNode.children && origNode.children.length > 0) {
    const transChildren = (transNode && transNode.children) ? transNode.children : []
    origNode.children.forEach((child, index) => {
      mergeBilingualTree(child, transChildren[index] || null, mode)
    })
  }

  return origNode
}

/**
 * 切换整张思维导图的双语展示模式
 * @param {Object} mindMap simple-mind-map 实例
 * @param {'zh' | 'en' | 'dual'} targetMode 目标显示模式
 */
export function switchMindMapBilingualMode(mindMap, targetMode) {
  if (!mindMap) return
  const fullData = mindMap.getData(true)
  if (!fullData || !fullData.root) return

  function walk(node) {
    if (!node || !node.data) return
    let orig = node.data.text_origin || ''
    let trans = node.data.text_trans || ''
    const cur = node.data.text || ''

    if (!orig) {
      const cleanCur = cleanNodeText(cur)
      if (cleanCur.includes('\n')) {
        const lines = cleanCur.split('\n')
        orig = lines[0].trim()
        trans = trans || lines.slice(1).join('\n').trim()
      } else {
        orig = cleanCur
      }
    }

    const lang = node.data.lang_origin || detectLanguage(orig)
    const langTrans = lang === 'zh' ? 'en' : 'zh'
    const isRich = !!node.data.richText

    node.data.text_origin = orig
    node.data.text_trans = trans
    node.data.lang_origin = lang
    node.data.lang_trans = langTrans
    node.data.text = formatBilingualNodeText(orig, trans, targetMode, lang, isRich)

    if (node.children && node.children.length > 0) {
      node.children.forEach(walk)
    }
  }

  walk(fullData.root)
  // 使用 setFullData 保留当前画布缩放与平移，同时触发完全重绘
  mindMap.setFullData(fullData)
  mindMap.emit('data_change', fullData.root)
}

/**
 * 设置单个节点的语言展示模式（支持纯中文、纯英文、双语对照、即时中英轮换）
 * @param {Object} node 节点实例
 * @param {'zh' | 'en' | 'dual' | 'toggle' | 'retranslate'} targetMode 目标模式
 * @param {Object} aiConfig AI 连接配置
 * @returns {Promise<{ orig: string, trans: string, text: string, mode: string }>}
 */
export async function setSingleNodeLanguageMode(node, targetMode = 'toggle', aiConfig) {
  if (!node) return null

  let orig = node.getData('text_origin') || ''
  let trans = node.getData('text_trans') || ''
  const curText = node.getData('text') || ''

  if (!orig) {
    const cleanCur = cleanNodeText(curText)
    if (cleanCur.includes('\n')) {
      const lines = cleanCur.split('\n')
      orig = lines[0].trim()
      trans = trans || lines.slice(1).join('\n').trim()
    } else {
      orig = cleanCur
    }
  }

  if (!orig) return null

  const isRich = !!node.getData('richText')
  let originLang = node.getData('lang_origin') || detectLanguage(orig)
  let transLang = originLang === 'zh' ? 'en' : 'zh'

  // 如果尚未翻译，或者用户要求重新翻译
  if (!trans || targetMode === 'retranslate') {
    const targetLangName = originLang === 'zh' ? '英文' : '中文'
    const prompt = `请将以下思维导图词条翻译为精准、地道的${targetLangName}。只输出翻译结果，不要输出任何多余说明：\n${orig}`
    const rawRes = await callAiChat(prompt, aiConfig)
    trans = cleanNodeText(rawRes)
    if (targetMode === 'retranslate') {
      targetMode = originLang === 'zh' ? 'en' : 'zh'
    }
  }

  // 计算目标模式
  let finalMode = targetMode
  if (targetMode === 'toggle') {
    const cleanCur = cleanNodeText(curText)
    // 如果当前已经是译文（比如英文原版当前显示成了中文译文），则切回原文语言
    if (trans && cleanCur === trans) {
      finalMode = originLang === 'zh' ? 'zh' : 'en'
    } else {
      // 否则切换到译文语言（例如英文原版切换为中文显示）
      finalMode = originLang === 'zh' ? 'en' : 'zh'
    }
  }

  const newText = formatBilingualNodeText(orig, trans, finalMode, originLang, isRich)

  node.setData({
    text_origin: orig,
    text_trans: trans,
    lang_origin: originLang,
    lang_trans: transLang,
    singleLanguageMode: finalMode
  })

  // 通过 setText 重新计算尺寸与布局重绘
  if (isRich) {
    node.setText(textToNodeRichTextWithWrap(newText), true)
  } else {
    node.setText(newText)
  }

  if (node.mindMap) {
    node.mindMap.render()
  }

  return {
    orig,
    trans,
    text: newText,
    mode: finalMode
  }
}

/**
 * 单节点即时翻译（兼容既有接口）
 * @param {Object} node 节点实例
 * @param {Object} aiConfig AI 连接配置
 * @param {'zh' | 'en' | 'dual' | 'toggle'} mode 当前模式
 * @returns {Promise<string>} 翻译后的译文
 */
export async function translateSingleNode(node, aiConfig, mode = 'zh') {
  const res = await setSingleNodeLanguageMode(node, mode, aiConfig)
  return res ? res.trans : ''
}

/**
 * 扫描导图中所有未翻译或新增修改的节点并进行批量补全翻译
 * @param {Object} mindMap simple-mind-map 实例
 * @param {Object} aiConfig AI 连接配置
 * @param {'zh' | 'en' | 'dual'} mode 当前模式
 * @param {Function} onProgress 进度回调
 * @returns {Promise<number>} 成功同步的节点数
 */
export async function syncUntranslatedNodes(mindMap, aiConfig, mode = 'dual', onProgress = () => {}) {
  if (!mindMap) return 0
  const fullData = mindMap.getData(true)
  if (!fullData || !fullData.root) return 0

  const needTranslateList = []

  function scan(node) {
    if (!node || !node.data) return
    const curText = cleanNodeText(node.data.text || '')
    const origText = cleanNodeText(node.data.text_origin || '')
    const transText = cleanNodeText(node.data.text_trans || '')

    // 如果还没有记录原文，或者文本被用户修改过导致不等于原记录，或者还没有译文
    if (!origText || (curText && curText !== origText && curText !== transText && !curText.includes('\n')) || !transText) {
      const sourceText = curText.includes('\n') ? curText.split('\n')[0].trim() : curText
      if (sourceText) {
        needTranslateList.push({
          node,
          sourceText
        })
      }
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(scan)
    }
  }

  scan(fullData.root)

  if (needTranslateList.length === 0) {
    return 0
  }

  // 打包为编号列表由大模型一次性翻译
  const itemsText = needTranslateList.map((item, idx) => `${idx + 1}. ${item.sourceText}`).join('\n')
  const prompt = `你是一名专业的双语思维导图专家。请将以下思维导图词条进行对等互译（中文译为地道英文，英文译为精准中文）。
保持编号完全一致，每行输出一个翻译结果，格式为：“编号. 译文内容”。不要输出任何额外的问候或总结。

词条清单：
${itemsText}`

  const rawResult = await callAiChat(prompt, aiConfig, onProgress)
  const lines = rawResult.split('\n')
  const transMap = {}

  lines.forEach(line => {
    const match = line.match(/^(\d+)[\.\、\:\s]+(.*)$/)
    if (match) {
      const idx = parseInt(match[1], 10) - 1
      const val = cleanNodeText(match[2])
      if (idx >= 0 && val) {
        transMap[idx] = val
      }
    }
  })

  // 1:1 回写到节点数据
  needTranslateList.forEach((item, idx) => {
    const orig = item.sourceText
    const trans = transMap[idx] || ''
    const lang = detectLanguage(orig)
    const langTrans = lang === 'zh' ? 'en' : 'zh'
    const isRich = !!item.node.data.richText

    item.node.data.text_origin = orig
    item.node.data.text_trans = trans
    item.node.data.lang_origin = lang
    item.node.data.lang_trans = langTrans
    item.node.data.text = formatBilingualNodeText(orig, trans, mode, lang, isRich)
  })

  mindMap.setFullData(fullData)
  mindMap.emit('data_change', fullData.root)
  return needTranslateList.length
}
