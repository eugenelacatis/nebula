import React, { useRef, useEffect, useState } from 'react';
import { NebulaApp } from './NebulaApp.js';
import UI from './components/UI.jsx';

export default function App() {
  const canvasRef = useRef(null);
  const appRef    = useRef(null);

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [volume,       setVolume]       = useState(80);
  const [bloom,        setBloom]        = useState(46);
  const [particleCount, setParticleCount] = useState(8000);
  const [uploadLabel,  setUploadLabel]  = useState('Upload your music');

  useEffect(() => {
    appRef.current = new NebulaApp(canvasRef.current);
    return () => appRef.current?.dispose();
  }, []);

  const handlePresetSelect = (id) => {
    appRef.current?.selectPreset(id);
    setActivePreset(id);
    setUploadLabel('Upload your music');
  };

  const handleTogglePlay = async () => {
    const playing = await appRef.current?.togglePlay();
    setIsPlaying(playing);
    // If no preset was selected, NebulaApp defaults to cosmic-pulse
    if (playing && !activePreset) setActivePreset('cosmic-pulse');
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    appRef.current?.setVolume(val / 100);
  };

  const handleBloomChange = (val) => {
    setBloom(val);
    appRef.current?.setBloom(val / 100);
  };

  const handleParticleToggle = () => {
    const counts = [8000, 18000, 35000];
    const next = counts[(counts.indexOf(particleCount) + 1) % counts.length];
    setParticleCount(next);
    appRef.current?.rebuildParticles(next);
  };

  const handleFileUpload = async (file) => {
    await appRef.current?.loadUploadedFile(file);
    setUploadLabel(`🎵 ${file.name}`);
    setActivePreset(null);
    setIsPlaying(true);
  };

  return (
    <>
      <canvas ref={canvasRef} id="canvas" />
      <UI
        isPlaying={isPlaying}
        activePreset={activePreset}
        volume={volume}
        bloom={bloom}
        particleCount={particleCount}
        uploadLabel={uploadLabel}
        onPresetSelect={handlePresetSelect}
        onTogglePlay={handleTogglePlay}
        onVolumeChange={handleVolumeChange}
        onBloomChange={handleBloomChange}
        onParticleToggle={handleParticleToggle}
        onFileUpload={handleFileUpload}
      />
    </>
  );
}
