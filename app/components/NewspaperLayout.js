"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  bodyColumnCount,
  createMeasuredPages,
  createNewspaperPages,
  GRID_COLUMNS,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  prepareLayoutItems,
  titleFontSize,
  widthCandidates
} from "@/lib/layout";

function blockStyle(block) {
  return {
    "--block-left": `${(block.x / GRID_COLUMNS) * 100}%`,
    "--block-top": `${block.y}px`,
    "--block-width": `${(block.w / GRID_COLUMNS) * 100}%`,
    "--block-height": `${block.h}px`,
    "--body-columns": block.bodyColumns || 1,
    "--title-size": block.titleSize ? `${block.titleSize}px` : undefined
  };
}

function measurementStyle(width, pageWidth, block) {
  return {
    "--measure-width": `${(pageWidth / GRID_COLUMNS) * width}px`,
    "--body-columns": block.bodyColumns || 1,
    "--title-size": block.titleSize ? `${block.titleSize}px` : undefined
  };
}

function ArticleBlock({ block, setMeasurementNode, measureWidth, pageWidth, isMeasurement = false }) {
  const title = block.continued ? `${block.article.title}, continued` : block.article.title;
  const style = isMeasurement ? measurementStyle(measureWidth, pageWidth, block) : blockStyle(block);

  return (
    <article
      ref={setMeasurementNode}
      className={`layout-block layout-article layout-priority-${Math.min(block.index, 4)}${
        isMeasurement ? " measurement-block" : ""
      }`}
      style={style}
    >
      {block.showTitle && <h2>{title}</h2>}
      <div className="layout-article-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
      </div>
    </article>
  );
}

function ImageBlock({ block, setMeasurementNode, measureWidth, pageWidth, isMeasurement = false }) {
  const style = isMeasurement ? measurementStyle(measureWidth, pageWidth, block) : blockStyle(block);

  return (
    <figure
      ref={setMeasurementNode}
      className={`layout-block layout-image${isMeasurement ? " measurement-block" : ""}`}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.image.src} alt={block.image.alt} />
      {block.image.title && <figcaption>{block.image.title}</figcaption>}
    </figure>
  );
}

function NewspaperPage({ page, pageNumber, totalPages }) {
  return (
    <section
      className="computed-newspaper-page"
      style={{ "--page-height": `${page.height || PAGE_HEIGHT}px` }}
      aria-label={`Newspaper page ${pageNumber}`}
    >
      {page.blocks.map((block) =>
        block.kind === "image" ? (
          <ImageBlock key={`${block.id}-${block.x}-${block.y}-${block.w}`} block={block} />
        ) : (
          <ArticleBlock key={`${block.id}-${block.x}-${block.y}-${block.w}`} block={block} />
        )
      )}

      <div className="computed-page-folio">
        Page {pageNumber} of {totalPages}
      </div>
    </section>
  );
}

function MeasurementStage({ items, pageWidth, measurementRefs }) {
  return (
    <div className="measurement-stage" aria-hidden="true">
      {items.flatMap((item) =>
        widthCandidates(item).map((width) => {
          const key = `${item.id}-${width}`;
          const block = {
            ...item,
            w: width,
            bodyColumns: item.kind === "article" ? bodyColumnCount(item.article, width) : 1,
            titleSize:
              item.kind === "article" && item.showTitle
                ? titleFontSize(width, item.index, item.continued)
                : undefined
          };

          const ref = (node) => {
            if (node) {
              measurementRefs.current.set(key, node);
            } else {
              measurementRefs.current.delete(key);
            }
          };

          return item.kind === "image" ? (
            <ImageBlock
              key={key}
              block={block}
              setMeasurementNode={ref}
              measureWidth={width}
              pageWidth={pageWidth}
              isMeasurement
            />
          ) : (
            <ArticleBlock
              key={key}
              block={block}
              setMeasurementNode={ref}
              measureWidth={width}
              pageWidth={pageWidth}
              isMeasurement
            />
          );
        })
      )}
    </div>
  );
}

function MobileArticleStream({ articles }) {
  return (
    <section className="mobile-article-stream" aria-label="All articles">
      {articles.map((article) => (
        <article key={article.slug} className="mobile-article">
          <p className="kicker">{article.category}</p>
          <h2>{article.title}</h2>
          <div className="mobile-article-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </div>
        </article>
      ))}
    </section>
  );
}

function sameMeasurements(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

export default function NewspaperLayout({ articles, requestedPage }) {
  const containerRef = useRef(null);
  const measurementRefs = useRef(new Map());
  const items = useMemo(() => prepareLayoutItems(articles), [articles]);
  const estimatedPages = useMemo(() => createNewspaperPages(articles), [articles]);
  const [pageWidth, setPageWidth] = useState(PAGE_WIDTH);
  const [measurements, setMeasurements] = useState(null);

  useEffect(() => {
    let animationFrame = 0;

    function measure() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const nextWidth = containerRef.current?.clientWidth || 1080;
        setPageWidth(nextWidth);

        const nextMeasurements = {};
        measurementRefs.current.forEach((node, key) => {
          nextMeasurements[key] = Math.ceil(node.scrollHeight);
        });

        setMeasurements((current) =>
          current && sameMeasurements(current, nextMeasurements) ? current : nextMeasurements
        );
      });
    }

    measure();
    document.fonts?.ready?.then(measure);

    const observer = new ResizeObserver(measure);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  const measuredPages = useMemo(
    () => (measurements ? createMeasuredPages(items, measurements) : null),
    [items, measurements]
  );
  const pages = measuredPages || estimatedPages;
  const totalPages = Math.max(1, pages.length);
  const currentPage = Math.min(requestedPage, totalPages);
  const page = pages[currentPage - 1] || pages[0];

  return (
    <>
      <div ref={containerRef} className="desktop-newspaper-layout">
        {page && <NewspaperPage page={page} pageNumber={currentPage} totalPages={totalPages} />}
        <MeasurementStage items={items} pageWidth={pageWidth} measurementRefs={measurementRefs} />
      </div>

      <MobileArticleStream articles={articles} />

      {totalPages > 1 && (
        <nav className="edition-pagination desktop-edition-pagination" aria-label="Newspaper pages">
          <Link
            className={currentPage === 1 ? "pagination-link disabled" : "pagination-link"}
            href={currentPage === 1 ? "/" : `/?page=${currentPage - 1}`}
            aria-disabled={currentPage === 1}
          >
            Previous page
          </Link>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Link
            className={currentPage === totalPages ? "pagination-link disabled" : "pagination-link"}
            href={currentPage === totalPages ? `/?page=${currentPage}` : `/?page=${currentPage + 1}`}
            aria-disabled={currentPage === totalPages}
          >
            Next page
          </Link>
        </nav>
      )}
    </>
  );
}
