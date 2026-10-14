import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';

export default function PhotoCapture({ onCapture }) {
  const { t } = useTranslation('common');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (!photo) startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  async function startCamera() {
    setCameraError(false);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // back camera, soil photo ke liye
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(true);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    stopCamera();
    onCapture(dataUrl);
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setPhoto(dataUrl);
      stopCamera();
      onCapture(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function retake() {
    setPhoto(null);
    onCapture(null);
  }

  return (
    <div>
      <div className="camera-box" aria-label="Soil photo capture box">
        {photo ? (
          <img src={photo} alt="Captured soil" />
        ) : cameraError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', padding: '16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Camera unavailable or permission denied.</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Choose Photo from Gallery
            </button>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted />
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {photo ? (
        <button className="btn btn-secondary" onClick={retake}>📷 {t('retake')}</button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn btn-primary" onClick={capture} disabled={cameraError}>
            📷 {t('capturePhoto')}
          </button>
          {!cameraError && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload Photo from Gallery
            </button>
          )}
        </div>
      )}
    </div>
  );
}
