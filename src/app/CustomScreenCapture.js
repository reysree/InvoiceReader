import React, { useState, useRef } from "react";
import html2canvas from "html2canvas";

const CustomScreenCapture = ({ onEndCapture, children }) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [borderWidth, setBorderWidth] = useState("0px");
  const [cropRegion, setCropRegion] = useState({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsMouseDown(true);
    setCropRegion({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown) return;

    setCropRegion((prevRegion) => ({
      ...prevRegion,
      endX: e.clientX,
      endY: e.clientY,
    }));

    // Calculate dynamic border width
    const { startX, startY } = cropRegion;
    const endX = e.clientX;
    const endY = e.clientY;
    setBorderWidth(
      `${Math.min(startY, endY)}px ${
        window.innerWidth - Math.max(startX, endX)
      }px ${window.innerHeight - Math.max(startY, endY)}px ${Math.min(
        startX,
        endX
      )}px`
    );
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    takeScreenshot();
  };

  const takeScreenshot = () => {
    if (!containerRef.current) return;

    const { startX, startY, endX, endY } = cropRegion;
    const cropWidth = Math.abs(endX - startX);
    const cropHeight = Math.abs(endY - startY);

    html2canvas(containerRef.current).then((canvas) => {
      const croppedCanvas = document.createElement("canvas");
      const ctx = croppedCanvas.getContext("2d");

      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;

      ctx.drawImage(
        canvas,
        Math.min(startX, endX),
        Math.min(startY, endY),
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      const croppedImageURL = croppedCanvas.toDataURL("image/png");
      onEndCapture(croppedImageURL);
    });

    // Reset the overlay
    setBorderWidth("0px");
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {children}
      <div
        className="overlay"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          borderWidth,
          borderStyle: "solid",
          borderColor: "rgba(0, 0, 255, 0.3)", // Blue highlight
        }}
      ></div>
    </div>
  );
};

export default CustomScreenCapture;
