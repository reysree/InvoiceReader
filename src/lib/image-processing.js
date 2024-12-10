import { createWorker } from "tesseract.js";

export async function processImageText(imageUrl) {
  const worker = await createWorker("eng");
  const {
    data: { words },
  } = await worker.recognize(imageUrl);
  await worker.terminate();
  return words;
}

export function findWordLocations(invoiceDetails, words) {
  const searchResults = [];

  // Loop through all keys in the invoiceDetails object
  for (const key in invoiceDetails) {
    if (invoiceDetails[key]) {
      // Ensure the value is not empty
      const searchText = invoiceDetails[key].toString(); // Convert the value to string
      const searchWords = searchText.split(" ");

      if (searchWords.length === 1) {
        // If it's a single word, use simple search
        const searchLower = searchText.toLowerCase().trim();
        const results = words
          .filter((word) => word.text.toLowerCase().trim() === searchLower)
          .map((word) => ({
            key, // Add the key from invoiceDetails to identify the field
            text: word.text,
            bbox: word.bbox,
          }));
        searchResults.push(...results);
      } else {
        // If it's a phrase, use the findPhrase function
        const phraseResult = findPhrase(searchWords, words);
        if (phraseResult) {
          searchResults.push({
            key, // Add the key from invoiceDetails to identify the field
            text: phraseResult.text,
            bbox: phraseResult.bbox,
          });
        }
      }
    }
  }

  console.log(searchResults);
  return searchResults;
}

function areWordsAdjacent(word1, word2) {
  const horizontalGap = 50; // Maximum horizontal pixel gap between words
  const verticalGap = 10; // Maximum vertical pixel gap between words

  // Check if words are on the same line vertically
  const sameLineVertically =
    Math.abs(word1.bbox.y0 - word2.bbox.y0) < verticalGap;

  // Check if word2 is horizontally adjacent to word1
  const isNextHorizontally =
    word2.bbox.x0 > word1.bbox.x1 && // word2 is to the right of word1
    word2.bbox.x0 - word1.bbox.x1 < horizontalGap; // gap is within threshold

  // Words are adjacent if both conditions are true
  return sameLineVertically && isNextHorizontally;
}

export function findPhrase(searchWords, words) {
  // Normalize words and search terms
  const normalizedWords = words.map((w) => ({
    ...w,
    text: w.text.toLowerCase().trim(),
  }));

  const searchTerms = searchWords.map((w) => w.toLowerCase().trim());

  // Loop through normalized words to find the phrase
  for (let i = 0; i < normalizedWords.length - searchTerms.length + 1; i++) {
    let found = true;
    let currentWords = [];

    for (let j = 0; j < searchTerms.length; j++) {
      const currentWord = normalizedWords[i + j];

      // Check if the current word matches the search term
      if (currentWord.text !== searchTerms[j]) {
        found = false;
        break;
      }

      // For phrases longer than one word, check if words are adjacent
      if (j > 0 && !areWordsAdjacent(normalizedWords[i + j - 1], currentWord)) {
        found = false;
        break;
      }

      currentWords.push(currentWord);
    }

    if (found && currentWords.length > 0) {
      // Create a bounding box that encompasses all words in the phrase
      const combinedBBox = {
        x0: Math.min(...currentWords.map((w) => w.bbox.x0)),
        y0: Math.min(...currentWords.map((w) => w.bbox.y0)),
        x1: Math.max(...currentWords.map((w) => w.bbox.x1)),
        y1: Math.max(...currentWords.map((w) => w.bbox.y1)),
      };

      return {
        text: currentWords.map((w) => w.text).join(" "),
        bbox: combinedBBox,
      };
    }
  }

  return null;
}
