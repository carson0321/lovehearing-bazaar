import { useState, useRef } from 'react';

export default function ImageCarousel({ images, alt, className }) {
  const [current, setCurrent] = useState(0);
  const [errored, setErrored] = useState({});
  const touchStartX = useRef(null);

  if (!images || images.length === 0) return null;

  const validImages = images.filter((_, i) => !errored[i]);
  const displayIdx = Math.min(current, validImages.length - 1);

  function prev(e) {
    e?.stopPropagation();
    setCurrent((c) => Math.max(0, c - 1));
  }

  function next(e) {
    e?.stopPropagation();
    setCurrent((c) => Math.min(validImages.length - 1, c + 1));
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -40) next();
    else if (delta > 40) prev();
    touchStartX.current = null;
  }

  if (validImages.length === 0) return null;

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={validImages[displayIdx]}
        alt={alt}
        className={className}
        onError={() => setErrored((prev) => ({ ...prev, [displayIdx]: true }))}
        draggable={false}
      />

      {/* Left arrow */}
      {displayIdx > 0 && (
        <button
          type="button"
          onClick={prev}
          className="carousel-arrow carousel-arrow-left"
          aria-label="上一張"
        >
          ‹
        </button>
      )}

      {/* Right arrow */}
      {displayIdx < validImages.length - 1 && (
        <button
          type="button"
          onClick={next}
          className="carousel-arrow carousel-arrow-right"
          aria-label="下一張"
        >
          ›
        </button>
      )}

      {/* Dot indicators */}
      {validImages.length > 1 && (
        <div className="carousel-dots">
          {validImages.map((_, i) => (
            <span
              key={i}
              className={`carousel-dot ${i === displayIdx ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
