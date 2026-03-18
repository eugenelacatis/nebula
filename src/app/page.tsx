import Canvas from '@/components/Canvas';
import DebugPanel from '@/components/DebugPanel';
import Upload from '@/components/Upload';
import HUD from '@/components/HUD';

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a0a1a]">
      <Canvas />
      <Upload />
      <HUD />
      <DebugPanel />
    </main>
  );
}
