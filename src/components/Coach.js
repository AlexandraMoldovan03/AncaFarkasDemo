import { useEffect, useState } from "react";
import { storage } from "./firebaseConfig";
import { ref, listAll, getDownloadURL } from "firebase/storage";

function Coach() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const fetchFiles = async () => {
      const storageRef = ref(storage, "uploads");
      const result = await listAll(storageRef);
      const urls = await Promise.all(
        result.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { name: item.name, url };
        })
      );
      setFiles(urls);
    };

    fetchFiles();
  }, []);

  return (
    <div>
      <h2>Coach - Galerie</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {files.map((file, index) => (
          <div key={index}>
            {file.url.includes(".mp4") || file.url.includes(".webm") ? (
              <video src={file.url} controls width="200" />
            ) : (
              <img src={file.url} alt="Încărcat" width="200" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Coach;


import { db } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export async function getVideos() {
  const querySnapshot = await getDocs(collection(db, "videos"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

import { useEffect, useState } from "react";
import { getVideos } from "./getVideos";

export default function VideoList() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    async function fetchVideos() {
      const data = await getVideos();
      setVideos(data);
    }
    fetchVideos();
  }, []);

  return (
    <div>
      <h2>Videoclipuri</h2>
      {videos.map((video) => (
        <div key={video.id}>
          <h3>{video.title}</h3>
          <video width="400" controls>
            <source src={video.url} type="video/mp4" />
            Browserul tău nu suportă video HTML5.
          </video>
        </div>
      ))}
    </div>
  );
}
