"use client"

import { memo, useEffect, useLayoutEffect, useState } from "react"
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
} from "framer-motion"

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

type UseMediaQueryOptions = {
  defaultValue?: boolean
  initializeWithValue?: boolean
}

const IS_SERVER = typeof window === "undefined"

export function useMediaQuery(
  query: string,
  {
    defaultValue = false,
    initializeWithValue = true,
  }: UseMediaQueryOptions = {}
): boolean {
  const getMatches = (query: string): boolean => {
    if (IS_SERVER) {
      return defaultValue
    }
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState<boolean>(() => {
    if (initializeWithValue) {
      return getMatches(query)
    }
    return defaultValue
  })

  const handleChange = () => {
    setMatches(getMatches(query))
  }

  useIsomorphicLayoutEffect(() => {
    const matchMedia = window.matchMedia(query)
    handleChange()

    matchMedia.addEventListener("change", handleChange)

    return () => {
      matchMedia.removeEventListener("change", handleChange)
    }
  }, [query])

  return matches
}

const duration = 0.15
const transition = { duration, ease: [0.32, 0.72, 0, 1] as [number, number, number, number], filter: "blur(4px)" }
const transitionOverlay = { duration: 0.5, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] }

export interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  src: string;
}

const CarouselCard = memo(({
  item,
  i,
  faceCount,
  radiusX,
  radiusZ,
  rotation,
  handleClick,
  isScreenSizeSm
}: any) => {
  const transform = useTransform(rotation, (rot: number) => {
    const angle = rot + i * (360 / faceCount);
    const angleRad = angle * (Math.PI / 180);
    const x = radiusX * Math.sin(angleRad);
    const z = radiusZ * Math.cos(angleRad) - radiusZ;
    return `translate3d(${x}px, 0, ${z}px) rotateY(${angle}deg)`;
  });

  return (
    <motion.div
      className="absolute flex origin-center items-center justify-center rounded-2xl bg-card border border-border p-6 md:p-8 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
      style={{
        width: isScreenSizeSm ? "280px" : "380px",
        height: isScreenSizeSm ? "340px" : "380px",
        transform,
      }}
      onClick={() => handleClick(item, i)}
    >
      <div className="flex flex-col items-center text-center gap-4 h-full overflow-hidden">
        <motion.img
          src={item.src}
          alt={`${item.name}`}
          layoutId={`img-${item.src}`}
          className="pointer-events-none w-24 h-24 md:w-28 md:h-28 rounded-full object-cover object-top shadow-md shrink-0"
          initial={{ filter: "blur(4px)" }}
          layout="position"
          animate={{ filter: "blur(0px)" }}
          transition={transition}
        />
        <div className="flex-1 flex flex-col justify-between">
          <p className="text-sm md:text-base text-foreground italic line-clamp-3 md:line-clamp-4 mb-4">"{item.quote}"</p>
          <div>
            <h4 className="text-lg font-bold text-primary">{item.name}</h4>
            <p className="text-xs md:text-sm text-muted-foreground">{item.designation}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const Carousel = memo(
  ({
    handleClick,
    cards,
    isCarouselActive,
  }: {
    handleClick: (item: Testimonial, index: number) => void
    cards: Testimonial[]
    isCarouselActive: boolean
  }) => {
    const isScreenSizeSm = useMediaQuery("(max-width: 640px)")
    const radiusX = isScreenSizeSm ? 180 : 550
    const radiusZ = isScreenSizeSm ? 80 : 200
    const faceCount = cards.length
    const rotation = useMotionValue(0)

    useEffect(() => {
      let animationFrameId: number;
      const animate = () => {
        if (isCarouselActive) {
          rotation.set(rotation.get() - 0.2); // Auto-rotation speed
        }
        animationFrameId = requestAnimationFrame(animate);
      };
      
      animate();
      return () => cancelAnimationFrame(animationFrameId);
    }, [isCarouselActive, rotation]);

    return (
      <div
        className="flex h-full items-center justify-center bg-transparent"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          drag={isCarouselActive ? "x" : false}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0}
          className="relative flex h-full w-full origin-center cursor-grab justify-center active:cursor-grabbing"
          style={{
            transformStyle: "preserve-3d",
          }}
          onDrag={(_, info) =>
            isCarouselActive &&
            rotation.set(rotation.get() + info.delta.x * 0.2)
          }
        >
          {cards.map((item, i) => (
            <CarouselCard
              key={`key-${item.src}-${i}`}
              item={item}
              i={i}
              faceCount={faceCount}
              radiusX={radiusX}
              radiusZ={radiusZ}
              rotation={rotation}
              handleClick={handleClick}
              isScreenSizeSm={isScreenSizeSm}
            />
          ))}
        </motion.div>
      </div>
    )
  }
)

export function ThreeDPhotoCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [activeItem, setActiveItem] = useState<Testimonial | null>(null)
  const [isCarouselActive, setIsCarouselActive] = useState(true)

  const handleClick = (item: Testimonial) => {
    setActiveItem(item)
    setIsCarouselActive(false)
  }

  const handleClose = () => {
    setActiveItem(null)
    setIsCarouselActive(true)
  }

  return (
    <motion.div layout className="relative w-full">
      <AnimatePresence mode="sync">
        {activeItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            layoutId={`img-container-${activeItem.src}`}
            layout="position"
            onClick={handleClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 m-4 md:m-24 lg:mx-[19rem] rounded-3xl"
            style={{ willChange: "opacity" }}
            transition={transitionOverlay}
          >
            <div className="flex flex-col md:flex-row items-center gap-8 bg-card border border-border p-8 rounded-3xl shadow-2xl max-w-4xl mx-auto">
              <motion.img
                layoutId={`img-${activeItem.src}`}
                src={activeItem.src}
                className="w-48 h-48 md:w-64 md:h-64 object-cover object-top rounded-2xl shadow-lg shrink-0"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.1,
                  duration: 0.4,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                style={{
                  willChange: "transform",
                }}
              />
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col justify-center text-center md:text-left"
              >
                <p className="text-lg md:text-xl text-foreground font-medium italic mb-6">"{activeItem.quote}"</p>
                <div>
                  <h4 className="text-xl font-bold text-primary">{activeItem.name}</h4>
                  <p className="text-muted-foreground">{activeItem.designation}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative h-[300px] md:h-[500px] w-full overflow-hidden">
        <Carousel
          handleClick={handleClick}
          cards={testimonials}
          isCarouselActive={isCarouselActive}
        />
      </div>
    </motion.div>
  )
}
