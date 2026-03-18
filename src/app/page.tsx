import DynamicCanvas from '@/components/DynamicCanvas';
import AudioPlayer from '@/components/AudioPlayer';
import ControlPanel from '@/components/ControlPanel';

export default function Home() {
  return (
    <main>
      <DynamicCanvas />
      <AudioPlayer />
      <ControlPanel />
    </main>
  );
}
