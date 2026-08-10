import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface CinematicBackgroundProps {
  src: string;
  position?: string;
  priority?: boolean;
  overlayClassName?: string;
}

export function CinematicBackground({
  src,
  position = "object-center",
  priority = false,
  overlayClassName,
}: CinematicBackgroundProps) {
  return (
    <div
      data-cinematic-background
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#030914]"
    >
      <Image
        data-cinematic-image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className={cn("object-cover will-change-transform", position)}
      />
      <div className={cn("absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,17,0.64)_0%,rgba(3,10,22,0.74)_48%,rgba(3,8,18,0.88)_100%)] md:bg-[linear-gradient(180deg,rgba(2,7,17,0.52)_0%,rgba(3,10,22,0.6)_44%,rgba(3,8,18,0.74)_100%)]", overlayClassName)} />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#040913] via-[#040913]/58 to-transparent md:via-[#040913]/34" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030814] via-[#030814]/64 to-transparent md:via-[#030814]/42" />
    </div>
  );
}