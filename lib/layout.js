export const GRID_COLUMNS = 6;
export const PAGE_HEIGHT = 1760;
export const PAGE_WIDTH = 1080;
export const COLUMN_GAP = 18;
export const PAGE_PADDING = 34;
export const MIN_RECT_HEIGHT = 180;

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitImages(markdown) {
  const images = [];
  const text = String(markdown || "").replace(IMAGE_PATTERN, (_match, alt, src, title) => {
    images.push({
      alt: alt || title || "Article image",
      src,
      title: title || ""
    });

    return "";
  });

  return {
    images,
    text: text.replace(/\n{3,}/g, "\n\n").trim()
  };
}

function plainText(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#>*_[\]()`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceSlices(markdown) {
  return (
    String(markdown || "")
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/g)
      .map((slice) => slice.trim())
      .filter(Boolean)
  );
}

function columnPixelWidth(colSpan) {
  const usableWidth = PAGE_WIDTH - PAGE_PADDING * 2 - COLUMN_GAP * (GRID_COLUMNS - 1);
  return (usableWidth / GRID_COLUMNS) * colSpan + COLUMN_GAP * (colSpan - 1);
}

export function bodyColumnCount(article, colSpan) {
  const length = Number(article.articleLength) || 0;
  const desired = length > 1250 ? 3 : length > 620 ? 2 : 1;
  return clamp(desired, 1, Math.max(1, colSpan));
}

function assignedWidth(article, index) {
  const hasImage = article.images.length > 0;
  let width;

  if (index === 0) {
    width = article.articleLength > 1200 || hasImage ? 6 : 4;
  } else if (index < 3) {
    width = article.articleLength > 900 || hasImage ? 3 : 2;
  } else {
    width = article.articleLength > 760 || hasImage ? 2 : 1;
  }

  return hasImage ? Math.max(2, width) : width;
}

function titleHeight(article, colSpan, index, continued) {
  const width = columnPixelWidth(colSpan);
  const fontSize = index === 0 && !continued ? 76 : index < 3 && !continued ? 42 : 30;
  const charsPerLine = Math.max(7, Math.floor(width / (fontSize * 0.5)));
  const lines = Math.ceil(String(article.title || "").length / charsPerLine);
  return lines * fontSize * 0.98 + 18;
}

function imageHeight(colSpan, image) {
  if (!image) {
    return 0;
  }

  const width = columnPixelWidth(colSpan);
  return clamp(width * 0.58, 170, 360);
}

function textHeight(markdown, colSpan, columnCount) {
  const text = plainText(markdown);
  if (!text) {
    return 0;
  }

  const width = columnPixelWidth(colSpan);
  const effectiveColumnWidth = (width - COLUMN_GAP * (columnCount - 1)) / columnCount;
  const charsPerLine = Math.max(18, Math.floor(effectiveColumnWidth / 7.3));
  const lines = Math.ceil(text.length / charsPerLine / columnCount);
  const paragraphCount = Math.max(1, String(markdown).split(/\n{2,}/).filter(Boolean).length);
  return lines * 22 + paragraphCount * 10;
}

function estimatedHeight(item, colSpan) {
  if (item.kind === "image") {
    return imageHeight(colSpan, item.image);
  }

  const columns = bodyColumnCount(item.article, colSpan);
  const heading = item.showTitle ? titleHeight(item.article, colSpan, item.index, item.continued) : 0;
  return heading + textHeight(item.content, colSpan, columns) + 44;
}

function bestRect(rects, width, height) {
  return rects
    .filter((rect) => rect.w >= width && rect.h >= Math.min(height, rect.h))
    .sort((a, b) => {
      const wasteA = (a.w - width) * 180 + Math.max(0, a.h - height);
      const wasteB = (b.w - width) * 180 + Math.max(0, b.h - height);
      return wasteA - wasteB || a.y - b.y || a.x - b.x;
    })[0];
}

function removeRect(rects, target) {
  return rects.filter((rect) => rect !== target);
}

function pruneRects(rects) {
  return rects
    .filter((rect) => rect.w > 0 && rect.h >= MIN_RECT_HEIGHT)
    .filter((rect, index, all) => {
      return !all.some((other, otherIndex) => {
        if (index === otherIndex) {
          return false;
        }

        return (
          rect.x >= other.x &&
          rect.y >= other.y &&
          rect.x + rect.w <= other.x + other.w &&
          rect.y + rect.h <= other.y + other.h
        );
      });
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function splitRect(rect, width, height) {
  return [
    {
      x: rect.x + width,
      y: rect.y,
      w: rect.w - width,
      h: height
    },
    {
      x: rect.x,
      y: rect.y + height,
      w: rect.w,
      h: rect.h - height
    }
  ];
}

function splitContentForHeight(item, colSpan, availableHeight) {
  if (item.kind === "image") {
    return {
      fit: item,
      overflow: null,
      height: Math.min(estimatedHeight(item, colSpan), availableHeight)
    };
  }

  const heading = item.showTitle ? titleHeight(item.article, colSpan, item.index, item.continued) : 0;
  const usableHeight = Math.max(80, availableHeight - heading - 44);
  const columns = bodyColumnCount(item.article, colSpan);
  const sentences = sentenceSlices(item.content);

  if (estimatedHeight(item, colSpan) <= availableHeight || sentences.length <= 1) {
    return {
      fit: item,
      overflow: null,
      height: Math.min(estimatedHeight(item, colSpan), availableHeight)
    };
  }

  let fit = "";
  let remaining = item.content;

  for (let index = 0; index < sentences.length; index += 1) {
    const candidate = sentences.slice(0, index + 1).join(" ");
    if (textHeight(candidate, colSpan, columns) > usableHeight) {
      break;
    }

    fit = candidate;
    remaining = sentences.slice(index + 1).join(" ");
  }

  if (!fit) {
    fit = sentences[0];
    remaining = sentences.slice(1).join(" ");
  }

  return {
    fit: {
      ...item,
      content: `${fit}\n\n_Continued on next page..._`
    },
    overflow: remaining
      ? {
          ...item,
          content: remaining,
          showTitle: true,
          continued: true
        }
      : null,
    height: Math.min(availableHeight, heading + textHeight(fit, colSpan, columns) + 64)
  };
}

function prepareQueue(articles) {
  const queue = [];

  articles.forEach((article, index) => {
    const parsed = splitImages(article.content);
    const normalized = {
      ...article,
      content: parsed.text,
      images: parsed.images,
      width: assignedWidth({ ...article, images: parsed.images }, index),
      index
    };

    queue.push({
      kind: "article",
      article: normalized,
      id: `${article.slug}-text`,
      content: normalized.content,
      index,
      showTitle: true,
      continued: false
    });

    normalized.images.forEach((image, imageIndex) => {
      queue.splice(Math.min(queue.length, index === 0 ? 1 : queue.length), 0, {
        kind: "image",
        article: normalized,
        id: `${article.slug}-image-${imageIndex}`,
        image,
        index,
        showTitle: false,
        continued: false
      });
    });
  });

  return queue;
}

function placeItem(rects, item) {
  const preferredWidth = item.kind === "image" ? Math.max(2, item.article.width) : item.article.width;
  const width = Math.min(GRID_COLUMNS, preferredWidth);
  const estimated = estimatedHeight(item, width);
  const rect = bestRect(rects, width, Math.min(estimated, PAGE_HEIGHT));

  if (!rect) {
    return null;
  }

  const availableHeight = rect.h;
  const split = splitContentForHeight(item, width, availableHeight);
  const height = Math.max(120, Math.ceil(split.height));
  const placed = {
    ...split.fit,
    x: rect.x,
    y: rect.y,
    w: width,
    h: height,
    bodyColumns: item.kind === "article" ? bodyColumnCount(item.article, width) : 1
  };

  const nextRects = pruneRects([...removeRect(rects, rect), ...splitRect(rect, width, height)]);

  return {
    placed,
    overflow: split.overflow,
    rects: nextRects
  };
}

export function createNewspaperPages(articles) {
  const pending = prepareQueue(articles);
  const pages = [];

  while (pending.length > 0 && pages.length < 40) {
    let rects = [{ x: 0, y: 0, w: GRID_COLUMNS, h: PAGE_HEIGHT }];
    const blocks = [];
    let cursor = 0;

    while (cursor < pending.length) {
      const item = pending[cursor];
      const result = placeItem(rects, item);

      if (!result) {
        cursor += 1;
        continue;
      }

      blocks.push(result.placed);
      rects = result.rects;
      pending.splice(cursor, 1);

      if (result.overflow) {
        pending.push(result.overflow);
      }

      cursor = 0;
    }

    if (blocks.length === 0) {
      const fallback = pending.shift();
      const height = Math.min(PAGE_HEIGHT, Math.max(220, estimatedHeight(fallback, fallback.article.width)));
      blocks.push({
        ...fallback,
        x: 0,
        y: 0,
        w: fallback.article.width,
        h: height,
        bodyColumns: fallback.kind === "article" ? bodyColumnCount(fallback.article, fallback.article.width) : 1
      });
    }

    pages.push({ blocks });
  }

  return pages;
}

