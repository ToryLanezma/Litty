import {Composition} from 'remotion';
import {LisbonClip, totalDuration} from './LisbonClip';
import photos from './photos.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LisbonClip"
    component={LisbonClip}
    durationInFrames={totalDuration(photos.length)}
    fps={30}
    width={1920}
    height={1080}
  />
);
