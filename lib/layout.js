export const GRID_COLUMNS = 6;
export const PAGE_HEIGHT = 1760;
export const PAGE_WIDTH = 1080;
export const COLUMN_GAP = 18;
export const PAGE_PADDING = 34;
export const BLOCK_PADDING = 22;
export const BODY_COLUMN_GAP = 26;
export const FOLIO_HEIGHT = 58;
export const MIN_RECT_HEIGHT = 220;
export const MIN_STORY_HEIGHT = 280;

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
  const sentences = String(markdown || "")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/g)
    .map((slice) => slice.trim())
    .filter(Boolean);

  if (sentences.length > 1) {
    return sentences;
  }

  const words = String(markdown || "")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const slices = [];

  for (let index = 0; index < words.length; index += 34) {
    slices.push(words.slice(index, index + 34).join(" "));
  }

  return slices;
}

function columnPixelWidth(colSpan) {
  const usableWidth = PAGE_WIDTH - PAGE_PADDING * 2 - COLUMN_GAP * (GRID_COLUMNS - 1);
  return (usableWidth / GRID_COLUMNS) * colSpan + COLUMN_GAP * (colSpan - 1);
}

function contentPixelWidth(colSpan) {
  return Math.max(90, columnPixelWidth(colSpan) - BLOCK_PADDING * 2);
}

export function bodyColumnCount(article, colSpan) {
  const length = Number(article.articleLength) || 0;

  if (colSpan <= 2) {
    return 1;
  }

  if (colSpan === 3) {
    return length > 1150 ? 2 : 1;
  }

  const desired = length > 1550 ? 3 : length > 780 ? 2 : 1;
  return clamp(desired, 1, Math.min(3, colSpan));
}

function assignedWidth(article, index) {
  const hasImage = article.images.length > 0;
  const length = Number(article.articleLength) || 0;
  let width;

  if (index === 0) {
    width = length > 1400 || hasImage ? 6 : 4;
  } else if (index < 3) {
    width = length > 920 || hasImage ? 3 : 2;
  } else {
    const sequence = [2, 3, 2, 4, 2, 3, 2, 2, 3, 2];
    width = sequence[(index - 3) % sequence.length];

    if (length > 1400) {
      width = Math.max(width, 4);
    } else if (length > 780) {
      width = Math.max(width, 3);
    }
  }

  return hasImage ? Math.max(2, width) : width;
}

function titleFontSize(colSpan, index, continued) {
  if (continued) {
    return colSpan >= 4 ? 34 : colSpan >= 3 ? 30 : 26;
  }

  if (index === 0) {
    return colSpan >= 6 ? 82 : colSpan >= 4 ? 72 : 48;
  }

  if (index < 3) {
    return colSpan >= 3 ? 44 : 34;
  }

  return colSpan >= 4 ? 38 : colSpan >= 3 ? 34 : 28;
}

function titleHeight(article, colSpan, index, continued) {
  const width = contentPixelWidth(colSpan);
  const fontSize = titleFontSize(colSpan, index, continued);
  const charsPerLine = Math.max(6, Math.floor(width / (fontSize * 0.54)));
  const lines = Math.ceil(String(article.title || "").length / charsPerLine);
  return lines * fontSize * 1.04 + 18;
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

  const width = contentPixelWidth(colSpan);
  const effectiveColumnWidth = (width - BODY_COLUMN_GAP * (columnCount - 1)) / columnCount;
  const charsPerLine = Math.max(15, Math.floor(effectiveColumnWidth / 8.5));
  const baseLines = Math.ceil(text.length / charsPerLine);
  const paragraphCount = Math.max(1, String(markdown).split(/\n{2,}/).filter(Boolean).length);
  const headingCount = (String(markdown).match(/^#{1,6}\s+/gm) || []).length;
  const listCount = (String(markdown).match(/^\s*[-*+] |\d+\.\s+/gm) || []).length;
  const tableRows = (String(markdown).match(/^\|.+\|$/gm) || []).length;
  const structuralLines = headingCount * 2.2 + listCount * 0.8 + tableRows * 1.3;
  const linesPerColumn = Math.ceil((baseLines + structuralLines) / columnCount);

  return linesPerColumn * 28 + paragraphCount * 16 + headingCount * 18 + tableRows * 8 + 18;
}

function estimatedHeight(item, colSpan) {
  if (item.kind === "image") {
    return imageHeight(colSpan, item.image);
  }

  const columns = bodyColumnCount(item.article, colSpan);
  const heading = item.showTitle ? titleHeight(item.article, colSpan, item.index, item.continued) : 0;
  return heading + textHeight(item.content, colSpan, columns) + BLOCK_PADDING * 2 + 26;
}

function bestRect(rects, width, height, item) {
  const idealHeight = Math.max(height, MIN_STORY_HEIGHT);
  const minimumHeight = item.kind === "image" ? 150 : MIN_STORY_HEIGHT;

  return rects
    .filter((rect) => rect.w >= width && rect.h >= minimumHeight)
    .sort((a, b) => {
      const wasteA = Math.abs(a.w - width) * 150 + Math.abs(a.h - idealHeight) * 0.55;
      const wasteB = Math.abs(b.w - width) * 150 + Math.abs(b.h - idealHeight) * 0.55;
      const driftA = ((item.index + a.x * 2 + Math.floor(a.y / 90)) % 3) * 18;
      const driftB = ((item.index + b.x * 2 + Math.floor(b.y / 90)) % 3) * 18;
      return wasteA + driftA - (wasteB + driftB) || a.y - b.y || a.x - b.x;
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

function splitRect(rect, width, height, item) {
  const verticalFirst =
    rect.w - width >= 2 &&
    rect.h - height >= MIN_RECT_HEIGHT &&
    (item.index + rect.x + Math.floor(rect.y / 120)) % 2 === 0;

  if (verticalFirst) {
    return [
      {
        x: rect.x + width,
        y: rect.y,
        w: rect.w - width,
        h: rect.h
      },
      {
        x: rect.x,
        y: rect.y + height,
        w: width,
        h: rect.h - height
      }
    ];
  }

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
  const usableHeight = Math.max(120, availableHeight - heading - BLOCK_PADDING * 2 - 36);
  const columns = bodyColumnCount(item.article, colSpan);
  const sentences = sentenceSlices(item.content);

  if (estimatedHeight(item, colSpan) <= availableHeight) {
    return {
      fit: item,
      overflow: null,
      height: estimatedHeight(item, colSpan)
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
    height: Math.min(
      availableHeight,
      heading + textHeight(`${fit}\n\n_Continued on next page..._`, colSpan, columns) + BLOCK_PADDING * 2 + 36
    )
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
  const rect = bestRect(rects, width, Math.min(estimated, PAGE_HEIGHT), item);

  if (!rect) {
    return null;
  }

  const availableHeight = rect.h;
  const split = splitContentForHeight(item, width, availableHeight);
  const height = Math.max(item.kind === "image" ? 150 : MIN_STORY_HEIGHT, Math.ceil(split.height));
  const placed = {
    ...split.fit,
    x: rect.x,
    y: rect.y,
    w: width,
    h: height,
    bodyColumns: item.kind === "article" ? bodyColumnCount(item.article, width) : 1,
    titleSize:
      item.kind === "article" && item.showTitle
        ? titleFontSize(width, item.index, item.continued)
        : undefined
  };

  const nextRects = pruneRects([...removeRect(rects, rect), ...splitRect(rect, width, height, item)]);

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
    let rects = [{ x: 0, y: 0, w: GRID_COLUMNS, h: PAGE_HEIGHT - FOLIO_HEIGHT }];
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
