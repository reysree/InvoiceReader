"use client";

import React, { useState } from "react";
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
import { fabric } from "fabric";

const InvoiceExtract = () => {
  const [extractedText, setExtractedText] = useState("");
  const [image, setImage] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [open, SetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [customOptions, setCustomOptions] = useState([
    "companyName",
    "invoiceNumber",
    "invoiceDate",
    "Example 1",
  ]);
  const [invoiceDetails, setInvoiceDetails] = useState({
    companyName: "",
    invoiceNumber: "",
    invoiceDate: "",
  });
  const [selectedDetail, setSelectedDetail] = useState(customOptions[0]); // Track selected value

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
      setImage(URL.createObjectURL(file)); // Display the uploaded image

      try {
        const base64Image = await encodeImageToBase64(file);

        // Send the image to the API route
        const response = await fetch("/api/gpt-vision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64Image }),
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

          setInvoiceDetails({
            companyName: parsedDetails.companyName || "N/A",
            invoiceNumber: parsedDetails.invoiceNumber || "N/A",
            invoiceDate: parsedDetails.invoiceDate || "N/A",
          });
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
            <Button variant="contained" component="label">
              Upload Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
              />
            </Button>
            <ScreenCapture onEndCapture={handleScreenCapture}>
              {({ onStartCapture }) => (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onStartCapture}
                  disabled={!image}
                >
                  Snip Image
                </Button>
              )}
            </ScreenCapture>
          </Box>

          {image && (
            <img
              src={image}
              alt="Uploaded Preview"
              style={{ maxWidth: "100%", maxHeight: "90%" }}
            />
          )}
        </Box>
      </Box>
    </>
  );
};

export default InvoiceExtract;
