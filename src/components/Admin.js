import { useState } from "react";
import { storage } from "./firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

function Admin() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState("");

  const handleUpload = () => {
    if (!file) return;
    
    const storageRef = ref(storage, `uploads/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadUrl) => {
          setUrl(downloadUrl);
          console.log("File available at", downloadUrl);
        });
      }
    );
  };

  return (
    <div>
      <h2>Admin - Încărcare fișiere</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Încarcă</button>
      <p>Progres: {progress}%</p>
      {url && (
        <div>
          <p>Fișier încărcat:</p>
          {file.type.startsWith("image") ? (
            <img src={url} alt="Încărcat" width="200" />
          ) : (
            <video src={url} controls width="200" />
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;
