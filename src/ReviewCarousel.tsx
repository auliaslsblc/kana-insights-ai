import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const images = [
  "/what-customers-say/1.png",
  "/what-customers-say/2.png",
  "/what-customers-say/3.png",
  "/what-customers-say/4.png"
];

export default function ReviewCarousel() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoSlide = () => {
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 7000);
  };

  const resetAutoSlide = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    startAutoSlide();
  };

  useEffect(() => {
    startAutoSlide();
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  const handleDotClick = (idx: number) => {
    setActive(idx);
    resetAutoSlide();
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + images.length) % images.length);
    resetAutoSlide();
  };

  const handleNext = () => {
    setActive((prev) => (prev + 1) % images.length);
    resetAutoSlide();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-2xl mx-auto rounded-3xl shadow-xl overflow-hidden aspect-[16/9] bg-[#141414]/10 group">
        <img
          src={images[active]}
          alt={`Customer Review ${active + 1}`}
          className="w-full h-full object-cover"
          style={{ aspectRatio: "16/9" }}
        />

        <button
          onClick={handlePrev}
          aria-label="Slide sebelumnya"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-[#7A2E0E] shadow-md flex items-center justify-center hover:bg-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={handleNext}
          aria-label="Slide berikutnya"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 text-[#7A2E0E] shadow-md flex items-center justify-center hover:bg-white transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="flex gap-2 mt-8 justify-center">
        {images.map((_, idx) => (
          <button
            key={idx}
            className={`w-3 h-3 rounded-full ${active === idx ? "bg-[#B86934]" : "bg-[#E8DCCB]"}`}
            onClick={() => handleDotClick(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
