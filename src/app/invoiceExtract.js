"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import { ScreenCapture } from "react-screen-capture";
import Tesseract from "tesseract.js";
import { processImageText, findWordLocations } from "@/lib/image-processing";
import { saveInvoiceDetails } from "@/lib/firebase-processing";

const InvoiceExtract = () => {
  const [extractedText, setExtractedText] = useState("");
  const [image, setImage] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [open, SetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [customOptions, setCustomOptions] = useState([
    "companyName",
    "invoiceNumber",
    "invoiceDate",
    "Due Date",
  ]);
  const [invoiceDetails, setInvoiceDetails] = useState({
    companyName: "",
    invoiceNumber: "",
    invoiceDate: "",
  });
  const [selectedDetail, setSelectedDetail] = useState(customOptions[0]); // Track selected value
  const [words, setWords] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [canvasMode, setCanvasMode] = useState("highlight");
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.pointerEvents = canvasMode === "snip" ? "auto" : "none";
    }
  }, [canvasMode]);

  const addToInvoiceDetails = () => {
    if (!selectedDetail) {
      alert("no selected option present");
      return;
    }
    if (!extractedText) {
      alert("no text extracted");
      return;
    }

    setInvoiceDetails((prevDetails) => ({
      ...prevDetails,
      [selectedDetail]: extractedText,
    }));
    setSelectedDetail("");
    setExtractedText("");
    SetOpen(false);
  };

  // Function to convert image file to Base64
  const encodeImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]); // Extract Base64 content
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Handle Image Upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Reset related states for the new upload
      setInvoiceDetails({
        companyName: "",
        invoiceNumber: "",
        invoiceDate: "",
      });
      setWords([]);
      setHighlights([]);
      setDataLoaded(false);
      setExtractedText("");
      setProgress(0);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear all drawings
        }
      }

      const url = URL.createObjectURL(file);
      setImage(url); // Display the uploaded image
      try {
        const processedWords = await processImageText(url);
        setWords(processedWords);
      } catch (error) {
        console.error("Error processing image: ", error);
      }

      try {
        const base64Image = await encodeImageToBase64(file);

        // Send the image to the API route
        const response = await fetch("/api/gpt-vision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64Image, invoiceDetails }),
        });

        const data = await response.json();

        if (data.error) {
          console.error(data.error);
          setInvoiceDetails({
            companyName: "Error",
            invoiceNumber: "Error",
            invoiceDate: "Error",
          });
        } else {
          const parsedDetails = JSON.parse(data.data);
          console.log("The updated details are : ", parsedDetails);
          setDataLoaded(true);
          setInvoiceDetails((prevDetails) => ({
            ...prevDetails, // Keep any existing fields
            ...Object.keys(parsedDetails).reduce((acc, key) => {
              acc[key] = parsedDetails[key] || "N/A"; // Use parsed value or "N/A" if not present
              return acc;
            }, {}),
          }));
        }
      } catch (error) {
        console.error("Error processing invoice:", error);
        setInvoiceDetails({
          companyName: "Error",
          invoiceNumber: "Error",
          invoiceDate: "Error",
        });
      }
    }
  };

  const handleScreenCapture = (screenCapture) => {
    setCapturedImage(screenCapture);
    processImage(screenCapture);
  };

  const onHandleHighlight = () => {
    if (dataLoaded) {
      const locations = findWordLocations(invoiceDetails, words);
      setHighlights(locations);
      drawHighlights(locations);
    }
  };

  const drawHighlights = (locations) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !image || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get the actual displayed dimensions of the image
    const rect = image.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Set canvas size to match displayed image size
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Calculate scaling factors
    const scaleX = displayWidth / image.naturalWidth;
    const scaleY = displayHeight / image.naturalHeight;

    // Clear previous highlights
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw new highlights with scaling
    ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
    locations.forEach((location) => {
      const { bbox } = location;
      const scaledX = bbox.x0 * scaleX;
      const scaledY = bbox.y0 * scaleY;
      const scaledWidth = (bbox.x1 - bbox.x0) * scaleX;
      const scaledHeight = (bbox.y1 - bbox.y0) * scaleY;
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
    });
  };

  // Update highlights when window is resized
  useEffect(() => {
    const handleResize = () => {
      if (highlights.length > 0) {
        drawHighlights(highlights);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [highlights]);

  // Update canvas size when image loads
  useEffect(() => {
    if (image && imageRef.current) {
      const imageVal = imageRef.current;
      imageVal.onload = () => {
        if (highlights.length > 0) {
          drawHighlights(highlights);
        }
      };
    }
  }, [image, highlights]);

  const processImage = (capturedImg) => {
    //setLoading(true);
    setExtractedText("");
    Tesseract.recognize(capturedImg, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(Math.round(m.progress * 100));
        }
      },
    })
      .then(({ data: { text } }) => {
        setExtractedText(text);
        SetOpen(true);
      })
      .catch((err) => {
        console.error(err);
        alert("Error processing the image.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleClose = () => {
    SetOpen(false);
  };

  const handleSnipImage = (onStartCapture) => {
    setCanvasMode("snip"); // Set canvas to snipping mode
    onStartCapture(); // Trigger the ScreenCapture start
  };

  const handleSaveInvoice = () => {
    saveInvoiceDetails(invoiceDetails);
  };

  return (
    <>
      {/* Dialog for Extracted Text */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Extracted Text</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={extractedText}
            variant="outlined"
            placeholder="Extracted text will appear here..."
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <Box mt={2}>
          {" "}
          {/* Add margin for spacing */}
          <Typography variant="subtitle1" gutterBottom>
            Select Invoice Detail
          </Typography>
          <Select
            fullWidth
            value={selectedDetail} // Current selected value
            onChange={(event) => setSelectedDetail(event.target.value)} // Update state
            variant="outlined"
          >
            {customOptions.map((option) => (
              <MenuItem key={option} value={option}>{`${
                option.charAt(0) + option.slice(1)
              }`}</MenuItem>
            ))}
          </Select>
        </Box>
        <DialogActions>
          <Button
            onClick={addToInvoiceDetails}
            variant="contained"
            color="success"
          >
            Add
          </Button>
          <Button onClick={handleClose} variant="contained" color="error">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Layout */}
      <Box display="flex" justifyContent="space-between" p={4} height="100vh">
        {/* Left Box: Display Extracted Invoice Details */}
        <Box
          flex={1}
          p={2}
          border="1px solid gray"
          display="flex"
          flexDirection="column"
          justifyContent="flex-start"
          bgcolor="#f9f9f9"
          mr={2}
        >
          <Typography variant="h6" gutterBottom>
            Extracted Invoice Details
          </Typography>
          {Object.entries(invoiceDetails).map(([key, value]) => (
            <Typography key={key}>
              <b>{key.charAt(0).toUpperCase() + key.slice(1)}:</b> {value || ""}
            </Typography>
          ))}
          <Button
            variant="contained"
            onClick={handleSaveInvoice}
            disabled={!dataLoaded}
          >
            Add to Database
          </Button>
        </Box>

        {/* Right Box: Image Upload */}
        <Box
          flex={1}
          p={2}
          border="1px solid gray"
          display="flex"
          flexDirection="column"
          alignItems="center"
          bgcolor="#f9f9f9"
        >
          <Box display={"flex"} gap={2} alignItems={"center"}>
            <ScreenCapture onEndCapture={handleScreenCapture}>
              {({ onStartCapture }) => (
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Box
                    display="flex"
                    flexDirection="row"
                    alignItems="center"
                    sx={{ gap: "16px" }}
                  >
                    <Button variant="contained" component="label">
                      Upload Image
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </Button>
                    <Button
                      variant="contained"
                      component="label"
                      onClick={onHandleHighlight}
                      disabled={!dataLoaded}
                    >
                      Highlight Text
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSnipImage(onStartCapture)}
                      disabled={!image}
                    >
                      Snip Image
                    </Button>
                  </Box>
                  {image && (
                    <Box
                      ref={containerRef}
                      position="relative"
                      width="100%"
                      height="auto"
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      mt={2}
                    >
                      {/* Image Element */}
                      <img
                        ref={imageRef}
                        src={image}
                        alt="Uploaded Invoice"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          display: "block",
                        }}
                      />

                      {/* Canvas for Highlighting */}
                      <canvas
                        ref={canvasRef}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          pointerEvents: "none",
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </ScreenCapture>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default InvoiceExtract;
