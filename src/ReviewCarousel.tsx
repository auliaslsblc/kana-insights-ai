import React, { useState, useEffect, useRef } from "react";

const images = [
  "/what-customers-say/customer1.png",
  "/what-customers-say/customer2.png",
  "/what-customers-say/customer3.png",
  "/what-customers-say/customer4.png"
];

export default function ReviewCarousel() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 10000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  const handleDotClick = (idx: number) => {
    setActive(idx);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setActive((prev) => (prev + 1) % images.length);
      }, 10000);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto rounded-3xl shadow-xl overflow-hidden aspect-[16/9] bg-[#141414]/10">
        <img
          src={images[active]}
          alt={`Customer Review ${active + 1}`}
          className="w-full h-full object-cover"
          style={{ aspectRatio: "16/9" }}
        />
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
