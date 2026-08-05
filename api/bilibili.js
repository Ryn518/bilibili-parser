/**
 * Vercel Serverless Function — B 站 API 代理（参考 yt-dlp 多端点降级策略）
 *
 * GET /api/bilibili?bvid=BVxxx&type=course     → 一次返回完整课程（推荐）
 * GET /api/bilibili?bvid=BVxxx                 → view
 * GET /api/bilibili?bvid=BVxxx&type=pagelist   → web-interface 分P
 * GET /api/bilibili?bvid=BVxxx&type=player_pagelist → player 分P（yt-dlp 同款）
 * GET /api/bilibili?aid=123456                 → view（av 号）
 */

/** 构建请求头（Referer 指向具体视频页，降低风控拦截） */
function buildHeaders(bvid) {
  const referer = bvid
    ? `https://www.bilibili.com/video/${bvid}`
    : 'https://www.bilibili.com/';
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Referer': referer,
    'Origin': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
  };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/** 请求 B 站 JSON API */
async function fetchBiliJson(url, bvid) {
  const response = await fetch(url, {
    headers: buildHeaders(bvid),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(data.message || `B站 code=${data.code}`);
  }
  return data;
}

/** 从多个来源合并分 P 列表（yt-dlp 优先 player/pagelist） */
async function fetchPages(bvid) {
  const sources = [
    {
      name: 'player_pagelist',
      url: `https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}&jsonp=jsonp`
    },
    {
      name: 'web_pagelist',
      url: `https://api.bilibili.com/x/web-interface/pagelist?bvid=${encodeURIComponent(bvid)}`
    }
  ];

  let lastErr;
  for (const src of sources) {
    try {
      const json = await fetchBiliJson(src.url, bvid);
      if (Array.isArray(json.data) && json.data.length) {
        return json.data;
      }
    } catch (e) {
      lastErr = e;
      console.warn(`pagelist ${src.name} failed:`, e.message);
    }
  }
  throw lastErr || new Error('分P列表为空');
}

function normalizeCover(url) {
  if (!url) return '';
  return String(url).replace(/^http:\/\//i, 'https://');
}

/** 组装前端可直接使用的课程结构 */
function buildCourse(viewData, pages, bvid) {
  const episodes = pages.map((p, i) => ({
    index: i,
    title: p.part || p.title || `P${i + 1}`,
    duration: Number(p.duration) || 0
  }));

  return {
    bvid: viewData.bvid || bvid,
    title: viewData.title || bvid,
    cover: normalizeCover(viewData.pic || ''),
    totalSeconds: episodes.reduce((s, e) => s + e.duration, 0),
    episodes
  };
}

/** type=course：并行拉 view + pagelist，一次返回 */
async function handleCourse(bvid, res) {
  const viewUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;

  let viewData = null;
  let pages = [];

  const [viewR, pagesR] = await Promise.allSettled([
    fetchBiliJson(viewUrl, bvid),
    fetchPages(bvid)
  ]);

  if (viewR.status === 'fulfilled') {
    viewData = viewR.value.data;
    // view 接口自带 pages 时作为备选
    if (Array.isArray(viewData.pages) && viewData.pages.length) {
      pages = viewData.pages;
    }
  }

  if (pagesR.status === 'fulfilled') {
    pages = pagesR.value;
  } else if (!pages.length && viewR.status === 'fulfilled' && viewData.pages?.length) {
    pages = viewData.pages;
  }

  if (!pages.length) {
    const err = pagesR.reason || viewR.reason || new Error('未找到分P');
    return res.status(500).json({ code: -1, message: err.message || '未找到分P信息' });
  }

  if (!viewData) {
    viewData = { bvid, title: pages[0]?.part || bvid, pic: '' };
  }

  return res.status(200).json({ code: 0, data: buildCourse(viewData, pages, bvid) });
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ code: -1, message: '仅支持 GET 请求' });
  }

  const { bvid, aid, type = 'view' } = req.query;

  try {
    // 推荐：一次拿完整课程
    if (type === 'course') {
      if (!bvid) return res.status(400).json({ code: -1, message: 'course 需要 bvid 参数' });
      return await handleCourse(bvid, res);
    }

    let apiUrl;
    if (type === 'player_pagelist') {
      if (!bvid) return res.status(400).json({ code: -1, message: '需要 bvid' });
      apiUrl = `https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}&jsonp=jsonp`;
    } else if (type === 'pagelist') {
      if (!bvid) return res.status(400).json({ code: -1, message: '需要 bvid' });
      apiUrl = `https://api.bilibili.com/x/web-interface/pagelist?bvid=${encodeURIComponent(bvid)}`;
    } else if (bvid) {
      apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;
    } else if (aid) {
      apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${encodeURIComponent(aid)}`;
    } else {
      return res.status(400).json({ code: -1, message: '缺少 bvid 或 aid 参数' });
    }

    const data = await fetchBiliJson(apiUrl, bvid || null);
    return res.status(200).json(data);
  } catch (err) {
    console.error('Bilibili proxy error:', err);
    return res.status(500).json({ code: -1, message: err.message || '服务器内部错误' });
  }
};
