"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  "data-inverted"?: string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, onValueCommit, ...props }, ref) => {
  const isInverted = props["data-inverted"] === "true";
  const thumbRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  
  // This function will be called after the user completes a drag
  const handleValueCommit = (value: number[]) => {
    // Blur any focused elements
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Call the original onValueCommit if provided
    if (onValueCommit) {
      onValueCommit(value);
    }
  };
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      onValueCommit={handleValueCommit}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-700">
        <SliderPrimitive.Range className={cn(
          "absolute h-full",
          isInverted ? "bg-blue-500" : "bg-blue-500"
        )} />
      </SliderPrimitive.Track>
      {props.value?.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          ref={(el) => {
            if (thumbRefs.current) {
              thumbRefs.current[i] = el;
            }
          }}
          onPointerUp={() => {
            // Immediately blur this thumb when pointer is released
            if (thumbRefs.current && thumbRefs.current[i]) {
              thumbRefs.current[i]?.blur();
            }
          }}
          className={cn(
            "block h-5 w-5 rounded-full border-2 transition-all duration-150",
            isInverted 
              ? "border-blue-500 bg-slate-800 shadow-md focus-visible:ring-offset-blue-500 data-[state=dragging]:border-opacity-100 data-[state=dragging]:border-blue-400 data-[state=dragging]:scale-110" 
              : "border-blue-500 bg-white shadow focus-visible:ring-offset-slate-800 data-[state=dragging]:border-opacity-100 data-[state=dragging]:border-blue-400 data-[state=dragging]:scale-110",
            "ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
