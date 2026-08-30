import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';

export default function PhotoCapture({ onCapture }) {
  const { t } = useTranslation('common');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (!photo) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // back camera, soil photo ke liye
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Camera access denied or unavailable:', err);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function capture() {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    stopCamera();
    onCapture(dataUrl);
  }

  function retake() {
    setPhoto(null);
    onCapture(null);
  }

  return (
    <div>
      <div className="camera-box">
        {photo ? <img src={photo} alt="Captured soil" /> : <video ref={videoRef} autoPlay playsInline muted />}
      </div>
      {photo ? (
        <button className="btn btn-secondary" onClick={retake}>📷 {t('retake')}</button>
      ) : (
        <button className="btn btn-primary" onClick={capture}>📷 {t('capturePhoto')}</button>
      )}
    </div>
  );
}
