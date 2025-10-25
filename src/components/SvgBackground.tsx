/** @jsxImportSource @b9g/crank */

import type { Component } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

interface SvgBackgroundProps {
  svg: Component;
  children?: any;
  className?: string;
}

export function SvgBackground({ svg: SvgComponent, children, className = "" }: SvgBackgroundProps) {
  // Render the SVG component to a temporary div to get the HTML string
  const tempDiv = document.createElement("div");
  renderer.render(<SvgComponent />, tempDiv);
  const svgString = tempDiv.innerHTML;

  // Encode the SVG as a data URI
  const encodedSvg = encodeURIComponent(svgString)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");

  const backgroundStyle = `url("data:image/svg+xml,${encodedSvg}")`;

  return (
    <div
      class={className}
      style={{
        backgroundImage: backgroundStyle,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </div>
  );
}
