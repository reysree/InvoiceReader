import { db } from "@/app/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const saveInvoiceDetails = async (invoiceDetails) => {
  try {
    const companyName = invoiceDetails.companyName;
    console.log("Company Name is : ", companyName);
    console.log("All the Details are : ", invoiceDetails);

    if (!companyName) {
      console.error("Company name is required to save the document.");
      return;
    }

    // Reference the document using `companyName` as the document ID
    const docRef = doc(db, "users", companyName);

    // Save the details into the document
    const keys = Object.keys(invoiceDetails);
    await setDoc(docRef, { keys });

    console.log("Invoice details saved successfully!");
  } catch (error) {
    console.error("Error saving invoice details: ", error);
  }
};

export const getInvoiceDetails = async (companyName) => {
  try {
    const docRef = doc(db, "users", companyName); // Reference the document
    //console.log("The company name in firebase.js is : ", companyName);
    //console.log("Firestore Path:", docRef.path);
    const docSnap = await getDoc(docRef); // Fetch the document

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
      return docSnap.data(); // Return the document data
    } else {
      console.log("No such document!");
      return null; // Document does not exist
    }
  } catch (error) {
    console.error("Error retrieving invoice details:", error);
    throw error;
  }
};
